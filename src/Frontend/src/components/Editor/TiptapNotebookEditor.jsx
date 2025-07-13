import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { CodeBlockExtension } from './extensions/CodeBlockExtension'
import useStore from '../../store/notebookStore'
import { 
  Bold, 
  Italic, 
  Code, 
  Heading1, 
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Terminal
} from 'lucide-react'

/**
 * 全局的Tiptap Notebook编辑器
 * 提供所见即所得的编辑体验，自动将代码块转换为CodeCell组件
 */
const TiptapNotebookEditor = forwardRef(({ 
  className = "",
  placeholder = "Start writing your notebook... Type ```python to create a code block",
  readOnly = false
}, ref) => {
  
  const { 
    cells, 
    updateCell, 
    deleteCell, 
    addCell,
    setCells,
    updateCellOutputs
  } = useStore()

  // 防止循环更新的标志
  const isInternalUpdate = useRef(false)
  
  // 缓存上次的cells状态，用于增量更新
  const lastCellsRef = useRef(cells)
  
  // 缓存转换结果
  const initialContent = useMemo(() => convertCellsToHtml(cells), [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用默认的代码块，使用我们的可执行代码块
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      
      // 可执行代码块扩展
      CodeBlockExtension,
      
      // 占位符
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    
    content: initialContent,
    
    editable: !readOnly,
    
    onUpdate: ({ editor }) => {
      // 防止循环更新
      if (isInternalUpdate.current) return
      
      // 使用防抖延迟同步
      clearTimeout(window.tiptapSyncTimeout)
      window.tiptapSyncTimeout = setTimeout(() => {
        const html = editor.getHTML()
        const newCells = convertHtmlToCells(html)
        
        // 更精确的变化检测
        const cellsChanged = newCells.length !== cells.length || 
          newCells.some((cell, index) => {
            const existingCell = cells[index]
            return !existingCell || 
                   cell.content !== existingCell.content || 
                   cell.type !== existingCell.type
          })
        
        if (cellsChanged) {
          isInternalUpdate.current = true
          setCells(newCells)
          setTimeout(() => {
            isInternalUpdate.current = false
          }, 50)
        }
      }, 500) // 增加防抖时间到500ms
    },
    
    editorProps: {
      attributes: {
        class: `tiptap-notebook-editor markdown-cell prose max-w-none focus:outline-none ${className}`,
        style: 'min-height: 200px; padding: 24px;',
        spellcheck: 'false',
      },
    },
    
    immediatelyRender: false,
  })

  // 暴露编辑器API
  useImperativeHandle(ref, () => ({
    editor,
    focus: () => editor?.commands.focus(),
    getHTML: () => editor?.getHTML(),
    setContent: (content) => editor?.commands.setContent(content, false),
    clearContent: () => editor?.commands.clearContent(),
    isEmpty: () => editor?.isEmpty,
  }), [editor])

  // 插入代码块的功能
  const insertCodeBlock = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertExecutableCodeBlock({
        language: 'python',
        code: '',
        cellId: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        outputs: [],
        enableEdit: true,
      }).run()
    }
  }, [editor])

  // 同步外部cells变化到编辑器（智能增量更新）
  useEffect(() => {
    if (editor && cells && !isInternalUpdate.current) {
      const lastCells = lastCellsRef.current
      
      // 检查是否有实质性变化
      const hasSignificantChange = cells.length !== lastCells.length ||
        cells.some((cell, index) => {
          const lastCell = lastCells[index]
          return !lastCell || 
                 cell.content !== lastCell.content || 
                 cell.type !== lastCell.type
        })
      
      if (hasSignificantChange) {
        // 如果变化很小（比如只是一个cell的小修改），尝试局部更新
        if (Math.abs(cells.length - lastCells.length) <= 1) {
          // 小幅变化，保持光标位置
          const { from, to } = editor.state.selection
          isInternalUpdate.current = true
          
          const expectedHtml = convertCellsToHtml(cells)
          editor.commands.setContent(expectedHtml, false)
          
          // 恢复光标位置
          setTimeout(() => {
            try {
              const docSize = editor.state.doc.content.size
              const safeFrom = Math.min(from, docSize)
              const safeTo = Math.min(to, docSize)
              editor.commands.setTextSelection({ from: safeFrom, to: safeTo })
            } catch (e) {
              // 静默处理错误
            }
            isInternalUpdate.current = false
          }, 5)
        } else {
          // 大幅变化，简单替换内容
          isInternalUpdate.current = true
          const expectedHtml = convertCellsToHtml(cells)
          editor.commands.setContent(expectedHtml, false)
          setTimeout(() => {
            isInternalUpdate.current = false
          }, 10)
        }
        
        // 更新缓存
        lastCellsRef.current = cells
      }
    }
  }, [cells, editor])

  /**
   * 将cells数组转换为HTML内容
   */
  function convertCellsToHtml(cells) {
    if (!cells || cells.length === 0) {
      return '<p></p>' // 空内容
    }

    return cells.map(cell => {
      if (cell.type === 'code') {
        // 代码cell转换为可执行代码块
        return `<div data-type="executable-code-block" data-language="${cell.language || 'python'}" data-code="${encodeURIComponent(cell.content || '')}" data-cell-id="${cell.id}" data-outputs="${encodeURIComponent(JSON.stringify(cell.outputs || []))}" data-enable-edit="${cell.enableEdit !== false}"></div>`
      } else if (cell.type === 'markdown') {
        // markdown cell转换为HTML
        return convertMarkdownToHtml(cell.content || '')
      }
      return ''
    }).join('\n')
  }

  /**
   * 将HTML内容转换为cells数组
   */
  function convertHtmlToCells(html) {
    if (!html || html === '<p></p>') {
      return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const cells = []
    let currentMarkdownContent = []

    // 遍历所有节点
    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.getAttribute('data-type') === 'executable-code-block') {
          // 如果有累积的markdown内容，先创建markdown cell
          if (currentMarkdownContent.length > 0) {
            const markdownText = currentMarkdownContent.join('\n').trim()
            if (markdownText) {
              cells.push({
                id: generateCellId(),
                type: 'markdown',
                content: convertHtmlToMarkdown(markdownText),
                outputs: [],
                enableEdit: true,
              })
            }
            currentMarkdownContent = []
          }

          // 创建代码cell
          const cellId = node.getAttribute('data-cell-id') || generateCellId()
          const code = decodeURIComponent(node.getAttribute('data-code') || '')
          const language = node.getAttribute('data-language') || 'python'
          const outputs = JSON.parse(decodeURIComponent(node.getAttribute('data-outputs') || '[]'))
          const enableEdit = node.getAttribute('data-enable-edit') !== 'false'

          cells.push({
            id: cellId,
            type: 'code',
            content: code,
            outputs: outputs,
            enableEdit: enableEdit,
            language: language,
          })
        } else {
          // 普通HTML内容，累积到markdown内容中
          currentMarkdownContent.push(node.outerHTML)
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        // 文本节点
        currentMarkdownContent.push(node.textContent)
      }
    })

    // 处理剩余的markdown内容
    if (currentMarkdownContent.length > 0) {
      const markdownText = currentMarkdownContent.join('\n').trim()
      if (markdownText) {
        cells.push({
          id: generateCellId(),
          type: 'markdown',
          content: convertHtmlToMarkdown(markdownText),
          outputs: [],
          enableEdit: true,
        })
      }
    }

    return cells
  }

  /**
   * Markdown到HTML转换 - 超简化版本
   */
  function convertMarkdownToHtml(markdown) {
    if (!markdown) return '<p></p>'
    
    // 简单的段落处理，避免复杂的正则表达式
    const lines = markdown.split('\n')
    const htmlLines = lines.map(line => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
      if (line.trim() === '') return '<br>'
      return `<p>${line}</p>`
    })
    
    return htmlLines.join('')
  }

  /**
   * HTML到Markdown转换 - 超简化版本
   */
  function convertHtmlToMarkdown(html) {
    if (!html) return ''
    
    // 使用DOM解析，避免复杂的正则表达式
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    const result = []
    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        switch (node.tagName.toLowerCase()) {
          case 'h1':
            result.push(`# ${node.textContent}`)
            break
          case 'h2':
            result.push(`## ${node.textContent}`)
            break
          case 'h3':
            result.push(`### ${node.textContent}`)
            break
          case 'p':
            result.push(node.textContent)
            break
          case 'br':
            result.push('')
            break
          default:
            result.push(node.textContent)
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim()
        if (text) result.push(text)
      }
    })
    
    return result.join('\n')
  }

  /**
   * 生成唯一的cell ID
   */
  function generateCellId() {
    return `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }


  if (!editor) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg flex items-center justify-center" style={{ minHeight: '200px' }}>
        <div className="text-gray-400 text-lg">Loading notebook editor...</div>
      </div>
    )
  }

  return (
    <div className="tiptap-notebook-editor-container w-full h-full bg-white">
      {/* 浮动工具栏 - 选中文本时显示 */}
      <BubbleMenu 
        editor={editor}
        tippyOptions={{ 
          duration: 100,
          placement: 'top',
        }}
        className="bg-gray-900 text-white rounded-lg shadow-lg p-1 flex items-center gap-1 z-50"
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-gray-600' : ''}`}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-gray-600' : ''}`}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('code') ? 'bg-gray-600' : ''}`}
          title="Inline Code"
        >
          <Code size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-600' : ''}`}
          title="Heading 1"
        >
          <Heading1 size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-600' : ''}`}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('bulletList') ? 'bg-gray-600' : ''}`}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('orderedList') ? 'bg-gray-600' : ''}`}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('blockquote') ? 'bg-gray-600' : ''}`}
          title="Quote"
        >
          <Quote size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={insertCodeBlock}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert Code Block"
        >
          <Terminal size={14} />
        </button>
      </BubbleMenu>

      {/* 主编辑器内容 */}
      <EditorContent 
        editor={editor} 
        className="w-full h-full focus-within:outline-none"
      />

      {/* 简单的占位符样式 */}
      <style jsx>{`
        .tiptap-notebook-editor .is-editor-empty:first-child::before {
          color: #9CA3AF;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        /* 可执行代码块样式 */
        .executable-code-block-wrapper {
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  )
})

TiptapNotebookEditor.displayName = 'TiptapNotebookEditor'

export default TiptapNotebookEditor