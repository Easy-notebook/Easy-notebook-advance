import React, { useCallback, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Trash2, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import useStore, { Cell as StoreCell, OutputItem, CellType } from '../../../store/notebookStore';
import { v4 as uuidv4 } from 'uuid';
import mermaid from 'mermaid';

interface MarkdownCellProps {
  cell: StoreCell;
  disableDefaultTitleStyle?: boolean;
}

interface MermaidDiagramProps {
  chart: string;
}

// ─── 自定义 Mermaid 渲染组件 ──────────────────────────────
const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement).innerHTML = chart;
      mermaid.initialize({ startOnLoad: true });
      mermaid.init(undefined, containerRef.current);
    }
  }, [chart]);
  return <div ref={containerRef} className="mermaid" />;
};

// ─── 自定义 CodeBlock 组件，支持普通代码块和 mermaid 渲染 ─────────────────
interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  if (!inline && match) {
    const lang = match[1];
    if (lang === 'mermaid') {
      return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
    }
    return (
      <pre {...props} className={className}>
        <code>{children}</code>
      </pre>
    );
  } else {
    return <code className={className} {...props}>{children}</code>;
  }
};

// ─── 自定义 MarkdownImage 组件，将图片转换为 Markdown 形式并居中显示 ───────
interface MarkdownImageProps {
  alt?: string;
  src?: string;
  title?: string;
}

const MarkdownImage: React.FC<MarkdownImageProps> = ({ alt, src, title }) => (
  <div style={{ textAlign: 'center' }}>
    <img
      src={src}
      alt={alt}
      title={title}
      style={{ maxWidth: '100%', height: 'auto', display: 'inline-block' }}
    />
  </div>
);

// ─── 优化的表格组件，支持更好的性能和渲染 ───────
interface MarkdownTableProps {
  children: React.ReactNode;
  [key: string]: any;
}

const MarkdownTable: React.FC<MarkdownTableProps> = ({ children, ...props }) => (
  <div className="table-container" style={{ overflowX: 'auto', margin: '1rem 0' }}>
    <table 
      {...props} 
      style={{ 
        borderCollapse: 'collapse', 
        width: '100%', 
        minWidth: '300px' 
      }}
    >
      {children}
    </table>
  </div>
);

// ─── 表格行组件优化 ───────
interface MarkdownTableRowProps {
  children: React.ReactNode;
  [key: string]: any;
}

const MarkdownTableRow: React.FC<MarkdownTableRowProps> = ({ children, ...props }) => (
  <tr {...props}>{children}</tr>
);

// ─── 表格单元格组件优化 ───────
interface MarkdownTableCellProps {
  children: React.ReactNode;
  [key: string]: any;
}

const MarkdownTableCell: React.FC<MarkdownTableCellProps> = ({ children, ...props }) => (
  <td 
    {...props}
    style={{
      padding: '8px 12px',
      border: '1px solid #e2e8f0',
      ...props.style
    }}
  >
    {children}
  </td>
);

// ─── 表格头组件优化 ───────
interface MarkdownTableHeadProps {
  children: React.ReactNode;
  [key: string]: any;
}

const MarkdownTableHead: React.FC<MarkdownTableHeadProps> = ({ children, ...props }) => (
  <th 
    {...props}
    style={{
      padding: '12px',
      border: '1px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      fontWeight: 600,
      ...props.style
    }}
  >
    {children}
  </th>
);

// Markdown syntax highlighting theme to match current design
const markdownHighlighting = HighlightStyle.define([
  // { tag: tags.heading1, fontSize: '1.8rem', fontWeight: '700', color: 'transparent', background: 'linear-gradient(to right, #41B883, #3490DC, #6574CD)' },
  // { tag: tags.heading2, fontSize: '1.3rem', fontWeight: '600', color: '#fff', background: 'linear-gradient(to right, #41B883, #3490DC, #6574CD)' },
  // { tag: tags.heading3, fontSize: '1.2rem', fontWeight: '600', color: 'transparent', background: 'linear-gradient(to right, #41B883, #3490DC, #6574CD)' },
  // { tag: tags.heading4, fontSize: '1.1rem', fontWeight: '500', color: 'transparent', background: 'linear-gradient(to right, #41B883, #3490DC, #6574CD)' },
  // { tag: tags.heading5, fontSize: '1rem', fontWeight: '400', color: '#35495E' },
  // { tag: tags.heading6, fontSize: '0.9rem', fontWeight: '400', color: '#35495E', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700', color: '#41B883' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#41B883' },
  { tag: tags.link, color: '#41B883', textDecoration: 'none', borderBottom: '1.5px solid #41B883' },
  { tag: tags.monospace, 
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', 
    fontSize: '0.875rem', 
    backgroundColor: 'rgba(65, 184, 131, 0.05)', 
    color: '#41B883',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
    fontWeight: '500'
  },
  { tag: tags.quote, 
    borderLeft: '4px solid #41B883', 
    backgroundColor: 'rgba(65, 184, 131, 0.05)', 
    color: '#35495E', 
    fontStyle: 'italic',
    padding: '0.5rem 1rem',
    margin: '1.5rem 0'
  },
  { tag: tags.list, color: '#41B883', fontWeight: 'bold' },
]);

