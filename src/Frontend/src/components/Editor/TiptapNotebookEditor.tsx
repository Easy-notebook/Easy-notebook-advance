// Add TypeScript ignore directive and update imports & typing
// @ts-nocheck
// eslint-disable
import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState} from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { CodeBlockExtension } from './extensions/CodeBlockExtension'
import { ThinkingCellExtension } from './extensions/ThinkingCellExtension'
import SimpleTableExtension from './extensions/TableExtension'
import ImageExtension from './extensions/ImageExtension'
import LaTeXExtension from './extensions/LaTeXExtension'
import TipTapSlashCommands from './TipTap/TipTapSlashCommands'
import { useTipTapSlashCommands } from './TipTap/useTipTapSlashCommands'
import SimpleDragManager from './TipTap/BlockManager/SimpleDragManager'
import useStore from '../../store/notebookStore'
import { 
  Bold, 
  Italic, 
  Code, 
  Heading1, 
  Heading2,
  List,
  ListOrdered,
  Quote,
  Terminal,
  Table as TableIcon,
  Image as ImageIcon,
  Sigma as FunctionIcon,
  Brain
} from 'lucide-react'

import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { Extension } from '@tiptap/react'
import { Plugin, PluginKey, Selection } from 'prosemirror-state'
import Heading from '@tiptap/extension-heading'
import { Cell } from '../../store/notebookStore';

