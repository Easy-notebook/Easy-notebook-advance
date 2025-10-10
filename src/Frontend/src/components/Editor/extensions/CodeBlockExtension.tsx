// @ts-nocheck
// eslint-disable
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { v4 as uuidv4 } from 'uuid'
import { TextSelection } from 'prosemirror-state'

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
      originalType: {
        default: 'code',
        parseHTML: element => element.getAttribute('data-original-type') || 'code',
        renderHTML: attributes => ({
          'data-original-type': attributes.originalType || 'code',
        }),
      },
      isGenerating: {
        default: false,
        parseHTML: element => element.getAttribute('data-is-generating') === 'true',
        renderHTML: attributes => ({
          'data-is-generating': String(!!attributes.isGenerating),
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
        'data-is-generating': String(!!node.attrs.isGenerating),
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

  addKeyboardShortcuts() {
    return {
      // 防止在代码块边缘使用 Backspace 删除整个代码块
      'Backspace': ({ editor }) => {
        const { state, view } = editor
        const { selection } = state
        const { $from } = selection
        
        // 检查是否在代码块中
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth)
          if (node.type.name === this.name) {
            // 如果在代码块中且光标在开始位置，不要删除整个代码块
            // 让 CodeMirror 处理删除逻辑
            return true // 阻止默认删除行为
          }
        }
        return false // 允许默认删除行为
      },
      
      // 防止在代码块边缘使用 Delete 删除整个代码块
      'Delete': ({ editor }) => {
        const { state, view } = editor
        const { selection } = state
        const { $from } = selection
        
        // 检查是否在代码块中
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth)
          if (node.type.name === this.name) {
            // 如果在代码块中且光标在结束位置，不要删除整个代码块
            // 让 CodeMirror 处理删除逻辑
            return true // 阻止默认删除行为
          }
        }
        return false // 允许默认删除行为
      },
    }
  },

  // 自动转换普通代码块为可执行代码块
  addInputRules() {
    return [
      {
        // 匹配三个反引号后跟语言标识符，然后是回车
        find: /```(python|javascript|js|typescript|ts|bash|shell)\s*$/,
        handler: ({ state, range, match }) => {
          const language = match[1] || 'python'
          const cellId = uuidv4()
          const { tr } = state
          
          // 创建代码块节点
          const codeBlockNode = this.type.create({
            language: language,
            code: '',
            cellId: cellId,
            outputs: [],
            enableEdit: true,
          })
          
          // 删除触发文本所在的整个段落并插入代码块，确保不残留触发字符
          const $pos = state.doc.resolve(range.to)
          const fromBlock = $pos.before($pos.depth)
          const toBlock = $pos.after($pos.depth)
          tr.replaceWith(fromBlock, toBlock, codeBlockNode)
          
          // 将光标移动到代码块后面（这样代码块组件可以接管焦点）
          const newDocPos = fromBlock + codeBlockNode.nodeSize
          if (newDocPos <= tr.doc.content.size) {
            tr.setSelection(TextSelection.near(tr.doc.resolve(newDocPos)))
          }
          
          // 添加标记，告诉onUpdate这是InputRule创建的变化
          tr.setMeta('codeBlockInputRule', true);
          // 添加cellId和语言到meta，用于后续处理
          tr.setMeta('newCodeCellId', cellId);
          tr.setMeta('codeBlockLanguage', language);
          
          console.log('=== InputRule 处理完成，cellId:', cellId, '===');
          return tr
        },
      },
      {
        // 宽松匹配：仅输入 ``` 或 ``` 后跟部分字母也触发
        find: /```([a-zA-Z]*)\s*$/,
        handler: ({ state, range, match }) => {
          const raw = (match[1] || '').toLowerCase()
          // 语言猜测映射
          const guess = (lang) => {
            if (!lang) return 'python'
            if ('python'.startsWith(lang) || ['py', 'pyth', 'pytho'].includes(lang)) return 'python'
            if (['js', 'javascript'].some(x => x.startsWith(lang))) return 'javascript'
            if (['ts', 'typescript'].some(x => x.startsWith(lang))) return 'typescript'
            if (['bash', 'sh', 'shell'].some(x => x.startsWith(lang))) return 'bash'
            return 'python'
          }
          const language = guess(raw)
          const cellId = uuidv4()
          const { tr } = state

          const codeBlockNode = this.type.create({
            language,
            code: '',
            cellId,
            outputs: [],
            enableEdit: true,
          })

          // 替换整个段落为代码块
          const $pos = state.doc.resolve(range.to)
          const fromBlock = $pos.before($pos.depth)
          const toBlock = $pos.after($pos.depth)
          tr.replaceWith(fromBlock, toBlock, codeBlockNode)

          // 将光标移动到代码块后
          const newDocPos = fromBlock + codeBlockNode.nodeSize
          if (newDocPos <= tr.doc.content.size) {
            tr.setSelection(TextSelection.near(tr.doc.resolve(newDocPos)))
          }

          // 标记 InputRule 元数据
          tr.setMeta('codeBlockInputRule', true)
          tr.setMeta('newCodeCellId', cellId)
          tr.setMeta('codeBlockLanguage', language)
          return tr
        },
      },
    ]
  },
})

// CodeBlock视图组件 - 根据类型动态选择CodeCell或HybridCell
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import CodeCell from '../Cells/CodeCell'
import HybridCell from '../Cells/HybridCell'
import useStore from '../../../store/notebookStore'

