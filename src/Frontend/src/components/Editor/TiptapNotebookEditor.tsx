import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { InputRule, Extension as CoreExtension } from '@tiptap/core'
import { CodeBlockExtension } from './extensions/CodeBlockExtension'
import { ThinkingCellExtension } from './extensions/ThinkingCellExtension'
import SimpleTableExtension from './extensions/TableExtension'
import ImageExtension from './extensions/ImageExtension'
import LaTeXExtension from './extensions/LaTeXExtension'
import TipTapSlashCommands from './TipTap/TipTapSlashCommands'
import { useTipTapSlashCommands } from './TipTap/useTipTapSlashCommands'
import SimpleDragManager from './TipTap/BlockManager/SimpleDragManager'
import useStore from '../../store/notebookStore'

import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { Extension } from '@tiptap/react'
import { Plugin, PluginKey, Selection } from 'prosemirror-state'
import Heading from '@tiptap/extension-heading'
import { Cell, CellType } from '../../store/notebookStore'
import { FileAttachmentExtension } from './extensions/FileAttachmentExtension'
import {
  convertMarkdownToHtml,
  convertTableToMarkdown
} from './utils/markdownConverters'
import {
  generateCellId,
  convertCellsToHtml,
  convertEditorStateToCells
} from './utils/cellConverters'


