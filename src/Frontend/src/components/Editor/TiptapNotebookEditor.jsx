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
  List,
  ListOrdered,
  Quote,
  Terminal
} from 'lucide-react'

const TiptapNotebookEditor = forwardRef(({ 
  className = "",
  placeholder = "Start writing your notebook... Type ```python to create a code block",
  readOnly = false
}, ref) => {
  
  const { 
    cells, 
    setCells,
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
    
    onUpdate: ({ editor, transaction }) => {
      // 防止循环更新
      if (isInternalUpdate.current) return
      
      // 检查变化是否发生在代码块内
      const isCodeBlockChange = transaction.steps.some(step => {
        if (step.from !== undefined && step.to !== undefined) {
          const $from = editor.state.doc.resolve(step.from)
          const $to = editor.state.doc.resolve(step.to)
          
          // 检查变化位置是否在可执行代码块内
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'executable-code-block') {
              return true
            }
          }
          for (let depth = $to.depth; depth >= 0; depth--) {
            const node = $to.node(depth)
            if (node.type.name === 'executable-code-block') {
              return true
            }
          }
        }
        return false
      })
      
      // 如果变化发生在代码块内，不进行同步
      if (isCodeBlockChange) {
        return
      }
      
      // 检查是否是格式化操作（如粗体、斜体等）
      const isFormattingOperation = transaction.steps.some(step => 
        step.jsonID === 'addMark' || 
        step.jsonID === 'removeMark' ||
        step.jsonID === 'setNodeMarkup'
      )
      
      // 格式化操作使用较短的防抖时间，文本输入使用较长的防抖时间
      const debounceTime = isFormattingOperation ? 100 : 300
      
      // 使用防抖延迟同步
      clearTimeout(window.tiptapSyncTimeout)
      window.tiptapSyncTimeout = setTimeout(() => {
        const html = editor.getHTML()
        const newCells = convertHtmlToCells(html)
        
        // 简化比较：只关心结构和markdown内容变化
        const hasStructuralChange = newCells.length !== cells.length ||
          newCells.some((newCell, index) => {
            const existingCell = cells[index]
            if (!existingCell) return true
            
            // 类型变化
            if (newCell.type !== existingCell.type) return true
            
            // Markdown内容变化
            if (newCell.type === 'markdown' && newCell.content !== existingCell.content) return true
            
            // 代码块只检查ID是否匹配（占位符模式）
            if (newCell.type === 'code' && newCell.isPlaceholder && newCell.id !== existingCell.id) return true
            
            return false
          })
        
        if (hasStructuralChange) {
          isInternalUpdate.current = true
          
          console.log('=== TiptapNotebookEditor 结构变化 Debug Info ===');
          console.log('原有cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          console.log('新解析cells:', newCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          
          // 智能合并：用占位符替换为现有代码块，只更新markdown
          const mergedCells = newCells.map((newCell, index) => {
            if (newCell.type === 'code' && newCell.isPlaceholder) {
              // 查找现有的代码块
              const existingCodeCell = cells.find(cell => 
                cell.type === 'code' && cell.id === newCell.id
              )
              if (existingCodeCell) {
                console.log(`代码块位置 ${index}: 保持现有代码块 ${existingCodeCell.id}`);
                return existingCodeCell // 完全保持现有代码块
              } else {
                console.log(`代码块位置 ${index}: 警告 - 找不到ID为 ${newCell.id} 的代码块`);
                // 如果找不到对应的代码块，创建一个空的
                return {
                  id: newCell.id,
                  type: 'code',
                  content: '',
                  outputs: [],
                  enableEdit: true,
                  language: 'python',
                }
              }
            } else if (newCell.type === 'markdown') {
              // Markdown cell 使用新解析的内容
              return newCell
            } else {
              // 其他情况保持原样
              return newCell
            }
          })
          
          console.log('合并后cells:', mergedCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          console.log('===============================================');
          
          setCells(mergedCells)
          setTimeout(() => {
            isInternalUpdate.current = false
          }, 50)
        }
      }, debounceTime)
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

  // 同步外部cells变化到编辑器 - 只处理需要同步到tiptap的变化
  useEffect(() => {
    if (editor && cells && !isInternalUpdate.current) {
      const lastCells = lastCellsRef.current
      
      // 只检查影响tiptap显示的变化：
      // 1. markdown cell的内容变化
      // 2. 新增/删除 cell（结构变化）
      // 3. cell类型变化
      const needsTiptapUpdate = cells.length !== lastCells.length ||
        cells.some((cell, index) => {
          const lastCell = lastCells[index]
          if (!lastCell) return true // 新增cell
          
          // 类型变化
          if (cell.type !== lastCell.type) return true
          
          // 只有markdown cell的内容变化才需要更新tiptap
          if (cell.type === 'markdown' && cell.content !== lastCell.content) return true
          
          // code cell的内容变化不需要更新tiptap
          return false
        })
      
      if (needsTiptapUpdate) {
        console.log('=== 外部cells变化，需要更新tiptap ===');
        console.log('原有cells:', lastCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
        console.log('新的cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
        
        isInternalUpdate.current = true
        const expectedHtml = convertCellsToHtml(cells)
        editor.commands.setContent(expectedHtml, false)
        
        setTimeout(() => {
          isInternalUpdate.current = false
        }, 10)
        
        // 更新缓存
        lastCellsRef.current = cells
        
        console.log('=== tiptap内容已更新 ===');
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

    console.log('=== convertCellsToHtml 转换 ===');
    console.log('输入cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));

    const htmlParts = cells.map((cell, index) => {
      if (cell.type === 'code') {
        // 代码cell转换为可执行代码块，确保包含正确的ID和位置信息
        console.log(`转换代码块 ${index}: ID=${cell.id}`);
        return `<div data-type="executable-code-block" data-language="${cell.language || 'python'}" data-code="${encodeURIComponent(cell.content || '')}" data-cell-id="${cell.id}" data-outputs="${encodeURIComponent(JSON.stringify(cell.outputs || []))}" data-enable-edit="${cell.enableEdit !== false}"></div>`
      } else if (cell.type === 'markdown') {
        // markdown cell转换为HTML
        console.log(`转换markdown ${index}: 内容长度=${(cell.content || '').length}`);
        return convertMarkdownToHtml(cell.content || '')
      }
      return ''
    })

    const result = htmlParts.join('\n')
    console.log('=== convertCellsToHtml 完成 ===');
    return result
  }

  /**
   * 将HTML内容转换为cells数组 - 只处理markdown内容，保持现有code cell
   */
  function convertHtmlToCells(html) {
    if (!html || html === '<p></p>') {
      return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const newCells = []
    let currentMarkdownContent = []

    // 遍历所有节点
    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.getAttribute('data-type') === 'executable-code-block') {
          // 如果有累积的markdown内容，先创建markdown cell
          if (currentMarkdownContent.length > 0) {
            const markdownText = currentMarkdownContent.join('\n').trim()
            if (markdownText) {
              newCells.push({
                id: generateCellId(),
                type: 'markdown',
                content: convertHtmlToMarkdown(markdownText),
                outputs: [],
                enableEdit: true,
              })
            }
            currentMarkdownContent = []
          }

          // 对于代码块，只记录位置占位符，不创建新的cell
          const cellId = node.getAttribute('data-cell-id')
          newCells.push({
            id: cellId,
            type: 'code',
            isPlaceholder: true, // 标记为占位符
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
        newCells.push({
          id: generateCellId(),
          type: 'markdown',
          content: convertHtmlToMarkdown(markdownText),
          outputs: [],
          enableEdit: true,
        })
      }
    }

    return newCells
  }

  /**
   * Markdown到HTML转换 - 支持格式化标记
   */
  function convertMarkdownToHtml(markdown) {
    if (!markdown) return '<p></p>'
    
    // 处理行内格式化
    function processInlineFormatting(text) {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 粗体
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // 斜体
        .replace(/`(.*?)`/g, '<code>$1</code>')            // 行内代码
    }
    
    // 按段落分割
    const paragraphs = markdown.split('\n\n')
    
    const htmlParagraphs = paragraphs.map(paragraph => {
      const lines = paragraph.split('\n')
      
      // 处理列表
      if (lines.some(line => line.trim().startsWith('- '))) {
        const listItems = lines
          .filter(line => line.trim().startsWith('- '))
          .map(line => `<li>${processInlineFormatting(line.trim().slice(2))}</li>`)
          .join('')
        return `<ul>${listItems}</ul>`
      }
      
      // 处理单行内容
      if (lines.length === 1) {
        const line = lines[0].trim()
        if (line.startsWith('# ')) {
          return `<h1>${processInlineFormatting(line.slice(2))}</h1>`
        }
        if (line.startsWith('## ')) {
          return `<h2>${processInlineFormatting(line.slice(3))}</h2>`
        }
        if (line.startsWith('### ')) {
          return `<h3>${processInlineFormatting(line.slice(4))}</h3>`
        }
        if (line.startsWith('#### ')) {
          return `<h4>${processInlineFormatting(line.slice(5))}</h4>`
        }
        if (line.startsWith('##### ')) {
          return `<h5>${processInlineFormatting(line.slice(6))}</h5>`
        }
        if (line.startsWith('###### ')) {
          return `<h6>${processInlineFormatting(line.slice(7))}</h6>`
        }
        if (line.startsWith('> ')) {
          return `<blockquote>${processInlineFormatting(line.slice(2))}</blockquote>`
        }
        if (line === '') {
          return '<br>'
        }
        return `<p>${processInlineFormatting(line)}</p>`
      }
      
      // 多行段落
      const processedLines = lines.map(line => processInlineFormatting(line)).join('<br>')
      return `<p>${processedLines}</p>`
    })
    
    return htmlParagraphs.join('')
  }

  /**
   * HTML到Markdown转换 - 支持格式化标记
   */
  function convertHtmlToMarkdown(html) {
    if (!html) return ''
    
    // 使用DOM解析，递归处理所有格式化
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const children = Array.from(node.childNodes).map(processNode).join('')
        
        switch (node.tagName.toLowerCase()) {
          case 'h1':
            return `# ${children}`
          case 'h2':
            return `## ${children}`
          case 'h3':
            return `### ${children}`
          case 'h4':
            return `#### ${children}`
          case 'h5':
            return `##### ${children}`
          case 'h6':
            return `###### ${children}`
          case 'strong':
          case 'b':
            return `**${children}**`
          case 'em':
          case 'i':
            return `*${children}*`
          case 'code':
            return `\`${children}\``
          case 'blockquote':
            return `> ${children}`
          case 'li':
            return `- ${children}`
          case 'ul':
            return children
          case 'ol':
            return children
          case 'p':
            return children
          case 'br':
            return '\n'
          default:
            return children
        }
      }
      
      return ''
    }
    
    const result = []
    Array.from(doc.body.childNodes).forEach(node => {
      const processed = processNode(node)
      if (processed.trim()) {
        result.push(processed)
      }
    })
    
    return result.join('\n\n')
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
    <div className="tiptap-notebook-editor-container w-full h-full bg-transparent">
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