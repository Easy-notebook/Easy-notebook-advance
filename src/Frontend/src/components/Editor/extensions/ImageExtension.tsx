import { Node, mergeAttributes } from '@tiptap/core'
import { InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, Edit3 } from 'lucide-react'
import useStore from '../../../store/notebookStore'

// React组件来渲染图片节点
const ImageComponent = ({ node, updateAttributes, deleteNode, editor }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempMarkdown, setTempMarkdown] = useState('')
  const [imageError, setImageError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // 获取store的所有必要数据和方法
  const { cells, currentCellId, updateCell } = useStore()
  
  // 获取cellId - 优先从node.attrs获取，fallback到当前cellId
  const cellId = node.attrs.cellId || currentCellId
  
  // 使用类似ImageCell的模式直接从store获取cell数据
  const cell = React.useMemo(() => {
    const foundCell = cells.find(c => c.id === cellId) || null
    console.log('🖼️ ImageExtension cell lookup:', { 
      cellId, 
      foundCell: foundCell ? { id: foundCell.id, content: foundCell.content?.substring(0, 50) } : null,
      totalCells: cells.length 
    })
    return foundCell
  }, [cells, cellId])
  
  // 获取cell的content
  const cellContent = cell?.content || ''
  
  // 解析markdown语法的函数
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
  
  // 使用store中的content作为唯一数据源
  const currentContent = cellContent || ''
  const previewData = parseMarkdown(currentContent)
  
  // 当store中的内容变化时，同步到node属性和临时编辑状态
  useEffect(() => {
    console.log('🖼️ ImageExtension store content changed:', { cellId, cellContent: cellContent?.substring(0, 50) })
    
    if (cellContent) {
      const parsed = parseMarkdown(cellContent)
      if (parsed.isValid) {
        // 同步到tiptap node属性
        updateAttributes({
          markdown: cellContent,
          src: parsed.src,
          alt: parsed.alt,
          title: parsed.alt,
          cellId: cellId
        })
      }
      // 同步临时编辑内容
      if (!isEditing) {
        setTempMarkdown(cellContent)
      }
    }
  }, [cellContent, cellId, updateAttributes, isEditing])

  // 初始化
  useEffect(() => {
    console.log('🖼️ ImageExtension initializing:', { cellId, currentContent: currentContent?.substring(0, 50) })
    if (currentContent) {
      setTempMarkdown(currentContent)
    } else {
      setTempMarkdown('![]()')
      setIsEditing(true) // 新节点默认进入编辑模式
    }
  }, [cellId, currentContent])

  // 开始编辑
  const startEditing = () => {
    setIsEditing(true)
    setTempMarkdown(currentContent || '![]()')
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const length = tempMarkdown.length
        textareaRef.current.setSelectionRange(length, length)
      }
    }, 0)
  }

  // 保存编辑 - 直接更新store
  const saveEdit = () => {
    console.log('🖼️ ImageExtension saving:', { cellId, tempMarkdown })
    if (cellId && updateCell) {
      // 直接更新store中的cell content
      updateCell(cellId, tempMarkdown)
    }
    
    // 同步更新tiptap node属性
    const parsed = parseMarkdown(tempMarkdown)
    updateAttributes({
      markdown: tempMarkdown,
      src: parsed.src,
      alt: parsed.alt,
      title: parsed.alt,
      cellId: cellId
    })
    
    setIsEditing(false)
    setImageError(false)
  }

  // 取消编辑
  const cancelEdit = () => {
    setTempMarkdown(currentContent || '')
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

  // 实时解析临时编辑内容
  const tempPreviewData = parseMarkdown(tempMarkdown)
  
  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageError(false)
  }

  return (
    <NodeViewWrapper 
      className="image-markdown-wrapper color-black"
      key={`${cellId}-${currentContent?.length || 0}`}
      data-cell-id={cellId}
    >
      {isEditing ? (
        // 编辑模式：直接编辑markdown语法 + 实时预览
        <div className="image-editor">
          {/* Markdown源码编辑器 */}
          <input
            ref={textareaRef}
            type="text"
            value={tempMarkdown}
            onChange={(e) => setTempMarkdown(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            placeholder="![图片描述](图片URL)"
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-400 text-black"
          />
          
          {/* 实时预览图片 */}
          {tempPreviewData.isValid && tempPreviewData.src ? (
            <div className="mt-3">
              <img
                src={tempPreviewData.src}
                alt={tempPreviewData.alt}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className="max-w-full h-auto rounded-lg shadow-sm"
              />
              
              {imageError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  ⚠️ 图片加载失败: {tempPreviewData.src}
                </div>
              )}
              
              {tempPreviewData.alt && !imageError && (
                <div className="mt-2 text-sm text-gray-600 text-center italic">
                  {tempPreviewData.alt}
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
          {previewData.isValid && previewData.src ? (
            <div className="relative">
              <img
                src={previewData.src}
                alt={previewData.alt}
                title={previewData.alt}
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
                    <div className="text-xs">{previewData.src}</div>
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
              {previewData.alt && (
                <div className="mt-2 text-sm text-gray-600 text-center italic">
                  {previewData.alt}
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
      cellId: {
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
        getAttrs: (element) => {
          const dataSrc = element.getAttribute('data-src') || '';
          const dataAlt = element.getAttribute('data-alt') || '';
          const dataMarkdown = element.getAttribute('data-markdown') || '';
          const dataCellId = element.getAttribute('data-cell-id') || '';
          
          return {
            src: dataSrc,
            alt: dataAlt,
            title: dataAlt,
            markdown: dataMarkdown,
            cellId: dataCellId,
          };
        },
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
        'data-cell-id': HTMLAttributes.cellId,
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