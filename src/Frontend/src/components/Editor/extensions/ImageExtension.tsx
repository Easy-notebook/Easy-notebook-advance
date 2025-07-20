import { Node, mergeAttributes } from '@tiptap/core'
import { InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, RotateCcw, Edit3, Eye } from 'lucide-react'

// React组件来渲染图片节点
const ImageComponent = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempMarkdown, setTempMarkdown] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { src, alt, title, markdown } = node.attrs

  // 初始化编辑状态
  useEffect(() => {
    if (markdown) {
      setTempMarkdown(markdown)
    } else if (src) {
      setTempMarkdown(`![${alt || ''}](${src})`)
    } else {
      setTempMarkdown('![]()')
      setIsEditing(true) // 新节点默认进入编辑模式
    }
  }, [])

  // 解析markdown语法
  const parseMarkdown = (markdownStr: string) => {
    const match = markdownStr.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (match) {
      return {
        alt: match[1] || '',
        src: match[2] || '',
        isValid: true
      }
    }
    return {
      alt: '',
      src: '',
      isValid: false
    }
  }

  // 生成markdown字符串
  const generateMarkdown = (altText: string, srcUrl: string) => {
    return `![${altText}](${srcUrl})`
  }

  // 开始编辑
  const startEditing = () => {
    setIsEditing(true)
    const currentMarkdown = markdown || generateMarkdown(alt || '', src || '')
    setTempMarkdown(currentMarkdown)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        // 将游标设置到文本末尾
        const length = currentMarkdown.length
        textareaRef.current.setSelectionRange(length, length)
      }
    }, 0)
  }

  // 保存编辑
  const saveEdit = () => {
    const parsed = parseMarkdown(tempMarkdown)
    updateAttributes({
      markdown: tempMarkdown,
      src: parsed.src,
      alt: parsed.alt,
      title: parsed.alt
    })
    setIsEditing(false)
    setImageError(false)
  }

  // 取消编辑
  const cancelEdit = () => {
    const currentMarkdown = markdown || generateMarkdown(alt || '', src || '')
    setTempMarkdown(currentMarkdown)
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

  // 实时解析预览
  const previewData = parseMarkdown(tempMarkdown)
  
  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageError(false)
  }

  return (
    <NodeViewWrapper className="image-markdown-wrapper">
      {isEditing ? (
        // 简约编辑模式：源码编辑器 + 直接实时预览
        <div className="image-editor">
          {/* 简约的Markdown源码编辑器 */}
          <input
            ref={textareaRef}
            type="text"
            value={tempMarkdown}
            onChange={(e) => setTempMarkdown(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            placeholder="![图片描述](图片URL)"
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-400 bg-white"
          />
          
          {/* 实时预览图片 */}
          {previewData.isValid && previewData.src ? (
            <div className="mt-3">
              <img
                src={previewData.src}
                alt={previewData.alt}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className="max-w-full h-auto rounded-lg shadow-sm"
              />
              
              {imageError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  ⚠️ 图片加载失败: {previewData.src}
                </div>
              )}
              
              {previewData.alt && !imageError && (
                <div className="mt-2 text-sm text-gray-600 text-center italic">
                  {previewData.alt}
                </div>
              )}
            </div>
          ) : tempMarkdown ? (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
              ⚠️ 请检查 Markdown 语法: ![描述](URL)
            </div>
          ) : (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-gray-500 text-sm">
              输入图片的 Markdown 语法以查看预览
            </div>
          )}
        </div>
      ) : (
        // 显示模式：显示图片 + 工具栏
        <div className="image-display relative group">
          {src ? (
            <div className="relative">
              <img
                src={src}
                alt={alt}
                title={alt}
                onError={handleImageError}
                onLoad={handleImageLoad}
                onClick={startEditing}
                className="max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              />
              
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center text-gray-500">
                    <X className="h-8 w-8 mx-auto mb-2" />
                    <div className="text-sm">图片加载失败</div>
                    <div className="text-xs">{src}</div>
                  </div>
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
                  onClick={() => deleteNode()}
                  className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                  title="删除"
                >
                  <X size={14} />
                </button>
              </div>
              
              {/* 图片信息 */}
              {alt && (
                <div className="mt-2 text-sm text-gray-600 text-center italic">
                  {alt}
                </div>
              )}
            </div>
          ) : (
            // 空状态
            <div 
              className="image-placeholder border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={startEditing}
            >
              <Upload className="h-12 w-12 text-gray-400 mb-4 mx-auto" />
              <p className="text-gray-600 mb-2">点击添加图片</p>
              <p className="text-sm text-gray-400">支持 Markdown 语法: ![描述](URL)</p>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  )
}

// 定义Image节点
export const ImageExtension = Node.create({
  name: 'markdownImage',
  
  group: 'block',
  
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      markdown: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) => ({
          src: element.getAttribute('src'),
          alt: element.getAttribute('alt'),
          title: element.getAttribute('title'),
          markdown: `![${element.getAttribute('alt') || ''}](${element.getAttribute('src') || ''})`
        }),
      },
      {
        tag: 'div[data-type="markdown-image"]',
        getAttrs: (element) => ({
          src: element.getAttribute('data-src'),
          alt: element.getAttribute('data-alt'),
          title: element.getAttribute('data-title'),
          markdown: element.getAttribute('data-markdown'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'markdown-image' }, {
        'data-src': HTMLAttributes.src,
        'data-alt': HTMLAttributes.alt,
        'data-title': HTMLAttributes.title,
        'data-markdown': HTMLAttributes.markdown,
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent)
  },

  addCommands() {
    return {
      setImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /!\[([^\]]*)\]\(([^)]+)\)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const start = range.from
          const end = range.to
          
          const alt = match[1] || ''
          const src = match[2] || ''
          const markdown = match[0]
          
          tr.replaceWith(start, end, this.type.create({
            src,
            alt,
            title: alt,
            markdown
          }))
        }
      })
    ]
  },
})

export default ImageExtension