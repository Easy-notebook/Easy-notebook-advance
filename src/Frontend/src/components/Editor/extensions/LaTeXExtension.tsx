import { Node, mergeAttributes } from '@tiptap/core'
import { InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef } from 'react'
import { Edit3, Eye, X, Copy } from 'lucide-react'
import 'katex/dist/katex.min.css'

// 直接导入katex
import katex from 'katex'

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
    const renderLatex = () => {
      if (!code) {
        setRenderedHtml('')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        const html = katex.renderToString(code, {
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
    const currentCode = code || ''
    setTempCode(currentCode)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        // 将游标设置到文本末尾
        const length = currentCode.length
        textareaRef.current.setSelectionRange(length, length)
      }
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
    if (e.key === 'Enter') {
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
        // 简约编辑模式：源码编辑器 + 直接实时预览
        <div className="latex-editor">
          {/* 简约的LaTeX源码编辑器 */}
          <input
            ref={textareaRef}
            type="text"
            value={tempCode}
            onChange={(e) => setTempCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            placeholder="输入 LaTeX 公式，如: x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-400 bg-white"
          />
          
          {/* 实时预览公式 */}
          {tempCode ? (
            <div className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <span className="text-gray-500 text-sm">渲染中...</span>
                </div>
              ) : error ? (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  ⚠️ LaTeX 错误: {error}
                </div>
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  className={`katex-rendered ${displayMode ? 'katex-display text-center' : 'inline-block'}`}
                />
              )}
            </div>
          ) : (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-gray-500 text-sm">
              输入 LaTeX 公式以查看预览
            </div>
          )}
          
          {/* 切换显示模式的按钮 */}
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
              onClick={startEditing}
              className={`katex-rendered ${displayMode ? 'katex-display' : ''} cursor-pointer hover:opacity-80 transition-opacity`}
              title="点击编辑公式"
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
      // 简化的LaTeX规则 - 输入 $$formula$$ 后按空格
      new InputRule({
        find: /\$\$(.+?)\$\$ $/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to - 1 // 排除空格
          
          tr.replaceWith(start, end, this.type.create({
            code: match[1].trim(),
            displayMode: true
          }))
          
          return tr
        }
      }),
      // 行内LaTeX规则 - 输入 $formula$ 后按空格  
      new InputRule({
        find: /\$(.+?)\$ $/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to - 1 // 排除空格
          
          tr.replaceWith(start, end, this.type.create({
            code: match[1].trim(),
            displayMode: false
          }))
          
          return tr
        }
      })
    ]
  },
})

export default LaTeXExtension