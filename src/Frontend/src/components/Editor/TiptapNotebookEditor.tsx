import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { CodeBlockExtension } from './extensions/CodeBlockExtension'
import SimpleTableExtension from './extensions/TableExtension'
import ImageExtension from './extensions/ImageExtension'
import LaTeXExtension from './extensions/LaTeXExtension'
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
  Terminal,
  Table as TableIcon,
  Image as ImageIcon,
  Sigma as FunctionIcon
} from 'lucide-react'

import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from 'prosemirror-state'

interface TiptapNotebookEditorProps {
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

interface TiptapNotebookEditorRef {
  getContent: () => any;
  setContent: (content: any) => void;
  focus: () => void;
}

const TiptapNotebookEditor = forwardRef<TiptapNotebookEditorRef, TiptapNotebookEditorProps>(({ 
  className = "",
  placeholder = "Start writing your notebook... Type ```python to create a code block",
  readOnly = false
}, ref) => {
  
  const { 
    cells, 
    setCells,
  } = useStore()

  // 动态游标样式扩展
  const CursorStyleExtension = Extension.create({
    name: 'cursorStyle',
    
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('cursorStyle'),
          view(editorView) {
            const updateCursorStyle = () => {
              const { state } = editorView
              const { selection } = state
              const { from } = selection
              
              // 获取当前位置的节点
              const $pos = state.doc.resolve(from)
              const node = $pos.parent
              
              // 根据节点类型设置游标颜色
              let caretColor = '#1f2937' // 默认颜色
              
              if (node.type.name === 'heading') {
                const level = node.attrs.level
                switch (level) {
                  case 1:
                    caretColor = '#3b82f6' // 蓝色 - H1/默认标题
                    break
                  case 2:
                    caretColor = '#059669' // 绿色 - H2
                    break
                  case 3:
                    caretColor = '#dc2626' // 红色 - H3
                    break
                  default:
                    caretColor = '#7c3aed' // 紫色 - H4-H6
                }
              } else if (node.type.name === 'listItem') {
                caretColor = '#f59e0b' // 橙色 - 列表项
              } else if (node.type.name === 'blockquote') {
                caretColor = '#6b7280' // 灰色 - 引用
              } else if (node.type.name === 'codeBlock') {
                caretColor = '#ef4444' // 红色 - 代码块
              } else if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                caretColor = '#8b5cf6' // 紫色 - 表格
              }
              
              // 应用样式到编辑器
              const editorElement = editorView.dom
              if (editorElement) {
                editorElement.style.caretColor = caretColor
              }
            }
            
            // 初始设置
            updateCursorStyle()
            
            return {
              update: updateCursorStyle
            }
          }
        })
      ]
    }
  })

  // 防止循环更新的标志
  const isInternalUpdate = useRef(false)
  
  // 缓存上次的cells状态，用于增量更新
  const lastCellsRef = useRef([])
  
  // 初始化lastCellsRef
  useEffect(() => {
    lastCellsRef.current = cells
  }, [])
  
  // 初始内容 - 只在首次渲染时计算，后续更新通过useEffect处理
  const initialContent = useMemo(() => {
    console.log('=== 计算initialContent ===');
    console.log('初始cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
    
    const content = convertCellsToHtml(cells)
    
    console.log('初始HTML长度:', content.length);
    return content
  }, [cells.length]) // 只在cells数量变化时重新计算，避免内容变化导致重新初始化

  // 简化表格检测
  function isMarkdownTable(text) {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.length >= 2 && 
           lines[0].includes('|') && 
           /^\s*\|?[\s\-:|]+\|?\s*$/.test(lines[1]);
  }

  function parseMarkdownTable(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    
    // 解析表头
    const headers = lines[0].split('|')
      .map(h => h.trim())
      .filter(h => h);
    
    // 解析数据行
    const rows = lines.slice(2).map(line => {
      const cells = line.split('|')
        .map(c => c.trim())
        .filter(c => c);
      // 确保列数一致
      while (cells.length < headers.length) cells.push('');
      return cells.slice(0, headers.length);
    }).filter(row => row.length > 0);
    
    return { headers, rows };
  }

  function createTiptapTable(schema, { headers, rows }) {
    if (!headers.length) return null;
    
    const makeParagraph = (text) => {
      return text ? 
        schema.nodes.paragraph.create(null, schema.text(String(text))) :
        schema.nodes.paragraph.create();
    };

    // 创建表头
    const headerCells = headers.map(h =>
      schema.nodes.tableHeader.create(null, makeParagraph(h))
    );
    const headerRow = schema.nodes.tableRow.create(null, headerCells);

    // 创建数据行
    const bodyRows = (rows.length ? rows : [Array(headers.length).fill('')])
      .map(row => {
        const cells = headers.map((_, i) =>
          schema.nodes.tableCell.create(null, makeParagraph(row[i] || ''))
        );
        return schema.nodes.tableRow.create(null, cells);
      });

    return schema.nodes.table.create(null, [headerRow, ...bodyRows]);
  }

  // 移除复杂的表格扩展，使用简化版本

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
      
      // 动态游标样式扩展
      CursorStyleExtension,
      
      // 图片支持
      ImageExtension,
      
      // LaTeX支持
      LaTeXExtension,
      
      // 占位符
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      SimpleTableExtension,
    ],
    
    content: initialContent,
    
    editable: !readOnly,
    
    onUpdate: ({ editor, transaction }) => {
      // 防止循环更新
      if (isInternalUpdate.current) return
      
      // 如果是InputRule创建的代码块，跳过处理避免冲突，但处理聚焦
      if (transaction.getMeta('codeBlockInputRule')) {
        console.log('跳过InputRule创建的代码块变化');
        
        // 获取新创建的代码块ID并聚焦
        const newCodeCellId = transaction.getMeta('newCodeCellId');
        if (newCodeCellId) {
          console.log('准备聚焦到新代码块:', newCodeCellId);
          
          // 立即将新代码块设置为当前活跃cell（如果store可用）
          const { setCurrentCell } = useStore.getState();
          if (setCurrentCell) {
            setCurrentCell(newCodeCellId);
            console.log('已设置新代码块为当前活跃cell');
          }
          
          // 延迟聚焦，等待组件渲染完成
          setTimeout(() => {
            const codeElement = document.querySelector(`[data-cell-id="${newCodeCellId}"] .cm-editor .cm-content`);
            if (codeElement) {
              codeElement.focus();
              console.log('已聚焦到新代码块编辑器');
            } else {
              console.warn('未找到代码块编辑器元素');
              // 如果找不到编辑器，尝试找到容器并触发焦点
              const containerElement = document.querySelector(`[data-cell-id="${newCodeCellId}"]`);
              if (containerElement) {
                containerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('滚动到新代码块位置');
              }
            }
          }, 200); // 增加延迟时间，确保组件完全渲染
        }
        return
      }
      
      // 检查变化是否发生在特殊块内（代码块或表格）
      const isSpecialBlockChange = transaction.steps.some(step => {
        try {
          if (step.from !== undefined && step.to !== undefined) {
            // Ensure positions are within document bounds
            const docSize = editor.state.doc.content.size
            if (step.from > docSize || step.to > docSize) {
              return false
            }
            
            const $from = editor.state.doc.resolve(Math.min(step.from, docSize))
            const $to = editor.state.doc.resolve(Math.min(step.to, docSize))
            
            // 检查变化位置是否在特殊块内（代码块或表格）
            for (let depth = $from.depth; depth >= 0; depth--) {
              const node = $from.node(depth)
              if (node.type.name === 'executable-code-block' || node.type.name === 'table') {
                return true
              }
            }
            for (let depth = $to.depth; depth >= 0; depth--) {
              const node = $to.node(depth)
              if (node.type.name === 'executable-code-block' || node.type.name === 'table') {
                return true
              }
            }
          }
          return false
        } catch (e) {
          console.warn('Error checking special block change:', e)
          return false
        }
      })
      
      // 如果变化发生在特殊块内，不进行同步
      if (isSpecialBlockChange) {
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
                console.log(`代码块位置 ${index}: 创建新的代码块 ${newCell.id}`);
                // 这是一个新创建的代码块，使用解析出的数据
                let language = newCell.language || 'python'
                let initialCode = newCell.code || ''
                
                // 尝试解码code内容
                try {
                  if (initialCode) {
                    initialCode = decodeURIComponent(initialCode)
                  }
                } catch (e) {
                  console.warn('Failed to decode initial code:', e)
                }
                
                console.log(`新代码块语言: ${language}, 初始代码: "${initialCode}"`);
                
                return {
                  id: newCell.id,
                  type: 'code',
                  content: initialCode,
                  outputs: [],
                  enableEdit: true,
                  language: language,
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

  // 插入图片的功能
  const insertImage = useCallback(() => {
    if (editor) {
      editor.chain().focus().setImage({}).run()
    }
  }, [editor])

  // 插入LaTeX的功能
  const insertLaTeX = useCallback(() => {
    if (editor) {
      editor.chain().focus().setLaTeX({
        code: '',
        displayMode: true
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

    // Helper function to flush accumulated content
    const flushMarkdownContent = () => {
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
    }

    // Check if an element is a heading
    const isHeading = (element) => {
      return element.tagName && /^H[1-6]$/.test(element.tagName.toUpperCase())
    }

    // 遍历所有节点
    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.getAttribute('data-type') === 'executable-code-block') {
          // 如果有累积的markdown内容，先创建markdown cell
          flushMarkdownContent()

          // 对于代码块，记录位置占位符
          const cellId = node.getAttribute('data-cell-id')
          const language = node.getAttribute('data-language') || 'python'
          const code = node.getAttribute('data-code') || ''
          
          console.log(`发现代码块: ${cellId}, 语言: ${language}`);
          
          newCells.push({
            id: cellId,
            type: 'code',
            isPlaceholder: true, // 标记为占位符
            language: language,
            code: code
          })
        } else if (isHeading(node)) {
          // 如果是标题，先清空累积的内容，然后为标题创建独立的cell
          flushMarkdownContent()
          
          // 为标题创建独立的markdown cell
          const headingMarkdown = convertHtmlToMarkdown(node.outerHTML)
          if (headingMarkdown.trim()) {
            newCells.push({
              id: generateCellId(),
              type: 'markdown',
              content: headingMarkdown,
              outputs: [],
              enableEdit: true,
            })
          }
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
    flushMarkdownContent()

    return newCells
  }

  /**
   * Markdown到HTML转换 - 支持格式化标记
   */
  function convertMarkdownToHtml(markdown) {
    if (!markdown) return '<p></p>'
    
    // Check if markdown contains table syntax
    const lines = markdown.split('\n')
    const tableRegex = /^\s*\|(.+)\|\s*$/
    const separatorRegex = /^\s*\|(\s*[-:]+\s*\|)+\s*$/
    
    // Look for table patterns
    for (let i = 0; i < lines.length - 1; i++) {
      if (tableRegex.test(lines[i]) && separatorRegex.test(lines[i + 1])) {
        // Found a table, convert it to HTML
        const tableHtml = convertMarkdownTableToHtml(lines, i)
        if (tableHtml) {
          // Replace the table lines with HTML
          const beforeTable = lines.slice(0, i).join('\n')
          const afterTable = lines.slice(tableHtml.endIndex + 1).join('\n')
          
          let result = ''
          if (beforeTable) result += convertMarkdownToHtml(beforeTable)
          result += tableHtml.html
          if (afterTable) result += convertMarkdownToHtml(afterTable)
          
          return result
        }
      }
    }
    
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

  // Helper function to convert markdown table to HTML
  function convertMarkdownTableToHtml(lines, startIndex) {
    const headerLine = lines[startIndex]
    const separatorLine = lines[startIndex + 1]
    
    // Parse header
    const headers = headerLine.split('|')
      .map(h => h.trim())
      .filter(h => h !== '')
    
    // Find data rows
    const rows = []
    let endIndex = startIndex + 1
    
    for (let i = startIndex + 2; i < lines.length; i++) {
      if (/^\s*\|(.+)\|\s*$/.test(lines[i])) {
        const cells = lines[i].split('|')
          .map(c => c.trim())
          .filter(c => c !== '')
        rows.push(cells)
        endIndex = i
      } else {
        break
      }
    }
    
    // Generate HTML
    let html = '<table>'
    
    // Header row
    html += '<tr>'
    headers.forEach(h => {
      html += `<th>${h}</th>`
    })
    html += '</tr>'
    
    // Data rows
    rows.forEach(row => {
      html += '<tr>'
      row.forEach(cell => {
        html += `<td>${cell}</td>`
      })
      html += '</tr>'
    })
    
    html += '</table>'
    
    return { html, endIndex }
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
          case 'table':
            const rows = [];
            Array.from(node.querySelectorAll('tr')).forEach(tr => {
              const rowMarkdown = '| ' + Array.from(tr.querySelectorAll('td, th')).map(cell => {
                return processNode(cell).trim();
              }).join(' | ') + ' |';
              rows.push(rowMarkdown);
            });
            if (rows.length === 0) return '';
            const colCount = rows[0].split('|').length - 2;
            const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
            rows.splice(1, 0, separator);
            return rows.join('\n');
          case 'tr':
            return Array.from(node.childNodes).map(processNode).join('');
          case 'td':
          case 'th':
            return Array.from(node.childNodes).map(processNode).join('');
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

  function stripZWS(str) {
    return str.replace(/[\u200B-\u200D\uFEFF]/g, '');
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
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert Table"
        >
          <TableIcon size={14} />
        </button>
        
        <button
          onClick={insertImage}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert Image"
        >
          <ImageIcon size={14} />
        </button>
        
        <button
          onClick={insertLaTeX}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert LaTeX Formula"
        >
          <FunctionIcon size={14} />
        </button>
      </BubbleMenu>

      {/* 主编辑器内容 */}
      <EditorContent 
        editor={editor} 
        className="w-full h-full focus-within:outline-none"
      />

      {/* 简单的占位符样式 */}
      <style>{`
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
       
        /* 表格样式 */
        .tiptap-notebook-editor table {
          border-collapse: collapse;
          margin: 1em 0;
          width: 100%;
        }
        
        .tiptap-notebook-editor th,
        .tiptap-notebook-editor td {
          border: 1px solid #ddd;
          padding: 0.5em;
          text-align: left;
        }
        
        .tiptap-notebook-editor th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .tiptap-notebook-editor tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .tiptap-notebook-editor .selectedCell {
          background-color: #e6f3ff;
        }
        
        /* 基于cell类型的游标样式 */
        .tiptap-notebook-editor .ProseMirror {
          caret-color: #1f2937; /* 默认深色游标 */
        }
        
        /* H1标题（默认标题）的游标样式 */
        .tiptap-notebook-editor h1 {
          caret-color: #3b82f6; /* 蓝色游标，在浅色文本上更明显 */
          position: relative;
        }
        
        .tiptap-notebook-editor h1:focus-within {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          border-radius: 4px;
        }
        
        /* H2-H6标题的游标样式 */
        .tiptap-notebook-editor h2 {
          caret-color: #059669;
        }
        
        .tiptap-notebook-editor h3 {
          caret-color: #dc2626;
        }
        
        .tiptap-notebook-editor h4,
        .tiptap-notebook-editor h5,
        .tiptap-notebook-editor h6 {
          caret-color: #7c3aed;
        }
        
        /* 段落的游标样式 */
        .tiptap-notebook-editor p {
          caret-color: #374151;
        }
        
        /* 列表的游标样式 */
        .tiptap-notebook-editor ul li,
        .tiptap-notebook-editor ol li {
          caret-color: #f59e0b;
        }
        
        /* 引用块的游标样式 */
        .tiptap-notebook-editor blockquote {
          caret-color: #6b7280;
        }
        
        /* 代码块的游标样式 */
        .tiptap-notebook-editor code {
          caret-color: #ef4444;
        }
        
        /* 表格的游标样式 */
        .tiptap-notebook-editor table th,
        .tiptap-notebook-editor table td {
          caret-color: #8b5cf6;
        }
        
        /* 图片和LaTeX扩展样式 */
        .image-markdown-wrapper {
          margin: 1rem 0;
        }
        
        .image-editor {
          margin: 0.5rem 0;
        }
        
        .image-display {
          margin: 1rem 0;
          position: relative;
        }
        
        .image-placeholder {
          margin: 1rem 0;
        }
        
        .latex-wrapper {
          margin: 0.5rem 0;
          position: relative;
        }
        
        .latex-placeholder {
          margin: 1rem 0;
        }
        
        .latex-display.block {
          margin: 1rem 0;
          text-align: center;
        }
        
        .latex-display.inline {
          display: inline;
        }
        
        .katex-rendered {
          user-select: all;
        }
        
        .katex-display {
          text-align: center;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  )
})

TiptapNotebookEditor.displayName = 'TiptapNotebookEditor'

export default TiptapNotebookEditor