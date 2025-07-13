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
        find: /^```python\s$/,
        handler: ({ state, range, match }) => {
          const cellId = uuidv4()
          const { tr } = state
          const start = range.from
          const end = range.to

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
import React, { useCallback, useMemo, useEffect, useState } from 'react'
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
  const { cells, updateCell, deleteCell, addCell } = useStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // 创建虚拟cell对象，完全兼容现有CodeCell
  const virtualCell = useMemo(() => ({
    id: cellId,
    type: 'code',
    content: code || '',
    outputs: outputs || [],
    enableEdit: enableEdit !== false,
    language: language || 'python',
  }), [cellId, code, outputs, enableEdit, language])

  // 处理删除
  const handleDelete = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  // 确保cell在store中存在，并保持同步
  useEffect(() => {
    const existingCell = cells.find(cell => cell.id === cellId)
    
    if (!existingCell) {
      // 如果cell不存在，创建一个新的
      const newCell = {
        id: cellId,
        type: 'code',
        content: code || '',
        outputs: outputs || [],
        enableEdit: enableEdit !== false,
        language: language || 'python',
      }
      addCell(newCell)
    } else {
      // 如果cell存在但内容不同，更新attributes
      if (existingCell.content !== code) {
        updateAttributes({ code: existingCell.content })
      }
      if (JSON.stringify(existingCell.outputs) !== JSON.stringify(outputs)) {
        updateAttributes({ outputs: existingCell.outputs })
      }
    }
  }, [cellId, code, outputs, enableEdit, language, cells, addCell, updateAttributes])

  // 监听cell内容变化，同步到node attributes
  useEffect(() => {
    const existingCell = cells.find(cell => cell.id === cellId)
    if (existingCell) {
      if (existingCell.content !== code) {
        updateAttributes({ code: existingCell.content })
      }
      if (JSON.stringify(existingCell.outputs) !== JSON.stringify(outputs)) {
        updateAttributes({ outputs: existingCell.outputs })
      }
    }
  }, [cells, cellId, code, outputs, updateAttributes])

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