const CodeBlockView = ({ 
  node, 
  updateAttributes, 
  deleteNode, 
  editor,
  getPos
}) => {
  const { language, code, cellId, outputs, enableEdit } = node.attrs
  const { cells, updateCell, deleteCell, addCell, setCurrentCell, setEditingCellId, updateCellType, clearCellOutputs } = useStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // 创建虚拟cell对象，优先从store中获取最新内容
  const virtualCell = useMemo(() => {
    const existingCell = cells.find(cell => cell.id === cellId)
    if (existingCell) {
      // 完全使用store中的数据，确保数据是最新的
      console.log(`CodeBlockView ${cellId}: 使用store中的最新数据`, {
        content: existingCell.content.substring(0, 50) + '...',
        outputs: existingCell.outputs.length
      })
      return existingCell
    }
    // 如果store中没有，使用node attributes的初始值（仅在初始化时）
    console.log(`CodeBlockView ${cellId}: 使用node attributes初始值`)
    return {
      id: cellId,
      type: 'code',
      content: code || '',
      outputs: outputs || [],
      enableEdit: enableEdit !== false,
      language: language || 'python',
    }
  }, [cellId, cells]) // 只依赖cellId和cells，不依赖node attributes

  // 添加删除保护状态
  const [isDeleting, setIsDeleting] = useState(false);

  // 处理删除
  const handleDelete = useCallback(() => {
    if (isDeleting) {
      console.log('删除已在进行中，跳过重复删除');
      return;
    }

    const language = (virtualCell as any)?.language || node.attrs.language || ''
    const rawCode = (virtualCell.content || node.attrs.code || '').replace(/\r\n/g, '\n')
    const hasCode = rawCode.trim().length > 0
    const fenceHeader = language ? `\u0060\u0060\u0060${language}` : '```'
    const scaffoldMarkdown = hasCode ? `${fenceHeader}\n${rawCode}\n\u0060\u0060\u0060` : `${fenceHeader}\n\u0060\u0060\u0060`

    const hasOutputs = Array.isArray(virtualCell.outputs) && virtualCell.outputs.length > 0
    if (hasOutputs) {
      const confirmMessage = '当前代码单元格仍有输出，删除将把它转换为 Markdown 并清除输出，是否继续？'
      const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : false
      if (!confirmed) {
        return
      }
    }

    console.log('=== 删除代码块开始 ===');
    console.log('删除的代码块ID:', cellId);

    setIsDeleting(true);

    updateCellType(cellId, 'markdown')
    updateCell(cellId, scaffoldMarkdown)
    if (hasOutputs) {
      clearCellOutputs(cellId)
    }
    setEditingCellId?.(cellId)
    setCurrentCell?.(cellId)

    if (editor && getPos) {
      const pos = getPos()
      const { state } = editor
      const { schema } = state
      const nodeStart = pos
      const nodeEnd = pos + node.nodeSize

      const textNode = schema.text(scaffoldMarkdown)
      const paragraph = schema.nodes.paragraph ? schema.nodes.paragraph.create({}, textNode) : textNode
      let tr = state.tr.replaceWith(nodeStart, nodeEnd, paragraph)

      try {
        const $target = tr.doc.resolve(Math.max(0, nodeStart + (paragraph.nodeSize || textNode.nodeSize || scaffoldMarkdown.length) - 1))
        tr = tr.setSelection(TextSelection.near($target))
      } catch (error) {
        console.warn('设置光标位置失败，将使用默认位置', error)
      }

      editor.view.dispatch(tr)

      setTimeout(() => {
        try {
          const { state: newState, view: newView } = editor
          const target = Math.max(0, nodeStart + scaffoldMarkdown.length - 1)
          const $resolved = newState.doc.resolve(Math.min(target, newState.doc.content.size - 1))
          newView.dispatch(newState.tr.setSelection(TextSelection.near($resolved)).scrollIntoView())
          newView.focus()
        } catch (focusError) {
          console.warn('Post-delete focus reset failed', focusError)
        }
        setIsDeleting(false)
      }, 40)
    } else {
      deleteNode()
      setTimeout(() => {
        setIsDeleting(false)
      }, 200)
    }
  }, [
    isDeleting,
    virtualCell,
    node,
    editor,
    getPos,
    cellId,
    updateCellType,
    updateCell,
    clearCellOutputs,
    setEditingCellId,
    setCurrentCell,
    deleteNode,
  ])

  // 防止重复插入的引用
  const hasTriedToAdd = useRef(false)
  
  // 检查cell是否在store中存在，如果不存在说明这是一个新创建的代码块
  useEffect(() => {
    const existingCell = cells.find(cell => cell.id === cellId)
    
    if (existingCell) {
      console.log(`Cell ${cellId} 已存在于store中`);
      setIsInitialized(true)
      return
    }
    
    // 如果cell不存在，说明这是通过Tiptap的InputRule创建的新代码块
    // 此时不需要手动添加到store，因为TiptapNotebookEditor的onUpdate会处理
    console.log(`Cell ${cellId} 不在store中，等待TiptapNotebookEditor同步处理`);
    setIsInitialized(true)
  }, [cellId, cells])

  // 注意：不再监听cell内容变化同步到node attributes
  // 这样避免了代码编辑时触发tiptap的onUpdate事件
  // CodeCell的内容变化只在store中管理，不同步回tiptap节点

  // 根据cell类型决定使用哪个组件
  const CellComponent = virtualCell.type === 'hybrid' ? HybridCell : CodeCell;
  
  return (
    <NodeViewWrapper
      className="executable-code-block-wrapper my-4 relative"
      data-cell-id={cellId}
    >
      {/* 根据cell类型动态选择组件 */}
      <CellComponent
        cell={virtualCell}
        onDelete={handleDelete}
        // CodeCell 需要的props
        isStepMode={false}
        dslcMode={false}
        finished_thinking={false}
        thinkingText="finished thinking"
      />
      {((virtualCell && (virtualCell as any).metadata?.isGenerating) || false) && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg z-10">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            <span>Generating code...</span>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

export default CodeBlockExtension
