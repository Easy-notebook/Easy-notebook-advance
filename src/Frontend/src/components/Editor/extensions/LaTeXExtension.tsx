import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { Plugin, PluginKey } from 'prosemirror-state'
import React, { useState, useRef, useEffect } from 'react'
import { Edit3, X, Copy } from 'lucide-react'
import 'katex/dist/katex.min.css'

// 直接导入katex
import katex from 'katex'

// 添加LaTeX样式
const latexStyles = `
  .latex-markdown-wrapper .katex-rendered {
    color: black !important;
    width: fit-content;
  }
  
  .latex-markdown-wrapper .katex-display {
    margin: 0.5em auto;
    text-align: center;
    width: fit-content;
  }
  
  .latex-markdown-wrapper .katex {
    color: black !important;
  }
  
  .latex-markdown-wrapper .katex * {
    color: black !important;
  }
  
  .latex-editor input {
    color: black !important;
  }
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = latexStyles
  document.head.appendChild(styleSheet)
}

// LaTeX组件
const LaTeXComponent = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempLatex, setTempLatex] = useState('')
  const [renderedHtml, setRenderedHtml] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { latex, displayMode } = node.attrs

  // 初始化编辑状态
  useEffect(() => {
    console.log('LaTeX组件初始化，latex:', latex, 'displayMode:', displayMode)
    if (latex) {
      setTempLatex(latex)
      setIsEditing(false) // 有内容时默认显示模式
    } else {
      setTempLatex('')
      setIsEditing(true) // 新节点默认进入编辑模式
    }
  }, [latex])

  // 渲染LaTeX
  useEffect(() => {
    const renderLatex = (code) => {
      if (!code) {
        setRenderedHtml('')
        setError('')
        return
      }

      try {
        console.log('渲染LaTeX:', code, '显示模式:', displayMode)
        
        // 测试KaTeX是否可用
        if (typeof katex === 'undefined') {
          throw new Error('KaTeX未加载')
        }
        
        const html = katex.renderToString(code, {
          displayMode: displayMode,
          throwOnError: false,
          errorColor: '#dc2626',
          strict: 'warn',
          trust: false
        })
        
        console.log('LaTeX渲染成功:', html.length, '字符')
        console.log('HTML内容预览:', html.substring(0, 200))
        setRenderedHtml(html)
        setError('')
      } catch (err) {
        console.error('LaTeX渲染错误:', err)
        setError(err.message || 'LaTeX渲染错误')
        setRenderedHtml('')
      }
    }

    // 渲染tempLatex（编辑时）和latex（显示时）
    const codeToRender = isEditing ? tempLatex : latex
    renderLatex(codeToRender)
  }, [tempLatex, latex, displayMode, isEditing])

  // 开始编辑
  const startEditing = () => {
    setIsEditing(true)
    const currentLatex = latex || ''
    setTempLatex(currentLatex)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const length = currentLatex.length
        textareaRef.current.setSelectionRange(length, length)
      }
    }, 0)
  }

  // 保存编辑
  const saveEdit = () => {
    updateAttributes({
      latex: tempLatex,
    })
    setIsEditing(false)
  }

  // 取消编辑
  const cancelEdit = () => {
    const currentLatex = latex || ''
    setTempLatex(currentLatex)
    setIsEditing(false)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  // 复制LaTeX代码
  const copyLatex = () => {
    const latexText = displayMode ? `$$${latex}$$` : `$${latex}$`
    navigator.clipboard.writeText(latexText)
  }

  console.log('LaTeX组件渲染状态:', { isEditing, latex, tempLatex, renderedHtml: !!renderedHtml, error })

  return (
    <NodeViewWrapper className="latex-markdown-wrapper">
      {isEditing ? (
        // 编辑模式：源码编辑器 + 实时预览
        <div className="latex-editor">
          {/* LaTeX源码编辑器 */}
          <input
            ref={textareaRef}
            type="text"
            value={tempLatex}
            onChange={(e) => setTempLatex(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            placeholder="输入 LaTeX 公式，如: E = mc^2"
            className="p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-400 bg-white text-black"
            style={{ 
              width: `${Math.max(200, tempLatex.length * 8 + 40)}px`,
              minWidth: '200px',
              maxWidth: '100%'
            }}
          />
          
          {/* 实时预览LaTeX */}
          {tempLatex ? (
            <div className="mt-3">
              {error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  ⚠️ LaTeX 错误: {error}
                </div>
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  className={`katex-rendered ${displayMode ? 'katex-display text-center' : 'inline-block'}`}
                  style={{ color: 'black' }}
                />
              )}
            </div>
          ) : (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-gray-500 text-sm">
              输入 LaTeX 公式以查看预览
            </div>
          )}
          
          {/* 模式切换按钮 */}
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => updateAttributes({ displayMode: !displayMode })}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {displayMode ? '切换为行内公式' : '切换为块级公式'}
            </button>
          </div>
        </div>
      ) : (
        // 显示模式：显示渲染后的LaTeX + 工具栏
        <div className="latex-display relative group">
          {latex ? (
            <div className="relative">
              {/* 显示渲染后的LaTeX */}
              {renderedHtml ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  onClick={startEditing}
                  className={`katex-rendered ${displayMode ? 'katex-display text-center my-4' : 'inline-block'} cursor-pointer hover:opacity-90 transition-opacity`}
                  style={{ 
                    color: 'black',
                    width: 'fit-content',
                    display: displayMode ? 'block' : 'inline-block',
                    margin: displayMode ? '0 auto' : '0'
                  }}
                  title="点击编辑公式"
                />
              ) : error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  ⚠️ LaTeX 错误: {error}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm">
                  正在渲染LaTeX...
                </div>
              )}
              
              {/* 悬浮工具栏 */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={startEditing}
                  className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                  title="编辑"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={copyLatex}
                  className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                  title="复制"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => deleteNode()}
                  className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                  title="删除"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            // 空状态
            <div 
              className="latex-placeholder border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={startEditing}
            >
              <div className="text-4xl text-gray-400 mb-4">∑</div>
              <p className="text-gray-600 mb-2">点击添加 LaTeX 公式</p>
              <p className="text-sm text-gray-400">支持数学公式渲染</p>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  )
}

// 定义LaTeX节点
export const LaTeXExtension = Node.create({
  name: 'latexBlock',
  
  group: 'block',
  
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
      displayMode: {
        default: true, // 默认为块级显示
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="latex-block"]',
        getAttrs: (element) => ({
          latex: element.getAttribute('data-latex'),
          displayMode: element.getAttribute('data-display-mode') === 'true',
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'latex-block' }, {
        'data-latex': HTMLAttributes.latex,
        'data-display-mode': HTMLAttributes.displayMode,
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LaTeXComponent)
  },

  addCommands() {
    return {
      setLaTeX: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('latexPaste'),
        props: {
          handlePaste: (view, event, slice) => {
            const text = event.clipboardData?.getData('text/plain') || ''
            console.log('粘贴事件，文本:', text)
            
            if (text && (text.includes('$$') || text.includes('$'))) {
              console.log('检测到LaTeX内容:', text)
              
              // 检查块级LaTeX
              const blockMatch = text.match(/\$\$([^$]+)\$\$/)
              if (blockMatch) {
                console.log('插入块级LaTeX:', blockMatch[1])
                event.preventDefault()
                
                const { state } = view
                const { tr } = state
                const { from, to } = tr.selection
                
                // 删除选中内容
                if (from !== to) {
                  tr.delete(from, to)
                }
                
                const latexNode = this.type.create({
                  latex: blockMatch[1].trim(),
                  displayMode: true
                })
                tr.insert(from, latexNode)
                view.dispatch(tr)
                return true
              }
              
              // 检查行内LaTeX
              const inlineMatch = text.match(/\$([^$]+)\$/)
              if (inlineMatch) {
                console.log('插入行内LaTeX:', inlineMatch[1])
                event.preventDefault()
                
                const { state } = view
                const { tr } = state
                const { from, to } = tr.selection
                
                // 删除选中内容
                if (from !== to) {
                  tr.delete(from, to)
                }
                
                const latexNode = this.type.create({
                  latex: inlineMatch[1].trim(),
                  displayMode: false
                })
                tr.insert(from, latexNode)
                view.dispatch(tr)
                return true
              }
            }
            
            return false
          }
        }
      })
    ]
  },

  addInputRules() {
    return [
      // 块级LaTeX规则 - 输入 $$formula$$ 后按空格
      new InputRule({
        find: /\$\$([^$]+)\$\$ $/,
        handler: ({ state, range, match }) => {
          console.log('InputRule触发 - 块级LaTeX:', match[1])
          const { tr } = state
          const start = range.from
          const end = range.to - 1 // 排除空格
          
          const latexNode = this.type.create({
            latex: match[1].trim(),
            displayMode: true
          })
          
          tr.replaceWith(start, end, latexNode)
          return tr
        }
      }),
      // 行内LaTeX规则 - 输入 $formula$ 后按空格
      new InputRule({
        find: /\$([^$]+)\$ $/,
        handler: ({ state, range, match }) => {
          console.log('InputRule触发 - 行内LaTeX:', match[1])
          const { tr } = state
          const start = range.from
          const end = range.to - 1 // 排除空格
          
          const latexNode = this.type.create({
            latex: match[1].trim(),
            displayMode: false
          })
          
          tr.replaceWith(start, end, latexNode)
          return tr
        }
      })
    ]
  },
})

export default LaTeXExtension