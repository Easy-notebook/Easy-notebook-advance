import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef } from 'react'
import { Edit3, Eye, X, Copy } from 'lucide-react'
import 'katex/dist/katex.min.css'

// 动态导入katex
let katex: any = null
const loadKatex = async () => {
  if (!katex) {
    katex = await import('katex')
  }
  return katex
}

// LaTeX渲染组件
const LaTeXComponent = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempCode, setTempCode] = useState(node.attrs.code || '')
  const [renderedHtml, setRenderedHtml] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { code, displayMode } = node.attrs

  // 渲染LaTeX
  useEffect(() => {
    const renderLatex = async () => {
      if (!code) {
        setRenderedHtml('')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const katexModule = await loadKatex()
        
        const html = katexModule.default.renderToString(code, {
          displayMode: displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: 'warn',
          trust: false,
          macros: {
            '\\f': '#1f(#2)',
          },
        })
        
        setRenderedHtml(html)
        setError('')
      } catch (err) {
        setError(err.message || 'LaTeX渲染错误')
        setRenderedHtml('')
      } finally {
        setIsLoading(false)
      }
    }

    renderLatex()
  }, [code, displayMode])

  // 开始编辑
  const startEditing = () => {
    setIsEditing(true)
    setTempCode(code || '')
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // 保存编辑
  const saveEdit = () => {
    updateAttributes({ code: tempCode })
    setIsEditing(false)
  }

  // 取消编辑
  const cancelEdit = () => {
    setTempCode(code || '')
    setIsEditing(false)
  }

  // 复制LaTeX代码
  const copyCode = () => {
    navigator.clipboard.writeText(code || '')
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  // 如果没有代码，显示输入界面
  if (!code && !isEditing) {
    return (
      <NodeViewWrapper className="latex-wrapper">
        <div 
          className="latex-placeholder border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={startEditing}
        >
          <div className="flex flex-col items-center">
            <div className="text-2xl mb-2">∑</div>
            <p className="text-gray-600">点击添加 LaTeX 数学公式</p>
            <p className="text-sm text-gray-400 mt-1">支持行内和块级数学公式</p>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="latex-wrapper relative group">
      {isEditing ? (
        // 编辑模式
        <div className="latex-editor border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              LaTeX 公式 {displayMode ? '(块级)' : '(行内)'}
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => updateAttributes({ displayMode: !displayMode })}
                className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                title={displayMode ? '切换为行内公式' : '切换为块级公式'}
              >
                {displayMode ? '行内' : '块级'}
              </button>
            </div>
          </div>
          
          <textarea
            ref={textareaRef}
            value={tempCode}
            onChange={(e) => setTempCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 LaTeX 公式，例如: x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
            className="w-full h-24 p-2 border rounded font-mono text-sm resize-none focus:outline-none focus:border-blue-400"
          />
          
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              Ctrl+Enter 保存 | Esc 取消
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 显示模式
        <div className={`latex-display ${displayMode ? 'block text-center my-4' : 'inline'}`}>
          {isLoading ? (
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              <span className="text-gray-500 text-sm">渲染中...</span>
            </div>
          ) : error ? (
            <div className="inline-flex items-center text-red-500 bg-red-50 px-2 py-1 rounded">
              <span className="text-sm">LaTeX 错误: {error}</span>
            </div>
          ) : (
            <div 
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              className={`katex-rendered ${displayMode ? 'katex-display' : ''}`}
            />
          )}
          
          {/* 悬浮工具栏 */}
          <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded border p-1">
            <button
              onClick={startEditing}
              className="p-1 hover:bg-gray-100 rounded"
              title="编辑公式"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={copyCode}
              className="p-1 hover:bg-gray-100 rounded"
              title="复制代码"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={() => deleteNode()}
              className="p-1 hover:bg-gray-100 rounded text-red-500"
              title="删除公式"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

// 定义LaTeX节点
export const LaTeXExtension = Node.create({
  name: 'latex',
  
  group: 'block',
  
  atom: true,

  addAttributes() {
    return {
      code: {
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
        tag: 'div[data-type="latex"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'latex' }, HTMLAttributes)]
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

  addInputRules() {
    return [
      // 双击 $$ 创建块级LaTeX
      {
        find: /\$\$(.+?)\$\$$/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          
          tr.replaceWith(start, end, this.type.create({
            code: match[1],
            displayMode: true
          }))
        }
      },
      // 单个 $ 创建行内LaTeX
      {
        find: /\$(.+?)\$$/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          
          tr.replaceWith(start, end, this.type.create({
            code: match[1],
            displayMode: false
          }))
        }
      }
    ]
  },
})

export default LaTeXExtension