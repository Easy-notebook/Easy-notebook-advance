import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { v4 as uuidv4 } from 'uuid'
import React from 'react'
import AIThinkingCell from '../Cells/AIThinkingCell'

// ThinkingCell 视图组件
const ThinkingCellView = ({ node, updateAttributes, deleteNode }) => {
  const { cellId, agentName, customText, textArray, useWorkflowThinking } = node.attrs

  // 构造cell对象
  const cell = {
    id: cellId,
    content: '',
    agentName,
    customText,
    textArray,
    useWorkflowThinking
  }

  const handleDelete = () => {
    deleteNode()
  }

  return (
    <NodeViewWrapper className="thinking-cell-wrapper">
      <AIThinkingCell 
        cell={cell} 
        onDelete={handleDelete}
        isInDetachedView={false}
      />
    </NodeViewWrapper>
  )
}

// ThinkingCell节点定义
export const ThinkingCellExtension = Node.create({
  name: 'thinkingCell',
  
  group: 'block',
  
  atom: true, // 原子节点，不可分割
  
  addAttributes() {
    return {
      cellId: {
        default: null,
        parseHTML: element => element.getAttribute('data-cell-id'),
        renderHTML: attributes => ({
          'data-cell-id': attributes.cellId,
        }),
      },
      agentName: {
        default: 'AI',
        parseHTML: element => element.getAttribute('data-agent-name') || 'AI',
        renderHTML: attributes => ({
          'data-agent-name': attributes.agentName,
        }),
      },
      customText: {
        default: null,
        parseHTML: element => {
          const text = element.getAttribute('data-custom-text')
          return text ? decodeURIComponent(text) : null
        },
        renderHTML: attributes => ({
          'data-custom-text': attributes.customText ? encodeURIComponent(attributes.customText) : '',
        }),
      },
      textArray: {
        default: [],
        parseHTML: element => {
          const textArrayAttr = element.getAttribute('data-text-array')
          try {
            return textArrayAttr ? JSON.parse(decodeURIComponent(textArrayAttr)) : []
          } catch {
            return []
          }
        },
        renderHTML: attributes => ({
          'data-text-array': encodeURIComponent(JSON.stringify(attributes.textArray || [])),
        }),
      },
      useWorkflowThinking: {
        default: false,
        parseHTML: element => element.getAttribute('data-use-workflow-thinking') === 'true',
        renderHTML: attributes => ({
          'data-use-workflow-thinking': String(attributes.useWorkflowThinking),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="thinking-cell"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'thinking-cell',
        'data-cell-id': node.attrs.cellId,
        'data-agent-name': node.attrs.agentName,
        'data-custom-text': node.attrs.customText ? encodeURIComponent(node.attrs.customText) : '',
        'data-text-array': encodeURIComponent(JSON.stringify(node.attrs.textArray || [])),
        'data-use-workflow-thinking': String(node.attrs.useWorkflowThinking),
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ThinkingCellView)
  },

  addCommands() {
    return {
      setThinkingCell: attributes => ({ commands }) => {
        // 确保有cellId
        if (!attributes.cellId) {
          attributes.cellId = uuidv4()
        }
        return commands.setNode(this.name, attributes)
      },
      insertThinkingCell: attributes => ({ commands }) => {
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
})