interface TiptapNotebookEditorProps {
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

interface TiptapNotebookEditorRef {
  editor: any;
  focus: () => void;
  getHTML: () => string;
  setContent: (content: any) => void;
  clearContent: () => void;
  isEmpty: () => boolean;
  // 混合笔记本特有的方法
  getCells: () => any[];
  setCells: (cells: any[]) => void;
  addCodeCell: () => string;
  addMarkdownCell: () => string;
  addHybridCell: () => string;
  addAIThinkingCell: (props?: any) => string;
}

const TiptapNotebookEditor = forwardRef<TiptapNotebookEditorRef, TiptapNotebookEditorProps>(({ 
  className = "text-2xl font-bold leading-relaxed",
  placeholder = "Untitled",
  readOnly = false
}, ref) => {
  
  const {
    cells,
    setCells,
  } = useStore()

  const editorRef = useRef(null)
  const [currentEditor, setCurrentEditor] = useState(null)

  // TipTap快捷指令
  const slashCommands = useTipTapSlashCommands({ editor: currentEditor })

  // 动态游标样式扩展
  const CursorStyleExtension = Extension.create({
    name: 'cursorStyle',
    
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('cursorStyle'),
          view(editorView) {
            const updateCursorStyle = () => {
              const { state } = editorView
              const { selection } = state
              const { from } = selection
              
              // 获取当前位置的节点
              const $pos = state.doc.resolve(from)
              const node = $pos.parent
              
              // 根据节点类型设置游标颜色
              let caretColor = '#1f2937' // 默认颜色
              
              if (node.type.name === 'heading') {
                const level = node.attrs.level
                switch (level) {
                  case 1:
                    caretColor = '#3b82f6' // 蓝色 - H1/默认标题
                    break
                  case 2:
                    caretColor = '#059669' // 绿色 - H2
                    break
                  case 3:
                    caretColor = '#dc2626' // 红色 - H3
                    break
                  default:
                    caretColor = '#7c3aed' // 紫色 - H4-H6
                }
              } else if (node.type.name === 'listItem') {
                caretColor = '#f59e0b' // 橙色 - 列表项
              } else if (node.type.name === 'blockquote') {
                caretColor = '#6b7280' // 灰色 - 引用
              } else if (node.type.name === 'codeBlock') {
                caretColor = '#ef4444' // 红色 - 代码块
              } else if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                caretColor = '#8b5cf6' // 紫色 - 表格
              }
              
              // 应用样式到编辑器
              const editorElement = editorView.dom
              if (editorElement) {
                editorElement.style.caretColor = caretColor
              }
            }
            
            // 初始设置
            updateCursorStyle()
            
            return {
              update: updateCursorStyle
            }
          }
        })
      ]
    }
  })

  // 在文档末尾始终保留一个段落，确保代码块后可以换行到新段落
  const TrailingParagraphExtension = Extension.create({
    name: 'trailingParagraph',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('trailingParagraph'),
          appendTransaction: (transactions, oldState, newState) => {
            const { doc, tr, schema } = newState
            const last = doc.lastChild
            const paragraph = schema.nodes.paragraph
            if (!paragraph) return null
            if (!last || last.type !== paragraph) {
              const insertPos = doc.content.size
              const nextTr = tr.insert(insertPos, paragraph.create())
              return nextTr
            }
            return null
          },
        }),
      ]
    },
  })

  // 点击编辑器尾部空白区域时，自动在末尾插入一个空段落并将光标放置其中
  const ClickBlankToNewLineExtension = Extension.create({
    name: 'clickBlankToNewLine',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('clickBlankToNewLine'),
          props: {
            handleClick(view, pos, event) {
              try {
                const { state } = view
                const { doc, schema } = state
                const paragraph = schema.nodes.paragraph
                if (!paragraph) return false
                // 如果点击位置在文档末尾或之后
                const atEnd = pos >= doc.content.size
                if (atEnd) {
                  const last = doc.lastChild
                  if (!last || last.type.name !== 'paragraph' || last.content.size > 0) {
                    const trInsert = state.tr.insert(doc.content.size, paragraph.create())
                    view.dispatch(trInsert)
                  }
                  // 将光标放到文档末尾段落
                  const $end = view.state.doc.resolve(view.state.doc.content.size)
                  const trSel = view.state.tr.setSelection(Selection.near($end))
                  view.dispatch(trSel)
                  return true
                }
              } catch {}
              return false
            },
          },
        }),
      ]
    },
  })

  // 防止循环更新的标志
  const isInternalUpdate = useRef<boolean>(false)
  
  // 缓存上次的cells状态，用于增量更新
  const lastCellsRef = useRef<Cell[]>([])
  
  // 初始化lastCellsRef
  useEffect(() => {
    lastCellsRef.current = cells
  }, [])
  
  // 初始内容 - 只在组件首次挂载时计算一次，避免与useEffect重复设置
  const initialContent = useMemo(() => {
    console.log('=== 计算initialContent（仅首次） ===');
    console.log('初始cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
    
    const content = convertCellsToHtml(cells)
    
    console.log('初始HTML长度:', content.length);
    return content
  }, []) // 空依赖数组，只在组件挂载时计算一次

  // 简化表格检测
  function isMarkdownTable(text) {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.length >= 2 && 
           lines[0].includes('|') && 
           /^\s*\|?[\s\-:|]+\|?\s*$/.test(lines[1]);
  }

  function parseMarkdownTable(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    
    // 解析表头
    const headers = lines[0].split('|')
      .map(h => h.trim())
      .filter(h => h);
    
    // 解析数据行
    const rows = lines.slice(2).map(line => {
      const cells = line.split('|')
        .map(c => c.trim())
        .filter(c => c);
      // 确保列数一致
      while (cells.length < headers.length) cells.push('');
      return cells.slice(0, headers.length);
    }).filter(row => row.length > 0);
    
    return { headers, rows };
  }

  function createTiptapTable(schema, { headers, rows }) {
    if (!headers.length) return null;
    
    const makeParagraph = (text) => {
      return text ? 
        schema.nodes.paragraph.create(null, schema.text(String(text))) :
        schema.nodes.paragraph.create();
    };

    // 创建表头
    const headerCells = headers.map(h =>
      schema.nodes.tableHeader.create(null, makeParagraph(h))
    );
    const headerRow = schema.nodes.tableRow.create(null, headerCells);

    // 创建数据行
    const bodyRows = (rows.length ? rows : [Array(headers.length).fill('')])
      .map(row => {
        const cells = headers.map((_, i) =>
          schema.nodes.tableCell.create(null, makeParagraph(row[i] || ''))
        );
        return schema.nodes.tableRow.create(null, cells);
      });

    return schema.nodes.table.create(null, [headerRow, ...bodyRows]);
  }

  // 移除复杂的表格扩展，使用简化版本

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用默认的代码块，使用我们的可执行代码块
        codeBlock: false,
        // 禁用默认的heading，我们将使用自定义的heading扩展
        heading: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      
      // 可执行代码块扩展
      CodeBlockExtension,
      
      // AI思考单元格扩展
      ThinkingCellExtension,
      
      // 自定义Heading扩展，保留ID属性
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {},
      }).extend({
        parseHTML() {
          return [
            { tag: 'h1', getAttrs: (node) => ({ level: 1, id: node.getAttribute('id') }) },
            { tag: 'h2', getAttrs: (node) => ({ level: 2, id: node.getAttribute('id') }) },
            { tag: 'h3', getAttrs: (node) => ({ level: 3, id: node.getAttribute('id') }) },
            { tag: 'h4', getAttrs: (node) => ({ level: 4, id: node.getAttribute('id') }) },
            { tag: 'h5', getAttrs: (node) => ({ level: 5, id: node.getAttribute('id') }) },
            { tag: 'h6', getAttrs: (node) => ({ level: 6, id: node.getAttribute('id') }) },
          ]
        },
        renderHTML({ node, HTMLAttributes }) {
          const hasLevel = this.options.levels.includes(node.attrs.level)
          const level = hasLevel ? node.attrs.level : this.options.levels[0]
          
          // 确保ID属性正确传递
          const attrs = { ...HTMLAttributes }
          if (node.attrs.id) {
            attrs.id = node.attrs.id
            console.log('=== Tiptap Heading renderHTML ===');
            console.log('Level:', level);
            console.log('Node attrs:', node.attrs);
            console.log('Final attrs:', attrs);
          }
          
          return [`h${level}`, attrs, 0]
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            id: {
              default: null,
              parseHTML: element => element.getAttribute('id'),
              renderHTML: attributes => {
                if (!attributes.id) {
                  return {}
                }
                return { id: attributes.id }
              },
            },
          }
        },
      }),
      
      // 动态游标样式扩展
      CursorStyleExtension,
      // 结尾始终保留一个段落，并支持点击空白新起一行
      TrailingParagraphExtension,
      ClickBlankToNewLineExtension,
      
      // 图片支持
      ImageExtension,
      
      // LaTeX支持
      LaTeXExtension,

      // 占位符
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      SimpleTableExtension,
    ],
    
    content: initialContent,

    editable: !readOnly,

    onCreate: ({ editor }) => {
      editorRef.current = editor;
      setCurrentEditor(editor);
    },
    
    onUpdate: ({ editor, transaction }) => {
      // 防止循环更新
      if (isInternalUpdate.current) return
      
      // 如果是InputRule创建的代码块：以编辑器解析结果为准，直接覆盖store结构，删除原段落对应的markdown内容
      if (transaction.getMeta('codeBlockInputRule')) {
        console.log('处理InputRule创建的代码块变化');
        const newCodeCellId = transaction.getMeta('newCodeCellId');
        
        // 通过解析 editor state 得到准确的 cells（包含刚刚插入的代码块，且不含原触发行）
        const parsedCells = convertEditorStateToCells();
        
        // 覆盖 store，确保不残留触发文本所在的旧 markdown 段落
        isInternalUpdate.current = true;
        setCells(parsedCells);
        
        // 设置当前活跃 cell 为新代码块
        const { setCurrentCell, setEditingCellId } = useStore.getState();
        if (newCodeCellId && setCurrentCell) {
          setCurrentCell(newCodeCellId);
          setEditingCellId(newCodeCellId);
        }
        
        setTimeout(() => {
          isInternalUpdate.current = false;
          // 聚焦到新代码块的编辑器
          if (newCodeCellId) {
            const codeElement = document.querySelector(`[data-cell-id="${newCodeCellId}"] .cm-editor .cm-content`);
            if (codeElement) {
              (codeElement as HTMLElement).focus();
            }
          }
        }, 50);
        return;
      }
      
      // 检查变化是否发生在特殊块内（代码块或表格）
      const isSpecialBlockChange = transaction.steps.some(step => {
        try {
          const anyStep: any = step as any
          const from = anyStep.from ?? (anyStep.pos ?? undefined)
          const to = anyStep.to ?? (anyStep.pos ?? undefined)
          if (from !== undefined && to !== undefined) {
            const docSize = editor.state.doc.content.size
            const safeFrom = Math.min(from, docSize)
            const safeTo = Math.min(to, docSize)
            const $from = editor.state.doc.resolve(safeFrom)
            const $to = editor.state.doc.resolve(safeTo)

            const isCodeOrTable = (pmPos) => {
              for (let depth = pmPos.depth; depth >= 0; depth--) {
                const node = pmPos.node(depth)
                if (node.type.name === 'executable-code-block' || node.type.name === 'table') return true
              }
              return false
            }

            if (isCodeOrTable($from) || isCodeOrTable($to)) return true
          }
          return false
        } catch (e) {
          console.warn('Error checking special block change:', e)
          return false
        }
      })
      
      // 如果变化发生在特殊块内，不进行同步
      if (isSpecialBlockChange) {
        return
      }
      
      // 检查是否是格式化操作（如粗体、斜体等）
      const isFormattingOperation = transaction.steps.some(step => 
        step.jsonID === 'addMark' || 
        step.jsonID === 'removeMark' ||
        step.jsonID === 'setNodeMarkup'
      )
      
      // 优化防抖时间：仅格式化操作使用较短延迟，内容编辑使用更长延迟减少性能开销
      const debounceTime = isFormattingOperation ? 50 : 150
      
      // 使用防抖延迟同步，避免频繁更新
      clearTimeout(window.tiptapSyncTimeout)
      window.tiptapSyncTimeout = setTimeout(() => {
        const newCells = convertEditorStateToCells()
        
        // 优化比较逻辑：减少不必要的深度比较
        const structuralChange = newCells.length !== cells.length ||
          newCells.some((newCell, index) => {
            const existingCell = cells[index];
            return !existingCell || newCell.type !== existingCell.type || newCell.id !== existingCell.id;
          });

        // 收集仅 Markdown 内容变化的单元格
        const markdownDiffs: Array<{ id: string; content: string }> = [];
        newCells.forEach((newCell, index) => {
          if (newCell.type === 'markdown') {
            const existingCell = cells[index];
            if (existingCell && existingCell.type === 'markdown' && newCell.content !== existingCell.content) {
              markdownDiffs.push({ id: existingCell.id, content: newCell.content as string });
            }
          }
        });
        
        if (structuralChange) {
          isInternalUpdate.current = true
          
          console.log('=== TiptapNotebookEditor 结构变化 Debug Info ===');
          console.log('原有cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          console.log('新解析cells:', newCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          
          // 智能合并：保持现有代码块完整性，只更新markdown内容
          const storeState = useStore.getState();
          const currentCells = storeState.cells;
          const mergedCells = newCells.map((newCell, index) => {
            if (newCell.type === 'code') {
              // For code cells always keep existing store data
              const existingCodeCell = currentCells.find(cell => 
                cell.type === 'code' && cell.id === newCell.id
              );
              if (existingCodeCell) {
                console.log(`Code cell at ${index}: keep existing ${existingCodeCell.id}`);
                return existingCodeCell; // Keep code cell intact
              } else {
                console.log(`Code cell at ${index}: new code cell ${newCell.id}`);
                return newCell; // 新的代码块
              }
            } else if (newCell.type === 'markdown') {
              // Reuse existing markdown cell id/metadata when possible to keep store in sync
              const existingMarkdownCell = currentCells[index];
              if (existingMarkdownCell && existingMarkdownCell.type === 'markdown') {
                return {
                  ...existingMarkdownCell,
                  content: newCell.content, // update content only
                };
              }
              return newCell;
            } else {
              // Keep other cell types as is - 重要：保持其他特殊cell类型的处理
              const existingSpecialCell = currentCells.find(cell => cell.id === newCell.id);
              return existingSpecialCell || newCell;
            }
          });
          
          console.log('合并后cells:', mergedCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          console.log('===============================================');
          
          setCells(mergedCells)
          setTimeout(() => {
            isInternalUpdate.current = false
          }, 50)
        } else if (markdownDiffs.length > 0) {
          // 仅 Markdown 内容变更，无结构变化
          isInternalUpdate.current = true;
          const storeStateNow = useStore.getState();
          markdownDiffs.forEach(({ id, content }) => {
            storeStateNow.updateCell(id, content);
          });
          setTimeout(() => {
            isInternalUpdate.current = false;
          }, 10);
        }
      }, debounceTime)
    },
    
    editorProps: {
      attributes: {
        class: `tiptap-notebook-editor markdown-cell prose max-w-none focus:outline-none ${className}`,
        style: 'min-height: 120px; padding: 16px; transition: all 0.2s ease;',
        spellcheck: 'false',
      },
      // 优化编辑器性能
      handleKeyDown: (view, event) => {
        // 减少不必要的事件冒泡和处理
        if (event.key === 'Tab') {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    
    immediatelyRender: false,
  })

  // 暴露编辑器API - 针对混合笔记本的增强API
  useImperativeHandle(ref, () => ({
    editor,
    focus: () => editor?.commands.focus(),
    getHTML: () => editor?.getHTML(),
    setContent: (content) => editor?.commands.setContent(content, false),
    clearContent: () => editor?.commands.clearContent(),
    isEmpty: () => editor?.isEmpty,
    // 混合笔记本特有的方法
    getCells: () => cells,
    setCells: (newCells) => setCells(newCells),
    addCodeCell: () => {
      const newCell = {
        id: generateCellId(),
        type: 'code',
        content: '',
        outputs: [],
        enableEdit: true,
        language: 'python',
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
    addMarkdownCell: () => {
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: '',
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
    addHybridCell: () => {
      const newCell = {
        id: generateCellId(),
        type: 'Hybrid',
        content: '',
        outputs: [],
        enableEdit: true,
        language: 'python',
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
    addAIThinkingCell: (props = {}) => {
      const newCell = {
        id: generateCellId(),
        type: 'thinking',
        content: '',
        outputs: [],
        enableEdit: false,
        agentName: props.agentName || 'AI',
        customText: props.customText || null,
        textArray: props.textArray || [],
        useWorkflowThinking: props.useWorkflowThinking || false,
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
  }), [editor, cells, setCells])

  // 插入代码块的功能
  const insertCodeBlock = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertExecutableCodeBlock({
        language: 'python',
        code: '',
        cellId: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        outputs: [],
        enableEdit: true,
      }).run()
    }
  }, [editor])

  // 插入AI思考单元格的功能
  const insertThinkingCell = useCallback((props = {}) => {
    if (editor) {
      editor.chain().focus().insertThinkingCell({
        cellId: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentName: props.agentName || 'AI',
        customText: props.customText || null,
        textArray: props.textArray || [],
        useWorkflowThinking: props.useWorkflowThinking || false,
      }).run()
    }
  }, [editor])

  // 插入图片的功能
  const insertImage = useCallback(() => {
    if (editor) {
      editor.chain().focus().setImage({}).run()
    }
  }, [editor])

  // 插入LaTeX的功能
  const insertLaTeX = useCallback(() => {
    if (editor) {
      editor.chain().focus().setLaTeX({
        latex: '',
        displayMode: true // 默认为块级模式
      }).run()
    }
  }, [editor])

  // 同步外部cells变化到编辑器 - 只处理必须同步到tiptap的变化
  useEffect(() => {
    if (editor && cells && !isInternalUpdate.current) {
      const lastCells = lastCellsRef.current
      
      // 完整的更新检查：确保所有cell类型都能正确处理
      const needsTiptapUpdate = cells.length !== lastCells.length ||
        cells.some((cell, index) => {
          const lastCell = lastCells[index]
          if (!lastCell) return true // 新增cell

          // ID变化（顺序变化）
          if (cell.id !== lastCell.id) return true

          // 类型变化
          if (cell.type !== lastCell.type) return true

          // markdown cell的内容变化需要更新tiptap
          if (cell.type === 'markdown' && cell.content !== lastCell.content) return true
          
          // image cell的内容或metadata变化也需要更新tiptap
          if (cell.type === 'image') {
            if (cell.content !== lastCell.content) return true
            // 检查metadata变化（特别是生成状态）
            if (JSON.stringify(cell.metadata || {}) !== JSON.stringify(lastCell.metadata || {})) return true
          }

          // thinking cell 的字段变化也需要更新（agentName/customText/textArray/useWorkflowThinking）
          if (cell.type === 'thinking') {
            const fieldsChanged = (
              (cell as any).agentName !== (lastCell as any).agentName ||
              (cell as any).customText !== (lastCell as any).customText ||
              JSON.stringify((cell as any).textArray || []) !== JSON.stringify((lastCell as any).textArray || []) ||
              (cell as any).useWorkflowThinking !== (lastCell as any).useWorkflowThinking
            )
            if (fieldsChanged) return true
          }
          
          // code cell 和其他 cell 类型的内容和输出变化也需要同步到 tiptap
          if (cell.type === 'code' || cell.type === 'Hybrid') {
            // 检查代码内容变化
            if (cell.content !== lastCell.content) return true
            // 检查输出变化
            if (JSON.stringify(cell.outputs || []) !== JSON.stringify(lastCell.outputs || [])) return true
            // 检查其他属性变化
            if (cell.language !== (lastCell as any).language) return true
          }
          
          // 其他任何类型的 cell 变化都需要同步
          return false
        })
      
      // 额外检查：如果是由InputRule触发的cells变化，跳过tiptap更新
      const hasNewCodeBlock = cells.some(cell => 
        cell.type === 'code' && !lastCells.find(lastCell => lastCell.id === cell.id)
      )
      
      if (hasNewCodeBlock) {
        console.log('检测到新代码块，跳过tiptap更新以避免冲突');
        lastCellsRef.current = cells; // 仍然更新缓存
        return;
      }
      
      if (needsTiptapUpdate) {
        console.log('=== 外部cells变化，需要更新tiptap ===');
        console.log('原有cells:', lastCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
        console.log('新的cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
        
        isInternalUpdate.current = true
        const expectedHtml = convertCellsToHtml(cells)
        
        // 使用 setTimeout 将 setContent 延迟到下一个事件循环，避免 flushSync 警告
        setTimeout(() => {
          editor.commands.setContent(expectedHtml, false)
        }, 0)
        
        setTimeout(() => {
          isInternalUpdate.current = false
        }, 50) // 统一使用50ms延迟
        
        // 更新缓存
        lastCellsRef.current = cells
        
        console.log('=== tiptap内容已更新 ===');
      }
    }
  }, [cells, editor])

  // 强化：针对 thinking cell 的快速同步（即使未触发结构变化判断）
  const thinkingSignature = useMemo(() => {
    try {
      return JSON.stringify(
        (cells || [])
          .filter((c: any) => c.type === 'thinking')
          .map((c: any) => ({
            id: c.id,
            agentName: c.agentName || '',
            customText: c.customText || '',
            textArray: Array.isArray(c.textArray) ? c.textArray : [],
            useWorkflowThinking: !!c.useWorkflowThinking,
          }))
      )
    } catch {
      return 'thinking-signature-error'
    }
  }, [cells])

  const lastThinkingSignatureRef = useRef<string>('')

  useEffect(() => {
    if (!editor) return
    if (isInternalUpdate.current) return

    if (thinkingSignature && thinkingSignature !== lastThinkingSignatureRef.current) {
      // 强制仅基于thinking变化进行轻量刷新
      isInternalUpdate.current = true
      const expectedHtml = convertCellsToHtml(cells)
      setTimeout(() => {
        editor.commands.setContent(expectedHtml, false)
        lastThinkingSignatureRef.current = thinkingSignature
        setTimeout(() => {
          isInternalUpdate.current = false
        }, 30)
      }, 0)
    }
  }, [thinkingSignature, editor, cells])

  /**
   * 将cells数组转换为HTML内容
   */
  function convertCellsToHtml(cells) {
    if (!cells || cells.length === 0) {
      return '<p></p>' // 空内容
    }

    console.log('=== convertCellsToHtml 转换 ===');
    console.log('输入cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));

    const htmlParts = cells.map((cell, index) => {
      if (cell.type === 'code' || cell.type === 'Hybrid') {
        // code和Hybrid cell转换为可执行代码块，确保包含正确的ID和位置信息
        console.log(`转换代码块 ${index}: ID=${cell.id}, type=${cell.type}`);
        return `<div data-type="executable-code-block" data-language="${cell.language || 'python'}" data-code="${encodeURIComponent(cell.content || '')}" data-cell-id="${cell.id}" data-outputs="${encodeURIComponent(JSON.stringify(cell.outputs || []))}" data-enable-edit="${cell.enableEdit !== false}" data-original-type="${cell.type}"></div>`
      } else if (cell.type === 'markdown') {
        // markdown cell转换为HTML
        return convertMarkdownToHtml(cell.content || '', cell)
      } else if (cell.type === 'image') {
        // image cell转换为HTML - 包含cellId和metadata信息
        console.log(`转换图片单元格 ${index}: ID=${cell.id}`);
        const metadata = cell.metadata || {};
        
        // 解析 markdown 以提取 src 和 alt
        const markdownContent = cell.content || '';
        const markdownMatch = markdownContent.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        const parsedSrc = markdownMatch ? markdownMatch[2] : '';
        const parsedAlt = markdownMatch ? markdownMatch[1] : 'Cell image';
        
        console.log(`📝 解析图片markdown:`, {
          original: markdownContent,
          src: parsedSrc,
          alt: parsedAlt
        });
        
        return `<div data-type="markdown-image" data-cell-id="${cell.id}" data-src="${parsedSrc}" data-alt="${parsedAlt}" data-markdown="${markdownContent}" data-is-generating="${metadata.isGenerating || false}" data-generation-type="${metadata.generationType || ''}" data-generation-prompt="${metadata.prompt || ''}" data-generation-params="${encodeURIComponent(JSON.stringify(metadata.generationParams || {}))}" data-generation-start-time="${metadata.generationStartTime || ''}" data-generation-error="${metadata.generationError || ''}" data-generation-status="${metadata.generationStatus || ''}"></div>`
      } else if (cell.type === 'thinking') {
        // thinking cell转换为HTML
        console.log(`转换AI思考单元格 ${index}: ID=${cell.id}`);
        return `<div data-type="thinking-cell" data-cell-id="${cell.id}" data-agent-name="${cell.agentName || 'AI'}" data-custom-text="${encodeURIComponent(cell.customText || '')}" data-text-array="${encodeURIComponent(JSON.stringify(cell.textArray || []))}" data-use-workflow-thinking="${cell.useWorkflowThinking || false}"></div>`
      }
      return ''
    })

    const result = htmlParts.join('\n')
    console.log('=== convertCellsToHtml 完成 ===');
    return result
  }

  /**
   * 将HTML内容转换为cells数组 - 只处理markdown内容，保持现有code cell
   */
  // Helper function to convert HTML table to markdown
  function convertTableToMarkdown(tableNode) {
    const rows = [];
    Array.from(tableNode.querySelectorAll('tr')).forEach(tr => {
      const rowMarkdown = '| ' + Array.from(tr.querySelectorAll('td, th')).map(cell => {
        return cell.textContent.trim();
      }).join(' | ') + ' |';
      rows.push(rowMarkdown);
    });
    if (rows.length === 0) return '';
    const colCount = rows[0].split('|').length - 2;
    const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
    rows.splice(1, 0, separator);
    return rows.join('\n');
  }

  // 新方案：使用 ProseMirror JSON 而不是 HTML 解析
  function convertEditorStateToCells() {
    if (!editor) {
      return []
    }

    try {
      const docJson = editor.state.doc.toJSON()
      console.log('📋 Editor JSON:', docJson)
      
      if (!docJson.content || docJson.content.length === 0) {
        return []
      }

      const newCells = []
      let currentMarkdownContent = []

      const flushMarkdownContent = () => {
        if (currentMarkdownContent.length > 0) {
          const markdownText = currentMarkdownContent.join('\n').trim()
          if (markdownText) {
            // 检查是否是重复的标题内容
            const isDuplicateTitle = markdownText.startsWith('#') && 
              newCells.some(cell => cell.type === 'markdown' && cell.content.trim() === markdownText.trim())
            
            if (!isDuplicateTitle) {
              newCells.push({
                id: generateCellId(),
                type: 'markdown',
                content: markdownText,
                outputs: [],
                enableEdit: true,
              })
            } else {
              console.log('🚫 跳过重复的标题内容:', markdownText.substring(0, 30))
            }
          }
          currentMarkdownContent = []
        }
      }

      docJson.content.forEach((node, idx) => {
        console.log(`🔍 处理节点 ${idx}:`, { type: node.type, attrs: node.attrs })
        
        if (node.type === 'markdownImage') {
          // 处理图片节点 - 先清空累积的markdown内容
          flushMarkdownContent()
          
          const attrs = node.attrs || {}
          const cellId = attrs.cellId || generateCellId()
          const markdown = attrs.markdown || ''
          
          console.log(`✅ 发现 markdownImage 节点: ${cellId}, content: ${markdown.substring(0, 50)}`)
          
          // 创建独立的image cell
          newCells.push({
            id: cellId,
            type: 'image',
            content: markdown,
            outputs: [],
            enableEdit: true,
            metadata: {
              isGenerating: attrs.isGenerating || false,
              generationType: attrs.generationType || '',
              prompt: attrs.prompt || '',
              generationStartTime: attrs.generationStartTime,
              generationError: attrs.generationError,
              generationStatus: attrs.generationStatus,
              generationParams: attrs.generationParams || {}
            }
          })
        } else if (node.type === 'executableCodeBlock') {
          // 处理代码块
          flushMarkdownContent();
          const attrs = node.attrs || {};
          const cellId = attrs.cellId || generateCellId();
          // 解码代码内容及输出
          let codeContent = '';
          if (attrs.code) {
            try {
              codeContent = decodeURIComponent(attrs.code);
            } catch {
              codeContent = attrs.code;
            }
          }
          let outputsParsed: any[] = [];
          if (attrs.outputs) {
            try {
              outputsParsed = JSON.parse(decodeURIComponent(attrs.outputs));
            } catch {
              try {
                outputsParsed = JSON.parse(attrs.outputs);
              } catch {
                // ignore parse error
              }
            }
          }
          newCells.push({
            id: cellId,
            type: attrs.originalType || 'code',
            language: attrs.language || 'python',
            content: codeContent,
            outputs: outputsParsed,
            enableEdit: attrs.enableEdit !== false,
          });
        } else if (node.type === 'thinkingCell') {
          // 处理AI思考单元格
          flushMarkdownContent()
          
          const attrs = node.attrs || {}
          const cellId = attrs.cellId || generateCellId()
          
          newCells.push({
            id: cellId,
            type: 'thinking',
            content: '',
            outputs: [],
            enableEdit: false,
            agentName: attrs.agentName || 'AI',
            customText: attrs.customText || null,
            textArray: attrs.textArray || [],
            useWorkflowThinking: attrs.useWorkflowThinking || false,
          })
        } else if (node.type === 'heading') {
          // Treat headings as independent markdown cells (#, ## ...)
          flushMarkdownContent();
          const level = (node.attrs && node.attrs.level) ? node.attrs.level : 1;
          const headingText = extractTextFromNode(node).trim();
          if (headingText) {
            const markdownHeading = `${'#'.repeat(level)} ${headingText}`;
            newCells.push({
              id: generateCellId(),
              type: 'markdown',
              content: markdownHeading,
              outputs: [],
              enableEdit: true,
            });
          }
        } else {
          // 其他节点（paragraph, text 等）作为 markdown 处理
          const textContent = extractTextFromNode(node)
          if (textContent.trim()) {
            currentMarkdownContent.push(textContent)
          }
        }
      })

      // 处理剩余的markdown内容
      flushMarkdownContent()

      console.log('📋 转换结果:', newCells.map(c => ({ id: c.id, type: c.type, contentLength: c.content?.length })))
      return newCells
      
    } catch (error) {
      console.error('❌ JSON 解析失败，回退到 HTML 解析:', error)
      return convertHtmlToCells_fallback()
    }
  }

  // 提取节点文本内容的辅助函数
  // 将 ProseMirror 节点转换为 Markdown 文本（保留常见格式）
  function extractTextFromNode(node, parentType = null): string {
    // 处理纯文本并考虑 marks（bold / italic / code）
    if (node.text !== undefined) {
      let text = node.text as string;
      if (Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              text = `**${text}**`;
              break;
            case 'italic':
              text = `*${text}*`;
              break;
            case 'code':
              text = `\`${text}\``;
              break;
            default:
              break;
          }
        });
      }
      return text;
    }

    // 处理不同类型节点
    switch (node.type) {
      case 'paragraph':
        if (node.content && Array.isArray(node.content)) {
          return node.content.map((child: any) => extractTextFromNode(child)).join('');
        }
        return '';

      case 'blockquote': {
        // 每一行前缀 '> '
        const inner = (node.content || []).map((child: any) => extractTextFromNode(child)).join('');
        // 确保换行
        return `> ${inner}\n`;
      }

      case 'bulletList': {
        return (node.content || [])
          .map((li: any) => extractTextFromNode(li, 'bullet'))
          .join('');
      }

      case 'orderedList': {
        let counter = 1;
        return (node.content || [])
          .map((li: any) => {
            const line = extractTextFromNode(li, 'ordered');
            const prefix = `${counter++}. `;
            return line.replace(/^-/,'').replace(/^\s*/, prefix);
          })
          .join('');
      }

      case 'listItem': {
        const inner = (node.content || [])
          .map((child: any) => extractTextFromNode(child))
          .join('');
        const prefix = parentType === 'ordered' ? '- ' : '- ';
        return `${prefix}${inner}\n`;
      }

      case 'hardBreak':
        return '\n';

      case 'text':
        return node.text || '';

      default: {
        // 递归子节点
        if (node.content && Array.isArray(node.content)) {
          return node.content.map((child: any) => extractTextFromNode(child)).join('');
        }
        return '';
      }
    }
  }

  // 备用的 HTML 解析方案
  function convertHtmlToCells_fallback() {
    const html = editor?.getHTML() || ''
    if (!html || html === '<p></p>') {
      return []
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const newCells = []
    let currentMarkdownContent = []

    // Helper function to flush accumulated content
    const flushMarkdownContent = () => {
      if (currentMarkdownContent.length > 0) {
        const markdownText = currentMarkdownContent.join('\n').trim()
        if (markdownText) {
          const convertedMarkdown = convertHtmlToMarkdown(markdownText)
          
          // 检查是否是重复的标题内容
          const isDuplicateTitle = convertedMarkdown.startsWith('#') && 
            newCells.some(cell => cell.type === 'markdown' && cell.content.trim() === convertedMarkdown.trim())
          
          if (!isDuplicateTitle) {
            newCells.push({
              id: generateCellId(),
              type: 'markdown',
              content: convertedMarkdown,
              outputs: [],
              enableEdit: true,
            })
          } else {
            console.log('🚫 跳过重复的标题内容 (HTML):', convertedMarkdown.substring(0, 30))
          }
        }
        currentMarkdownContent = []
      }
    }

    // Check if an element is a heading
    const isHeading = (element) => {
      return element.tagName && /^H[1-6]$/.test(element.tagName.toUpperCase())
    }

    // 遍历所有节点
    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // 调试：检查每个元素的 data-type 属性
        const dataType = node.getAttribute('data-type');
        const datasetType = (node as any).dataset?.type;
        const datasetMarkdownImage = (node as any).dataset?.markdownImage;
        console.log('🔍 解析节点:', {
          tagName: node.tagName,
          'getAttribute(data-type)': dataType,
          'dataset.type': datasetType,
          'dataset.markdownImage': datasetMarkdownImage,
          outerHTML: node.outerHTML?.substring(0, 100)
        });
        
        if (node.getAttribute('data-type') === 'executable-code-block') {
          // 如果有累积的markdown内容，先创建markdown cell
          flushMarkdownContent()

          // 对于代码块，记录位置占位符
          const cellId = node.getAttribute('data-cell-id')
          const language = node.getAttribute('data-language') || 'python'
          const code = node.getAttribute('data-code') || ''
          const originalType = node.getAttribute('data-original-type') || 'code'
          
          console.log(`发现代码块: ${cellId}, 语言: ${language}, 原始类型: ${originalType}`);
          
          newCells.push({
            id: cellId,
            type: originalType, // 直接使用保存的原始类型
            language: language,
            // 不再使用isPlaceholder标记，直接使用id匹配
          })
        } else if (node.getAttribute('data-type') === 'latex-block') {
          // 处理LaTeX节点
          flushMarkdownContent()
          
          console.log('发现LaTeX节点:', node);
          
          // LaTeX节点直接累积到markdown内容中，保持原始格式
          const latex = node.getAttribute('data-latex') || ''
          const displayMode = node.getAttribute('data-display-mode') === 'true'
          
          if (latex) {
            const latexMarkdown = displayMode ? `$$${latex}$$` : `$${latex}$`
            currentMarkdownContent.push(latexMarkdown)
          }
        } else if (node.getAttribute('data-type') === 'thinking-cell') {
          // 处理AI思考单元格
          flushMarkdownContent()
          
          const cellId = node.getAttribute('data-cell-id')
          const agentName = node.getAttribute('data-agent-name') || 'AI'
          const customText = node.getAttribute('data-custom-text') || ''
          const textArray = node.getAttribute('data-text-array') || '[]'
          const useWorkflowThinking = node.getAttribute('data-use-workflow-thinking') === 'true'
          
          console.log(`发现AI思考单元格: ${cellId}, 代理: ${agentName}`);
          
          newCells.push({
            id: cellId,
            type: 'thinking',
            content: '',
            outputs: [],
            enableEdit: false,
            agentName: agentName,
            customText: customText ? decodeURIComponent(customText) : null,
            textArray: JSON.parse(decodeURIComponent(textArray)),
            useWorkflowThinking: useWorkflowThinking,
          })
        } else if (node.getAttribute('data-type') === 'markdown-image') {
          // 处理图片节点 - 先清空累积的markdown内容，创建独立的image cell
          flushMarkdownContent()
          
          console.log('发现图片节点:', node);
          
          // 获取cellId和基本属性
          const cellId = node.getAttribute('data-cell-id') || generateCellId()
          const src = node.getAttribute('data-src') || ''
          const alt = node.getAttribute('data-alt') || ''
          const markdown = node.getAttribute('data-markdown') || ''
          
          // 获取生成相关的metadata
          const isGenerating = node.getAttribute('data-is-generating') === 'true'
          const generationType = node.getAttribute('data-generation-type') || ''
          const generationPrompt = node.getAttribute('data-generation-prompt') || ''
          const generationStartTime = node.getAttribute('data-generation-start-time') || ''
          const generationError = node.getAttribute('data-generation-error') || ''
          const generationStatus = node.getAttribute('data-generation-status') || ''
          
          // 解析生成参数
          let generationParams = {}
          try {
            const paramsStr = node.getAttribute('data-generation-params') || '{}'
            generationParams = JSON.parse(decodeURIComponent(paramsStr))
          } catch (e) {
            console.warn('解析生成参数失败:', e)
          }
          
          // 如果有markdown属性，直接使用；否则构造markdown格式
          const imageMarkdown = markdown || (src ? `![${alt}](${src})` : '')
          
          console.log(`✅ 创建独立的image cell: ${cellId}, content: ${imageMarkdown.substring(0, 50)}`)
          
          // 创建独立的image cell，保留原有的cellId和metadata
          newCells.push({
            id: cellId,
            type: 'image',
            content: imageMarkdown,
            outputs: [],
            enableEdit: true,
            metadata: {
              isGenerating,
              generationType,
              prompt: generationPrompt,
              generationStartTime: generationStartTime ? parseInt(generationStartTime) : undefined,
              generationError: generationError || undefined,
              generationStatus: generationStatus || undefined,
              generationParams
            }
          })
        } else if (node.tagName && node.tagName.toLowerCase() === 'table') {
          // 处理表格节点
          console.log('发现表格节点:', node);
          
          // 将表格转换为markdown格式
          const tableMarkdown = convertTableToMarkdown(node)
          if (tableMarkdown.trim()) {
            currentMarkdownContent.push(tableMarkdown)
          }
        } else if (isHeading(node)) {
          // 如果是标题，先清空累积的内容，然后为标题创建独立的cell
          flushMarkdownContent()
          
          // 为标题创建独立的markdown cell
          const headingMarkdown = convertHtmlToMarkdown(node.outerHTML)
          if (headingMarkdown.trim()) {
            newCells.push({
              id: generateCellId(),
              type: 'markdown',
              content: headingMarkdown,
              outputs: [],
              enableEdit: true,
            })
          }
        } else {
          // 普通HTML内容，累积到markdown内容中
          currentMarkdownContent.push(node.outerHTML)
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        // 文本节点
        currentMarkdownContent.push(node.textContent)
      }
    })

    // 处理剩余的markdown内容
    flushMarkdownContent()

    return newCells
  }

  /**
   * Markdown到HTML转换 - 支持格式化标记、LaTeX和图片
   */
  function convertMarkdownToHtml(markdown, cell = null) {
    if (!markdown) return '<p></p>'
    
    // 处理LaTeX语法 - 分步骤处理避免嵌套问题
    let processedText = markdown
    const latexNodes = []
    let latexCounter = 0
    
    // 处理图片语法 - 先处理图片，避免与其他格式冲突
    const imageNodes = []
    let imageCounter = 0
    
    // 提取并替换markdown图片语法
    processedText = processedText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      const placeholder = `__IMAGE_${imageCounter}__`
      imageNodes[imageCounter] = `<div data-type="markdown-image" data-src="${src.trim()}" data-alt="${alt.trim()}" data-title="${alt.trim()}" data-markdown="${match}"></div>`
      console.log('提取图片:', { alt: alt.trim(), src: src.trim(), markdown: match })
      imageCounter++
      return placeholder
    })
    
    // 按行处理，判断LaTeX是否独占一行
    const lines = processedText.split('\n')
    const processedLines = lines.map(line => {
      let processedLine = line
      
      // 检查是否整行只有一个LaTeX公式（可能有前后空格）
      const blockLatexMatch = line.trim().match(/^\$\$([^$]+)\$\$$/)
      if (blockLatexMatch) {
        const placeholder = `__LATEX_BLOCK_${latexCounter}__`
        latexNodes[latexCounter] = `<div data-type="latex-block" data-latex="${blockLatexMatch[1].trim()}" data-display-mode="true"></div>`
        console.log('提取独占行的块级LaTeX:', blockLatexMatch[1].trim())
        latexCounter++
        return placeholder
      }
      
      const inlineBlockLatexMatch = line.trim().match(/^\$([^$]+)\$$/)
      if (inlineBlockLatexMatch) {
        const placeholder = `__LATEX_BLOCK_${latexCounter}__`
        latexNodes[latexCounter] = `<div data-type="latex-block" data-latex="${inlineBlockLatexMatch[1].trim()}" data-display-mode="true"></div>`
        console.log('提取独占行的行内LaTeX（显示为块级）:', inlineBlockLatexMatch[1].trim())
        latexCounter++
        return placeholder
      }
      
      // 处理行内的LaTeX（$$...$$格式但不独占行）
      processedLine = processedLine.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
        const placeholder = `__LATEX_INLINE_${latexCounter}__`
        latexNodes[latexCounter] = `<div data-type="latex-block" data-latex="${formula.trim()}" data-display-mode="false"></div>`
        console.log('提取行内的$$LaTeX:', formula.trim())
        latexCounter++
        return placeholder
      })
      
      // 处理行内的LaTeX（$...$格式）
      processedLine = processedLine.replace(/\$([^$]+)\$/g, (match, formula) => {
        const placeholder = `__LATEX_INLINE_${latexCounter}__`
        latexNodes[latexCounter] = `<div data-type="latex-block" data-latex="${formula.trim()}" data-display-mode="false"></div>`
        console.log('提取行内的$LaTeX:', formula.trim())
        latexCounter++
        return placeholder
      })
      
      return processedLine
    })
    
    processedText = processedLines.join('\n')
    
    // Check if markdown contains table syntax
    const tableLines = processedText.split('\n')
    const tableRegex = /^\s*\|(.+)\|\s*$/
    const separatorRegex = /^\s*\|(\s*[-:]+\s*\|)+\s*$/
    
    // Look for table patterns
    for (let i = 0; i < tableLines.length - 1; i++) {
      if (tableRegex.test(tableLines[i]) && separatorRegex.test(tableLines[i + 1])) {
        // Found a table, convert it to HTML
        const tableHtml = convertMarkdownTableToHtml(tableLines, i)
        if (tableHtml) {
          // Replace the table lines with HTML
          const beforeTable = tableLines.slice(0, i).join('\n')
          const afterTable = tableLines.slice(tableHtml.endIndex + 1).join('\n')
          
          let result = ''
          if (beforeTable) result += convertMarkdownToHtml(beforeTable, cell)
          result += tableHtml.html
          if (afterTable) result += convertMarkdownToHtml(afterTable, cell)
          
          return result
        }
      }
    }
    
    // 处理行内格式化
    function processInlineFormatting(text) {
      // 如果是图片占位符，直接返回不处理
      if (text.match(/^__IMAGE_\d+__$/)) {
        return text
      }
      
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 粗体
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // 斜体
        .replace(/`(.*?)`/g, '<code>$1</code>')            // 行内代码
    }
    
    // 按段落分割
    const paragraphs = processedText.split('\n\n')
    
    const htmlParagraphs = paragraphs.map(paragraph => {
      const lines = paragraph.split('\n')
      
      // 处理列表
      if (lines.some(line => line.trim().startsWith('- '))) {
        const listItems = lines
          .filter(line => line.trim().startsWith('- '))
          .map(line => `<li>${processInlineFormatting(line.trim().slice(2))}</li>`)
          .join('')
        return `<ul>${listItems}</ul>`
      }
      
      // 处理单行内容
      if (lines.length === 1) {
        const line = lines[0].trim()
        
        // 检查是否是图片占位符
        if (line.match(/^__IMAGE_\d+__$/)) {
          return line // 直接返回占位符，不做任何处理
        }
        
        // 生成标题ID用于大纲跳转 - H1和H2使用 phaseId（若存在），否则回退到 cell.id
        const generateHeadingId = () => {
          if (cell) {
            // 优先使用 phaseId（与 OutlineSidebar 的 phase.id 对应），否则回退到 cell.id
            if ((cell as any).phaseId) {
              return (cell as any).phaseId;
            }
            if ((cell as any).id) {
              return (cell as any).id;
            }
          }
          return null;
        };
        
        if (line.startsWith('# ')) {
          const text = processInlineFormatting(line.slice(2));
          const id = generateHeadingId();
          return id ? `<h1 id="${id}">${text}</h1>` : `<h1>${text}</h1>`;
        }
        if (line.startsWith('## ')) {
          const text = processInlineFormatting(line.slice(3));
          const id = generateHeadingId();
          return id ? `<h2 id="${id}">${text}</h2>` : `<h2>${text}</h2>`;
        }
        if (line.startsWith('### ')) {
          const text = processInlineFormatting(line.slice(4));
          const id = generateHeadingId();
          return id ? `<h3 id="${id}">${text}</h3>` : `<h3>${text}</h3>`;
        }
        if (line.startsWith('#### ')) {
          const text = processInlineFormatting(line.slice(5));
          const id = generateHeadingId();
          return id ? `<h4 id="${id}">${text}</h4>` : `<h4>${text}</h4>`;
        }
        if (line.startsWith('##### ')) {
          const text = processInlineFormatting(line.slice(6));
          const id = generateHeadingId();
          return id ? `<h5 id="${id}">${text}</h5>` : `<h5>${text}</h5>`;
        }
        if (line.startsWith('###### ')) {
          const text = processInlineFormatting(line.slice(7));
          const id = generateHeadingId();
          return id ? `<h6 id="${id}">${text}</h6>` : `<h6>${text}</h6>`;
        }
        if (line.startsWith('> ')) {
          return `<blockquote>${processInlineFormatting(line.slice(2))}</blockquote>`
        }
        if (line === '') {
          return '<br>'
        }
        return `<p>${processInlineFormatting(line)}</p>`
      }
      
      // 多行段落
      const processedLines = lines.map(line => {
        const trimmedLine = line.trim()
        // 如果整行是图片占位符，单独处理
        if (trimmedLine.match(/^__IMAGE_\d+__$/)) {
          return trimmedLine
        }
        return processInlineFormatting(line)
      }).join('<br>')
      return `<p>${processedLines}</p>`
    })
    
    let result = htmlParagraphs.join('')
    
    // 恢复图片节点占位符
    for (let i = 0; i < imageCounter; i++) {
      result = result.replace(`__IMAGE_${i}__`, imageNodes[i])
    }
    
    // 恢复LaTeX节点占位符
    for (let i = 0; i < latexCounter; i++) {
      result = result.replace(`__LATEX_BLOCK_${i}__`, latexNodes[i])
      result = result.replace(`__LATEX_INLINE_${i}__`, latexNodes[i])
    }
    
    console.log('转换完成，包含LaTeX节点数:', latexCounter, '图片节点数:', imageCounter)
    if (latexCounter > 0) {
      console.log('最终HTML包含LaTeX:', result.includes('data-type="latex-block"'))
    }
    if (imageCounter > 0) {
      console.log('最终HTML包含图片:', result.includes('data-type="markdown-image"'))
    }
    
    return result
  }

  // Helper function to convert markdown table to HTML
  function convertMarkdownTableToHtml(lines, startIndex) {
    const headerLine = lines[startIndex]
    const separatorLine = lines[startIndex + 1]
    
    // Parse header
    const headers = headerLine.split('|')
      .map(h => h.trim())
      .filter(h => h !== '')
    
    // Find data rows
    const rows = []
    let endIndex = startIndex + 1
    
    for (let i = startIndex + 2; i < lines.length; i++) {
      if (/^\s*\|(.+)\|\s*$/.test(lines[i])) {
        const cells = lines[i].split('|')
          .map(c => c.trim())
          .filter(c => c !== '')
        rows.push(cells)
        endIndex = i
      } else {
        break
      }
    }
    
    // Generate HTML
    let html = '<table>'
    
    // Header row
    html += '<tr>'
    headers.forEach(h => {
      html += `<th>${h}</th>`
    })
    html += '</tr>'
    
    // Data rows
    rows.forEach(row => {
      html += '<tr>'
      row.forEach(cell => {
        html += `<td>${cell}</td>`
      })
      html += '</tr>'
    })
    
    html += '</table>'
    
    return { html, endIndex }
  }

  /**
   * HTML到Markdown转换 - 支持格式化标记
   */
  function convertHtmlToMarkdown(html) {
    if (!html) return ''
    
    // 使用DOM解析，递归处理所有格式化
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const children = Array.from(node.childNodes).map(processNode).join('')
        
        switch (node.tagName.toLowerCase()) {
          case 'h1':
            return `# ${children}`
          case 'h2':
            return `## ${children}`
          case 'h3':
            return `### ${children}`
          case 'h4':
            return `#### ${children}`
          case 'h5':
            return `##### ${children}`
          case 'h6':
            return `###### ${children}`
          case 'strong':
          case 'b':
            return `**${children}**`
          case 'em':
          case 'i':
            return `*${children}*`
          case 'code':
            return `\`${children}\``
          case 'blockquote':
            return `> ${children}`
          case 'li':
            return `- ${children}`
          case 'ul':
            return children
          case 'ol':
            return children
          case 'p':
            return children
          case 'br':
            return '\n'
          case 'table':
            const rows = [];
            Array.from(node.querySelectorAll('tr')).forEach(tr => {
              const rowMarkdown = '| ' + Array.from(tr.querySelectorAll('td, th')).map(cell => {
                return processNode(cell).trim();
              }).join(' | ') + ' |';
              rows.push(rowMarkdown);
            });
            if (rows.length === 0) return '';
            const colCount = rows[0].split('|').length - 2;
            const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
            rows.splice(1, 0, separator);
            return rows.join('\n');
          case 'tr':
            return Array.from(node.childNodes).map(processNode).join('');
          case 'td':
          case 'th':
            return Array.from(node.childNodes).map(processNode).join('');
          default:
            return children
        }
      }
      
      return ''
    }
    
    const result = []
    Array.from(doc.body.childNodes).forEach(node => {
      const processed = processNode(node)
      if (processed.trim()) {
        result.push(processed)
      }
    })
    
    return result.join('\n\n')
  }

  /**
   * 生成唯一的cell ID
   */
  function generateCellId() {
    return `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }


  if (!editor) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg flex items-center justify-center" style={{ minHeight: '200px' }}>
        <div className="text-gray-400 text-lg">Loading notebook editor...</div>
      </div>
    )
  }


  return (
    <div className="tiptap-notebook-editor-container w-full h-full bg-transparent">
      {/* 浮动工具栏 - 选中文本时显示 - 已注释 */}
      {/* <div className="bubble-menu-wrapper">
        <div>
          <BubbleMenu 
          editor={editor}
          tippyOptions={{ 
            duration: 100,
            placement: 'top',
            appendTo: document.body,
            interactive: true,
            hideOnClick: true,
          }}
          className="bg-gray-900 text-white rounded-lg shadow-lg p-1 flex items-center gap-1 z-50"
        >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-gray-600' : ''}`}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-gray-600' : ''}`}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('code') ? 'bg-gray-600' : ''}`}
          title="Inline Code"
        >
          <Code size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-600' : ''}`}
          title="Heading 1"
        >
          <Heading1 size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-600' : ''}`}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('bulletList') ? 'bg-gray-600' : ''}`}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('orderedList') ? 'bg-gray-600' : ''}`}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('blockquote') ? 'bg-gray-600' : ''}`}
          title="Quote"
        >
          <Quote size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={insertCodeBlock}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert Code Block"
        >
          <Terminal size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert Table"
        >
          <TableIcon size={14} />
        </button>
        
        <button
          onClick={insertImage}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert Image"
        >
          <ImageIcon size={14} />
        </button>
        
        <button
          onClick={insertLaTeX}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert LaTeX Formula"
        >
          <FunctionIcon size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-600 mx-1" />
        
        <button
          onClick={insertThinkingCell}
          className="p-2 rounded hover:bg-gray-700"
          title="Insert AI Thinking Cell"
        >
          <Brain size={14} />
        </button>
          </BubbleMenu>
        </div>
      </div> */}

      {/* 主编辑器内容 - 使用简化的拖拽管理器 */}
      <SimpleDragManager editor={currentEditor}>
        <EditorContent
          editor={editor}
          className="w-full h-full focus-within:outline-none"
        />
      </SimpleDragManager>

      {/* TipTap快捷指令菜单 */}
      <TipTapSlashCommands
        editor={currentEditor}
        isOpen={slashCommands.isMenuOpen}
        onClose={() => {
          slashCommands.removeSlashText();
          slashCommands.closeMenu();
        }}
        position={slashCommands.menuPosition}
        searchQuery={slashCommands.searchQuery}
        onQueryUpdate={slashCommands.updateSlashQuery}
      />


      {/* 简单的占位符样式 */}
      <style>{`
        .tiptap-notebook-editor .is-editor-empty:first-child::before {
          color: #9CA3AF;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        /* 可执行代码块样式 */
        .executable-code-block-wrapper {
          margin: 1.5em 0;
        }
        
        /* AI思考单元格样式 */
        .thinking-cell-wrapper {
          margin: 1.5em 0;
          position: relative;
          width: 100%;
        }
        
        .thinking-cell-container {
          position: relative;
          width: 100%;
          min-height: 40px;
          padding: 8px 16px;
        }
       
        /* 表格样式 */
        .tiptap-notebook-editor table {
          border-collapse: collapse;
          margin: 1em 0;
          width: 100%;
        }
        
        .tiptap-notebook-editor th,
        .tiptap-notebook-editor td {
          border: 1px solid #ddd;
          padding: 0.5em;
          text-align: left;
        }
        
        .tiptap-notebook-editor th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .tiptap-notebook-editor tr:nth-child(even) {
          background-color: #f9f9f9;
        }

        /* 确保编辑器正常工作 */
        .ProseMirror {
          outline: none !important;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .tiptap-notebook-editor .selectedCell {
          background-color: #e6f3ff;
        }
        
        /* 基于cell类型的游标样式 */
        .tiptap-notebook-editor .ProseMirror {
          caret-color: #1f2937; /* 默认深色游标 */
        }
        
        /* H1标题（默认标题）的游标样式 */
        .tiptap-notebook-editor h1 {
          caret-color: #3b82f6; /* 蓝色游标，在浅色文本上更明显 */
          position: relative;
        }
        
        .tiptap-notebook-editor h1:focus-within {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          border-radius: 4px;
        }
        
        /* H2-H6标题的游标样式 */
        .tiptap-notebook-editor h2 {
          caret-color: #059669;
        }
        
        .tiptap-notebook-editor h3 {
          caret-color: #dc2626;
        }
        
        .tiptap-notebook-editor h4,
        .tiptap-notebook-editor h5,
        .tiptap-notebook-editor h6 {
          caret-color: #7c3aed;
        }
        
        /* 段落的游标样式 */
        .tiptap-notebook-editor p {
          caret-color: #374151;
        }
        
        /* 列表的游标样式 */
        .tiptap-notebook-editor ul li,
        .tiptap-notebook-editor ol li {
          caret-color: #f59e0b;
        }
        
        /* 引用块的游标样式 */
        .tiptap-notebook-editor blockquote {
          caret-color: #6b7280;
        }
        
        /* 代码块的游标样式 */
        .tiptap-notebook-editor code {
          caret-color: #ef4444;
        }
        
        /* 表格的游标样式 */
        .tiptap-notebook-editor table th,
        .tiptap-notebook-editor table td {
          caret-color: #8b5cf6;
        }
        
        /* 图片和LaTeX扩展样式 */
        .image-markdown-wrapper {
          margin: 1rem 0;
        }
        
        .image-editor {
          margin: 0.5rem 0;
        }
        
        .image-display {
          margin: 1rem 0;
          position: relative;
        }
        
        .image-placeholder {
          margin: 1rem 0;
        }
        
        /* LaTeX 扩展样式 */
        .latex-markdown-wrapper {
          margin: 1rem 0;
        }
        
        .latex-editor {
          margin: 0.5rem 0;
        }
        
        .latex-display {
          margin: 1rem 0;
          position: relative;
        }
        
        .latex-placeholder {
          margin: 1rem 0;
        }
        
        .katex-rendered {
          user-select: all;
        }
        
        .katex-display {
          text-align: center;
          margin: 1rem 0;
        }
        
        /* LaTeX 文本颜色修复 */
        .latex-preview .katex-rendered {
          color: inherit !important;
        }
        
        .latex-preview .katex-rendered * {
          color: inherit !important;
        }
        
        .latex-preview .katex {
          color: inherit !important;
        }
        
        .latex-preview .katex .base {
          color: inherit !important;
        }
        
        .latex-preview .katex .mathdefault,
        .latex-preview .katex .mathit,
        .latex-preview .katex .mathrm,
        .latex-preview .katex .mathbf,
        .latex-preview .katex .mathcal,
        .latex-preview .katex .mathfrak,
        .latex-preview .katex .mathscr,
        .latex-preview .katex .mathsf,
        .latex-preview .katex .mathtt {
          color: inherit !important;
        }
        
        /* 恢复原本的可执行代码块样式 */
        .executable-code-block-wrapper {
          margin: 1.5em 0;
        }
        
        /* 移除CodeCell输出中的边框样式 */
        .executable-code-block-wrapper pre {
          border: none !important;
          border-left: none !important;
          border-right: none !important;
          border-top: none !important;
          border-bottom: none !important;
          background: transparent !important;
          padding-left: 0 !important;
          margin: 0 !important;
        }
        
        /* 移除prose样式对CodeCell输出的影响 */
        .executable-code-block-wrapper .output-container pre {
          border: none !important;
          background: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      `}</style>
    </div>
  )
})

TiptapNotebookEditor.displayName = 'TiptapNotebookEditor'

export default TiptapNotebookEditor