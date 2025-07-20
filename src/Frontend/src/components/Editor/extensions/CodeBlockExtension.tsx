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
        // 匹配三个反引号后跟语言标识符，然后是回车
        find: /```(python|javascript|js|typescript|ts|bash|shell)\s*$/,
        handler: ({ state, range, match }) => {
          console.log('=== CodeBlockExtension InputRule Debug ===');
          console.log('Match:', match);
          console.log('Match[0] (full match):', match[0]);
          console.log('Match[1] (language):', match[1]);
          console.log('Range:', range);
          console.log('Range.from:', range.from, 'Range.to:', range.to);
          
          const language = match[1] || 'python'
          const cellId = uuidv4()
          const { tr } = state
          
          // range已经是匹配文本的正确范围，不需要重新计算
          const start = range.from
          const end = range.to
          
          console.log('Calculated start:', start, 'end:', end);
          console.log('Will delete length:', end - start);
          console.log('Document content around range:', state.doc.textBetween(Math.max(0, start - 10), Math.min(state.doc.content.size, end + 10)));
          
          // 安全检查
          if (start < 0 || end > state.doc.content.size || start > end) {
            console.error('Invalid range calculated:', { start, end, docSize: state.doc.content.size });
            return false; // 取消操作
          }

          // 创建代码块节点
          const codeBlockNode = this.type.create({
            language: language,
            code: '',
            cellId: cellId,
            outputs: [],
            enableEdit: true,
          })
          
          // 删除触发文本并插入代码块
          tr.replaceWith(start, end, codeBlockNode)
          
          // 将光标移动到代码块后面（这样代码块组件可以接管焦点）
          const newPos = start + codeBlockNode.nodeSize
          if (newPos <= tr.doc.content.size) {
            tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newPos)))
          }
          
          // 添加标记，告诉onUpdate这是InputRule创建的变化，应该跳过处理
          tr.setMeta('codeBlockInputRule', true);
          // 添加cellId到meta，用于后续聚焦
          tr.setMeta('newCodeCellId', cellId);
          
          console.log('=== InputRule 处理完成，cellId:', cellId, '===');
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

  // 处理删除
  const handleDelete = useCallback(() => {
    console.log('=== 删除代码块开始 ===');
    console.log('删除的代码块ID:', cellId);
    
    if (editor && getPos) {
      const pos = getPos();
      const { tr } = editor.state;
      
      // 获取代码块在文档中的位置
      const nodeStart = pos;
      const nodeEnd = pos + node.nodeSize;
      
      console.log('代码块位置:', nodeStart, '-', nodeEnd);
      
      // 在删除之前，先找到上一个元素的位置
      let targetPos = nodeStart;
      let foundPreviousElement = false;
      
      // 尝试找到前一个可编辑的位置
      if (nodeStart > 0) {
        try {
          // 逐步向前查找，找到合适的位置
          for (let pos = nodeStart - 1; pos >= 0; pos--) {
            const $pos = editor.state.doc.resolve(pos);
            
            // 如果找到了段落，移动到段落末尾
            if ($pos.parent.type.name === 'paragraph') {
              targetPos = $pos.end($pos.depth);
              foundPreviousElement = true;
              console.log('找到前一个段落，位置:', targetPos);
              break;
            }
            
            // 如果找到了其他块级元素，也可以作为目标
            if ($pos.parent.isBlock && $pos.parent.type.name !== 'doc') {
              targetPos = $pos.end($pos.depth);
              foundPreviousElement = true;
              console.log('找到前一个块级元素:', $pos.parent.type.name, '位置:', targetPos);
              break;
            }
          }
        } catch (e) {
          console.warn('查找前一个元素失败:', e);
        }
      }
      
      // 删除代码块
      tr.delete(nodeStart, nodeEnd);
      
      // 调整删除后的位置
      if (foundPreviousElement) {
        // 确保位置在有效范围内
        targetPos = Math.min(targetPos, tr.doc.content.size);
      } else {
        // 如果没找到前一个元素，设置到删除位置
        targetPos = Math.min(nodeStart, tr.doc.content.size);
      }
      
      // 确保位置不为负数
      if (targetPos < 0) {
        targetPos = 0;
      }
      
      console.log('删除后文档大小:', tr.doc.content.size, '目标位置:', targetPos);
      
      // 设置光标位置
      if (targetPos <= tr.doc.content.size) {
        try {
          const $finalPos = tr.doc.resolve(targetPos);
          const selection = editor.state.selection.constructor.near($finalPos, -1);
          tr.setSelection(selection);
          
          console.log('最终光标位置:', targetPos);
        } catch (e) {
          console.warn('设置光标位置失败:', e);
          // 备用方案：设置到安全位置
          try {
            const safePos = Math.min(Math.max(0, targetPos), tr.doc.content.size);
            const $safePos = tr.doc.resolve(safePos);
            tr.setSelection(editor.state.selection.constructor.near($safePos));
          } catch (e2) {
            console.error('备用光标位置设置也失败:', e2);
          }
        }
      }
      
      // 应用事务
      editor.view.dispatch(tr);
      
      console.log('=== 删除代码块完成 ===');
    } else {
      // 备用方案
      deleteNode();
    }
  }, [deleteNode, editor, getPos, cellId, node])

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