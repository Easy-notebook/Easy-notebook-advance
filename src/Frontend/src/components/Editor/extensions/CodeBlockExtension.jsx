import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { v4 as uuidv4 } from 'uuid'

// CodeBlock节点定义
export const CodeBlockExtension = Node.create({
  name: 'executableCodeBlock',
  
  group: 'block',
  
  atom: true, // 原子节点，不可分割
  
  addAttributes() {
    return {
      language: {
        default: 'python',
        parseHTML: element => element.getAttribute('data-language') || 'python',
        renderHTML: attributes => ({
          'data-language': attributes.language,
        }),
      },
      code: {
        default: '',
        parseHTML: element => element.getAttribute('data-code') || '',
        renderHTML: attributes => ({
          'data-code': attributes.code,
        }),
      },
      cellId: {
        default: null,
        parseHTML: element => element.getAttribute('data-cell-id'),
        renderHTML: attributes => ({
          'data-cell-id': attributes.cellId,
        }),
      },
      outputs: {
        default: [],
        parseHTML: element => {
          const outputsAttr = element.getAttribute('data-outputs')
          try {
            return outputsAttr ? JSON.parse(outputsAttr) : []
          } catch {
            return []
          }
        },
        renderHTML: attributes => ({
          'data-outputs': JSON.stringify(attributes.outputs || []),
        }),
      },
      enableEdit: {
        default: true,
        parseHTML: element => element.getAttribute('data-enable-edit') !== 'false',
        renderHTML: attributes => ({
          'data-enable-edit': String(attributes.enableEdit),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="executable-code-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'executable-code-block',
        'data-language': node.attrs.language,
        'data-code': node.attrs.code,
        'data-cell-id': node.attrs.cellId,
        'data-outputs': JSON.stringify(node.attrs.outputs || []),
        'data-enable-edit': String(node.attrs.enableEdit),
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },

  addCommands() {
    return {
      setExecutableCodeBlock: attributes => ({ commands }) => {
        // 确保有cellId
        if (!attributes.cellId) {
          attributes.cellId = uuidv4()
        }
        return commands.setNode(this.name, attributes)
      },
      insertExecutableCodeBlock: attributes => ({ commands }) => {
        // 确保有cellId
        if (!attributes.cellId) {
          attributes.cellId = uuidv4()
        }
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        })
      },
    }
  },

  // 自动转换普通代码块为可执行代码块
  addInputRules() {
    return [
      {
        find: /^```python$/,
        handler: ({ state, range, match }) => {
          const cellId = uuidv4()
          const { tr } = state
          const start = range.from - match[0].length
          const end = range.to

          // 删除触发文本并插入代码块
          tr.replaceWith(start, end, this.type.create({
            language: 'python',
            code: '',
            cellId: cellId,
            outputs: [],
            enableEdit: true,
          }))

          return tr
        },
      },
    ]
  },
})

// CodeBlock视图组件 - 使用现有的CodeCell
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import CodeCell from '../CodeCell'
import useStore from '../../../store/notebookStore'

const CodeBlockView = ({ 
  node, 
  updateAttributes, 
  deleteNode, 
  editor,
  getPos
}) => {
  const { language, code, cellId, outputs, enableEdit } = node.attrs
  const { cells, updateCell, deleteCell, addCell, setCurrentCell, setEditingCellId } = useStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // 创建虚拟cell对象，从store中获取最新内容
  const virtualCell = useMemo(() => {
    const existingCell = cells.find(cell => cell.id === cellId)
    if (existingCell) {
      return existingCell
    }
    // 如果store中没有，使用node attributes的初始值
    return {
      id: cellId,
      type: 'code',
      content: code || '',
      outputs: outputs || [],
      enableEdit: enableEdit !== false,
      language: language || 'python',
    }
  }, [cellId, code, outputs, enableEdit, language, cells])

  // 处理删除
  const handleDelete = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  // 防止重复插入的引用
  const hasTriedToAdd = useRef(false)
  
  // 确保cell在store中存在（仅初始化一次，避免重复插入）
  useEffect(() => {
    // 如果已经尝试过添加，直接返回
    if (hasTriedToAdd.current) return
    
    const existingCell = cells.find(cell => cell.id === cellId)
    
    if (!existingCell) {
      console.log(`=== CodeBlockView 检测到新的代码块，准备初始化 ===`);
      console.log(`Cell ID: ${cellId}`);
      
      // 标记已尝试添加，防止重复
      hasTriedToAdd.current = true
      
      // 计算当前CodeBlock在文档中的位置
      const pos = getPos()
      let insertIndex = cells.length // 默认添加到末尾
      
      if (pos !== undefined && editor) {
        // 简单计算：统计当前位置之前有多少个块级元素
        const doc = editor.state.doc
        let blockCount = 0
        
        doc.nodesBetween(0, pos, (node, nodePos) => {
          if (node.isBlock && nodePos < pos && node.type.name !== 'doc') {
            blockCount++
          }
        })
        
        // 修正：插入位置需要-1，因为当前代码块本身也算在内
        insertIndex = Math.max(0, Math.min(blockCount - 1, cells.length))
      }
      
      console.log(`计算位置: ${insertIndex}, tiptap pos: ${pos}`);
      
      // 创建新的cell
      const newCell = {
        id: cellId,
        type: 'code',
        content: code || '',
        outputs: outputs || [],
        enableEdit: enableEdit !== false,
        language: language || 'python',
      }
      
      console.log(`正在添加新cell到位置 ${insertIndex}`);
      addCell(newCell, insertIndex)
      
      // 设置新建的codecell为当前活跃cell
      setCurrentCell(cellId)
      
      // 延迟聚焦到代码编辑器
      setTimeout(() => {
        // 在下一个渲染周期中查找并聚焦代码编辑器
        const codeElement = document.querySelector(`[data-cell-id="${cellId}"] .cm-editor .cm-content`)
        if (codeElement) {
          codeElement.focus()
          console.log(`已聚焦到新建的代码块 ${cellId}`)
        }
      }, 100)
      
      setIsInitialized(true)
      console.log(`=== CodeBlockView 初始化完成，已设置为活跃cell ===`);
    } else {
      console.log(`Cell ${cellId} 已存在于store中，跳过初始化`);
      setIsInitialized(true)
    }
  }, [cellId]) // 只依赖cellId，避免因cells变化而重复执行

  // 注意：不再监听cell内容变化同步到node attributes
  // 这样避免了代码编辑时触发tiptap的onUpdate事件
  // CodeCell的内容变化只在store中管理，不同步回tiptap节点

  return (
    <NodeViewWrapper 
      className="executable-code-block-wrapper my-4"
      data-cell-id={cellId}
    >
      {/* 使用现有的CodeCell组件，传递正确的props */}
      <CodeCell
        cell={virtualCell}
        onDelete={handleDelete}
        isStepMode={false}
        dslcMode={false}
      />
    </NodeViewWrapper>
  )
}

export default CodeBlockExtension