interface TiptapNotebookEditorProps {
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

interface TiptapNotebookEditorRef {
  editor: Editor | null;
  focus: () => void;
  getHTML: () => string;
  setContent: (content: string) => void;
  clearContent: () => void;
  isEmpty: () => boolean;
  // 混合笔记本特有的方法
  getCells: () => Cell[];
  setCells: (cells: Cell[]) => void;
  addCodeCell: () => string;
  addMarkdownCell: () => string;
  addHybridCell: () => string;
  addAIThinkingCell: (props?: Partial<{ agentName: string; customText: string | null; textArray: string[]; useWorkflowThinking: boolean }>) => string;
}

// Debug flag - set to true only when debugging
const DEBUG = false;

const TiptapNotebookEditor = forwardRef<TiptapNotebookEditorRef, TiptapNotebookEditorProps>(
  ({ className = "text-2xl font-bold leading-relaxed", placeholder = "Untitled", readOnly = false }, ref) => {

  const {
    cells,
    setCells,
  } = useStore()

  const editorRef = useRef<Editor | null>(null)
  const [currentEditor, setCurrentEditor] = useState<Editor | null>(null)

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
          appendTransaction: (_transactions, _oldState, newState) => {
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
            handleClick(view, pos, _event) {
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
              } catch (e) {
                // Ignore error silently
              }
              return false
            },
          },
        }),
      ]
    },
  })

  // Obsidian风格 [[wikilink]] 输入规则：自动转为链接
  const WikiLinkInput = CoreExtension.create({
    name: 'wikiLinkInput',
    addInputRules() {
      const find = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;
      function resolveHref(target: string) {
        const t = target.trim();
        if (/^(https?:\/\/|mailto:|file:\/\/)/i.test(t)) return t;
        if (/^(\/|\.\/|\.\.\/)/.test(t)) return t; // 相对/绝对路径（由前端资源或宿主处理）
        return t; // 其他情况按相对路径处理
      }
      return [
        new InputRule({
          find,
          handler: ({ range, match, chain }) => {
            const target = (match?.[1] ?? '').trim();
            const label = (match?.[2] ?? target).trim();
            const href = resolveHref(target);
            chain()
              .deleteRange(range)
              .insertContent(label)
              .setLink({ href })
              .run();
          },
        }),
      ];
    },
  })

  // 防止循环更新的标志
  const isInternalUpdate = useRef<boolean>(false)

  // 缓存上次的cells状态，用于增量更新
  const lastCellsRef = useRef<Cell[]>([])

  // 同步超时计时器
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 初始化lastCellsRef
  useEffect(() => {
    lastCellsRef.current = cells
  }, [])

  // 清理定时器和编辑器资源
  useEffect(() => {
    return () => {
      // 清理定时器
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      // 清理编辑器
      if (editorRef.current) {
        editorRef.current.destroy()
        editorRef.current = null
      }
      // nothing to cleanup for slashCommands
    }
  }, [])

  // Helper functions moved to utils/markdownConverters.ts

  // convertMarkdownToHtml function moved to utils/markdownConverters.ts

  // convertCellsToHtml function moved to utils/cellConverters.ts

  // 初始内容 - 只在组件首次挂载时计算一次，避免与useEffect重复设置
  const initialContent = useMemo(() => {
    if (DEBUG) {
    console.log('=== 计算initialContent（仅首次） ===');
    console.log('初始cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
    }

    const content = convertCellsToHtml(cells)

    if (DEBUG) console.log('初始HTML长度:', content.length);
    return content
  }, []) // 空依赖数组，只在组件挂载时计算一次

  // Unused functions removed to clean up the code

  // 移除复杂的表格扩展，使用简化版本

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),

      // 链接支持：允许 file://、相对路径、mailto 和 http(s)
      Link.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        protocols: [
          'http', 'https', 'mailto',
          { scheme: 'file', optionalSlashes: true },
        ],
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),

      // [[wikilink]] 输入规则扩展
      WikiLinkInput,

      // 可执行代码块扩展
      CodeBlockExtension,

      // AI思考单元格扩展
      ThinkingCellExtension,
      // 文件附件扩展（用 LinkCell 的 UI 统一样式）
      FileAttachmentExtension,

      // 自定义Heading扩展，保留ID属性
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6], HTMLAttributes: {} }).extend({
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
          const attrs = { ...HTMLAttributes }
          if (node.attrs.id) attrs.id = node.attrs.id
          return [`h${level}`, attrs, 0]
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            id: {
              default: null,
              parseHTML: element => element.getAttribute('id'),
              renderHTML: attributes => (attributes.id ? { id: attributes.id } : {}),
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
      Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' }),
      Table.configure({ resizable: true }),
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

    onUpdate: ({ editor }) => {
      if (isInternalUpdate.current) return
      // Check for code block input rule meta
      const isCodeBlockInputRule = false; // transaction?.getMeta('codeBlockInputRule')
      if (isCodeBlockInputRule) {
        if (DEBUG) console.log('处理InputRule创建的代码块变化');
        const newCodeCellId = 'new-code-cell'; // transaction?.getMeta('newCodeCellId');

        // 通过解析 editor state 得到准确的 cells（包含刚刚插入的代码块，且不含原触发行）
        const parsedCells = convertEditorStateToCells(editor);

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
      const isSpecialBlockChange = false;

      // 如果变化发生在特殊块内，不进行同步
      if (isSpecialBlockChange) {
        return
      }

      // 统一防抖时间
      const debounceTime = 150

      // 使用防抖延迟同步，避免频繁更新
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      syncTimeoutRef.current = setTimeout(() => {
        const newCells = convertEditorStateToCells(editor)

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

          if (DEBUG) {
          console.log('=== TiptapNotebookEditor 结构变化 Debug Info ===');
          console.log('原有cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          console.log('新解析cells:', newCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          }

          // 智能合并：保持现有代码块完整性，只更新markdown内容
          const storeState = useStore.getState();
          const currentCells = storeState.cells;
          const mergedCells: Cell[] = newCells.map((newCell, index) => {
            if (newCell.type === 'code') {
              // For code cells always keep existing store data
              const existingCodeCell = currentCells.find((cell: Cell) =>
                cell.type === 'code' && cell.id === newCell.id
              );
              if (existingCodeCell) {
                if (DEBUG) console.log(`Code cell at ${index}: keep existing ${existingCodeCell.id}`);
                return existingCodeCell; // Keep code cell intact
              } else {
                if (DEBUG) console.log(`Code cell at ${index}: new code cell ${newCell.id}`);
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
              const existingSpecialCell = currentCells.find((cell: Cell) => cell.id === newCell.id);
              return existingSpecialCell || newCell;
            }
          });

          if (DEBUG) {
          console.log('合并后cells:', mergedCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
          console.log('===============================================');
          }

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
      handleKeyDown: (_view, event: KeyboardEvent) => {
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
    getHTML: () => editor?.getHTML() || '',
    setContent: (content) => editor?.commands.setContent(content, false),
    clearContent: () => editor?.commands.clearContent(),
    isEmpty: () => !!editor?.isEmpty,
    // 混合笔记本特有的方法
    getCells: () => cells,
    setCells: (newCells: Cell[]) => setCells(newCells),
    addCodeCell: () => {
      const newCell: Cell = {
        id: generateCellId(),
        type: 'code',
        content: '',
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
    addMarkdownCell: () => {
      const newCell: Cell = {
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
      const newCell: Cell = {
        id: generateCellId(),
        type: 'hybrid',
        content: '',
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
    addAIThinkingCell: (_props: Partial<{ agentName: string; customText: string | null; textArray: string[]; useWorkflowThinking: boolean }> = {}) => {
      const newCell: Cell = {
        id: generateCellId(),
        type: 'thinking',
        content: '',
        outputs: [],
        enableEdit: false,
      };
      setCells([...cells, newCell]);
      return newCell.id;
    },
  }), [editor, cells, setCells])

  // Unused insert functions removed to clean up the code

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
          if (cell.type === 'code' || cell.type === 'hybrid') {
            // 检查代码内容变化
            if (cell.content !== lastCell.content) return true
            // 检查输出变化
            if (JSON.stringify(cell.outputs || []) !== JSON.stringify(lastCell.outputs || [])) return true
            // language not part of Cell type here
          }

          // 其他任何类型的 cell 变化都需要同步
          return false
        })

      // 额外检查：如果是由InputRule触发的cells变化，跳过tiptap更新
      const hasNewCodeBlock = cells.some(cell =>
        cell.type === 'code' && !lastCells.find(lastCell => lastCell.id === cell.id)
      )

      if (hasNewCodeBlock) {
        if (DEBUG) console.log('检测到新代码块，跳过tiptap更新以避免冲突');
        lastCellsRef.current = cells; // 仍然更新缓存
        return;
      }

      if (needsTiptapUpdate) {
        if (DEBUG) {
        console.log('=== 外部cells变化，需要更新tiptap ===');
        console.log('原有cells:', lastCells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
        console.log('新的cells:', cells.map((c, i) => ({ index: i, id: c.id, type: c.type })));
        }

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

        if (DEBUG) console.log('=== tiptap内容已更新 ===');
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







  // 拦截编辑器中的链接点击，统一走分屏预览
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const hrefAttr = anchor.getAttribute('href');
    if (!hrefAttr) return;
    e.preventDefault();

    Promise.all([
      import('../../store/notebookStore'),
      import('../../store/previewStore'),
      import('../../services/notebookServices'),
      import('../../config/base_url'),
    ]).then(async ([nbMod, pvMod, _svcMod, cfgMod]) => {
      const useNotebookStore = (nbMod as any).default;
      const usePreviewStore = (pvMod as any).default;
      // const { notebookApiIntegration } = svcMod as any;
      const { Backend_BASE_URL } = cfgMod as any;

      const notebookId = useNotebookStore.getState().notebookId;
      if (!notebookId) return;

      const href = hrefAttr;
      const base = (Backend_BASE_URL as string)?.replace(/\/$/, '');
      let filePath: string | null = null;
      try {
        const pattern = new RegExp(`^${base}/download_file/${notebookId}/(.+)$`);
        const m = href.match(pattern);
        if (m && m[1]) filePath = decodeURIComponent(m[1]);
      } catch {}
      if (!filePath) {
        const relPattern = new RegExp('^(\\.|\\.\\.|[^:/?#]+$|\\.\\/\\.assets\\/|\\.assets\\/)');
        if (relPattern.test(href)) {
          filePath = href.replace(new RegExp('^\\./'), '');
        } else if (!new RegExp('^[a-z]+://', 'i').test(href) && href.indexOf('/') === -1) {
          filePath = href;
        }
      }

      if (!filePath) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      try {
        const fileObj = { name: filePath.split('/').pop() || filePath, path: filePath, type: 'file' } as any;
        await usePreviewStore.getState().previewFile(notebookId, filePath, {
          file: fileObj,
        } as any);
        if (usePreviewStore.getState().previewMode !== 'file') {
          usePreviewStore.getState().changePreviewMode();
        }
      } catch (err: any) {
        if (DEBUG) console.error('TipTap link split preview failed:', err);
        // 兜底：如果 .assets 下不存在，则尝试 notebook 根目录同名文件
        try {
          const baseName = (filePath || href).split('/').pop() || '';
          if (baseName && baseName !== filePath) {
            const fileObj2 = { name: baseName, path: baseName, type: 'file' } as any;
            await usePreviewStore.getState().previewFile(notebookId, baseName, { file: fileObj2 } as any);
            if (usePreviewStore.getState().previewMode !== 'file') {
              usePreviewStore.getState().changePreviewMode();
            }
            return;
          }
        } catch (e) {
          if (DEBUG) console.error('Fallback to root failed:', e);
        }
      }
    });
  }, []);


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
        <div onClick={handleEditorClick} className="w-full h-full">
          <EditorContent
            editor={editor}
            className="w-full h-full focus-within:outline-none"
          />
        </div>
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