const MarkdownCell: React.FC<MarkdownCellProps> = ({ cell, disableDefaultTitleStyle = false }) => {
  const {
    addCell,
    cells,
    updateCell,
    deleteCell,
    setCurrentCell,
    editingCellId,
    setEditingCellId,
    showButtons,
    setShowButtons,
    viewMode,
  } = useStore();

  const editorRef = useRef<any>(null);
  const isEditing = editingCellId === cell.id;
  const hasContent = cell.content.trim().length > 0;
  const cellShowButtons = showButtons[cell.id] || false;
  const isDefaultTitle = cell.metadata?.isDefaultTitle === true && !disableDefaultTitleStyle;
  
  // 优化的 Markdown 组件配置，包含表格支持
  const markdownComponents = useMemo(() => ({
    code: CodeBlock,
    img: MarkdownImage,
    table: MarkdownTable,
    tr: MarkdownTableRow,
    td: MarkdownTableCell,
    th: MarkdownTableHead,
    a: ({ href = '', children, ...props }: any) => (
      <a
        {...props}
        href={href}
        onClick={(e) => {
          if (!href) return;
          e.preventDefault();
          // Delegate to LinkCell-like split preview
          import('../../../store/previewStore').then(async (mod) => {
            const usePreviewStore = (mod as any).default;
            const useNotebookStore = (await import('../../../store/notebookStore')).default as any;
            const notebookId = useNotebookStore.getState().notebookId;
            if (!notebookId) return;
            const { Backend_BASE_URL } = await import('../../../config/base_url');

            // Normalize file path similar to LinkCell
            const base = (Backend_BASE_URL as any)?.replace(/\/$/, '');
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
              // External link fallback
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
              console.error('Markdown link split preview failed:', err);
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
                console.error('Fallback to root failed:', e);
              }
            }
          });
        }}
      >
        {children}
      </a>
    ),
  }), []) as any;

  // 双击切换编辑模式
  const toggleEditing = useCallback(() => {
    if (!isEditing) {
      setEditingCellId(cell.id);
    } else {
      setEditingCellId(null);
    }
  }, [isEditing, cell.id, setEditingCellId]);

  const isEmptyMarkdownCell = useCallback((content: string) => content.trim() === '', []);

  const createNewMarkdownCell = useCallback(
    (afterIndex: number) => {
      const newCellId = uuidv4();
      const newCell: Partial<StoreCell> = {
        id: newCellId,
        type: 'markdown' as CellType,
        content: '',
        outputs: [] as OutputItem[],
        enableEdit: true,
      };
      addCell(newCell, afterIndex + 1);
      setEditingCellId(newCellId);
      if (editorRef.current) {
        editorRef.current.focus();
      }
      return newCellId;
    },
    [addCell, setEditingCellId]
  );

  const createNewCodeCell = useCallback(
    (content: string, afterIndex: number, codeIdentifier?: string) => {
      const newCellId = uuidv4();
      const newCell: Partial<StoreCell> = {
        id: newCellId,
        type: 'code' as CellType,
        content: content.trim(),
        outputs: [] as OutputItem[],
        enableEdit: true,
        metadata: { ...(cell.metadata || {}), language: codeIdentifier || 'python' },
      };
      addCell(newCell, afterIndex + 1);
      setCurrentCell(newCellId);
      setEditingCellId(null);
      if (editorRef.current) {
        editorRef.current.focus();
        const view = editorRef.current.view;
        if (view) {
          view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight;
        }
      }
      return newCellId;
    },
    [addCell, setEditingCellId, setCurrentCell]
  );

  const handleChange = useCallback(
    (value: string) => {
      const currentIndex = cells.findIndex((c) => c.id === cell.id);
      const lines = value.split('\n');
      // 检测三反引号代码块（例如 ```mermaid ）
      for (let i = lines.length - 1; i >= 0; i--) {
        const currentLine = lines[i];
        if (
          currentLine.startsWith('```') &&
          currentLine.length > 3 &&
          i < lines.length - 1
        ) {
          const beforeBackticks = lines.slice(0, i).join('\n');
          const codeIdentifier = currentLine.slice(3).trim();
          const codeContent = lines.slice(i + 1).join('\n');
          if (isEmptyMarkdownCell(beforeBackticks)) {
            createNewCodeCell(codeContent, currentIndex, codeIdentifier);
            deleteCell(cell.id);
          } else {
            updateCell(cell.id, beforeBackticks.trim());
            createNewCodeCell(codeContent, currentIndex, codeIdentifier);
          }
          return;
        }
      }
      // 如果上一行是 Markdown 标题且当前行为空时，自动创建新 cell
      if (
        lines.length >= 2 &&
        /^#{1,6}\s+.+/.test(lines[lines.length - 2]) &&
        lines[lines.length - 1].trim() === ''
      ) {
        updateCell(cell.id, value);
        createNewMarkdownCell(currentIndex);
        return;
      }
      updateCell(cell.id, value);
    },
    [
      cell.id,
      cells,
      updateCell,
      createNewCodeCell,
      createNewMarkdownCell,
      deleteCell,
      isEmptyMarkdownCell,
    ]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = cells.findIndex((c) => c.id === cell.id);
      if (event.ctrlKey && event.key === 'Enter') {
        toggleEditing();
      } else if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        createNewMarkdownCell(currentIndex);
      } else if (
        event.altKey &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        event.preventDefault();
        const newIndex = event.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex >= 0 && newIndex < cells.length) {
          const targetCell = cells[newIndex];
          setEditingCellId(null);
          setTimeout(() => {
            if (targetCell.type === 'markdown') {
              setEditingCellId(targetCell.id);
              if (editorRef.current) {
                editorRef.current.focus();
              }
            } else if (targetCell.type === 'code') {
              setCurrentCell(targetCell.id);
            }
          }, 0);
        }
      }
    },
    [cell.id, cells, toggleEditing, createNewMarkdownCell, setEditingCellId, setCurrentCell]
  );

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isEditing]);

  const handleCreateEditor = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const handleBlur = useCallback(() => {
    if (isEditing) {
      setEditingCellId(null);
    }
  }, [isEditing, setEditingCellId]);

  return (
    <>
      {/* 内联样式：放大公式、确保选中公式时一次选中全部，并居中显示 display 公式 */}
      <style>
        {`
          .katex, .katex-display {
            font-size: 1.5em !important;
            user-select: all !important;
          }
          .katex-display {
            text-align: center;
          }
        `}
      </style>
      <div
        className="relative group"
        data-cell-id={cell.id}
      >
        <div className={`markdown-cell ${!hasContent && !isEditing ? 'min-h-[20px]' : ''}`}>
          <div
            className="flex items-start relative"
            onMouseEnter={() => setShowButtons(cell.id, true)}
            onMouseLeave={() => setShowButtons(cell.id, false)}
          >
            {/* 主体区域：由父容器控制宽度，内容自动换行，划词时高亮 */}
            <div className="flex-grow prose w-full pb-0 mb-0 selection:bg-theme-200">
              {isEditing ? (
                <CodeMirror
                  onCreateEditor={handleCreateEditor}
                  value={cell.content}
                  height="auto"
                  extensions={[markdown(), EditorView.lineWrapping, syntaxHighlighting(markdownHighlighting)]}
                  onChange={handleChange}
                  className="markdown-editor-codemirror"
                  // 通过全局 CSS 类控制样式，避免内联样式冲突
                  theme={EditorView.theme({
                    '&': {
                      border: 'none !important',
                      boxShadow: 'none !important',
                      backgroundColor: 'transparent !important',
                      padding: 0,
                      fontSize: '1rem',
                      lineHeight: '1.6',
                    },
                    '.cm-scroller': {
                      backgroundColor: 'transparent !important',
                      padding: 0,
                    },
                    '.cm-content': {
                      padding: 0,
                      minHeight: 'auto',
                    },
                    '.cm-focused': {
                      outline: 'none !important',
                    },
                    '.cm-editor': {
                      fontSize: '1rem !important',
                      lineHeight: '1.6 !important',
                    },
                  })}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  autoFocus
                />
              ) : (
                <div
                  className={`text-lg leading-relaxed markdown-cell min-h-[25px] pb-0 mb-0 selection:bg-theme-200 ${
                    isDefaultTitle ? 'default-title-markdown' : ''
                  }`}
                  onDoubleClick={toggleEditing}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  role="button"
                  style={isDefaultTitle ? {
                    color: '#9ca3af', // 浅色
                    borderLeft: '4px solid #e5e7eb',
                    paddingLeft: '1rem',
                    marginBottom: '1.5rem'
                  } : {}}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {cell.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* 工具栏 */}
            {(viewMode === 'create' || viewMode === 'step') && ( <div
              className={`absolute -right-14 top-1 flex items-center transition-opacity duration-200 ${
                cellShowButtons || isEditing ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEditing();
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded"
                >
                  <Eye size={14} />
                </button>
              )}
              {deleteCell && !isDefaultTitle && (cell.content!="# Untitled") &&(
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCell(cell.id);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>)}
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(MarkdownCell);
