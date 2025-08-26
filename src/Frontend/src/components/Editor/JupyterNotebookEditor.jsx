import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from 'react';
import useStore from '../../store/notebookStore';
import CodeCell from './Cells/CodeCell';
import HybridCell from './Cells/HybridCell';
import MarkdownCell from './Cells/MarkdownCell';
import ImageCell from './Cells/ImageCell';
import AIThinkingCell from './Cells/AIThinkingCell';
import LinkCell from './Cells/LinkCell';
import DraggableCellList from './DragAndDrop/DraggableCellList';
import ShortcutsHelp from './KeyboardShortcuts/ShortcutsHelp';
import { handleFileUpload } from '../../utils/fileUtils';
import { notebookApiIntegration } from '../../services/notebookServices';
import { Backend_BASE_URL } from '../../config/base_url';

// JupyterNotebookEditor - TiptapNotebookEditor integration
const JupyterNotebookEditor = forwardRef(({
  className = "",
  readOnly = false
}, ref) => {
  
  const { cells, setCells, updateCell, notebookId } = useStore();
  const containerRef = useRef(null);
  const [focusedCellId, setFocusedCellId] = useState(null);
  const [isDragEnabled, setIsDragEnabled] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  // Upload state (local to editor)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Add debug logging for cells changes
  useEffect(() => {
    console.log('[JupyterNotebookEditor] Cells updated:', cells.length, 'cells');
    console.log('[JupyterNotebookEditor] Cell types:', cells.map(c => c.type));
  }, [cells]);

  const generateCellId = () => {
    return `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // 处理cell拖拽排序
  const handleCellsReorder = (newCells) => {
    setCells(newCells);
  };

  const handleAddCell = (type, index = cells.length) => {
    const newCell = {
      id: generateCellId(),
      type,
      content: type === 'link' ? '' : '',
      outputs: [],
      enableEdit: true,
      language: type === 'code' || type === 'Hybrid' ? 'python' : undefined,
      ...(type === 'thinking' && {
        agentName: 'AI',
        customText: null,
        textArray: [],
        useWorkflowThinking: false,
        enableEdit: false,
      })
    };

    const newCells = [...cells];
    newCells.splice(index, 0, newCell);
    setCells(newCells);
    
    setTimeout(() => {
      setFocusedCellId(newCell.id);
    }, 100);
    
    return newCell.id;
  };

  // Delete cell
  const handleDeleteCell = (cellId) => {
    const newCells = cells.filter(cell => cell.id !== cellId);
    setCells(newCells);
  };

  // Move cell
  const handleMoveCell = (cellId, direction) => {
    const cellIndex = cells.findIndex(cell => cell.id === cellId);
    if (cellIndex === -1) return;

    const newCells = [...cells];
    const targetIndex = direction === 'up' ? cellIndex - 1 : cellIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < newCells.length) {
      [newCells[cellIndex], newCells[targetIndex]] = [newCells[targetIndex], newCells[cellIndex]];
      setCells(newCells);
    }
  };

  const renderCell = (cell) => {
    const cellIndex = cells.findIndex(c => c.id === cell.id);
    const cellProps = {
      cell,
      readOnly,
      onDelete: () => handleDeleteCell(cell.id),
      onMoveUp: cellIndex > 0 ? () => handleMoveCell(cell.id, 'up') : undefined,
      onMoveDown: cellIndex < cells.length - 1 ? () => handleMoveCell(cell.id, 'down') : undefined,
      focused: focusedCellId === cell.id,
      onFocus: () => setFocusedCellId(cell.id),
      onBlur: () => setFocusedCellId(null),
    };

    switch (cell.type) {
      case 'code':
        return <CodeCell key={cell.id} {...cellProps} />;
      case 'Hybrid':
      case 'hybrid':
        return <HybridCell key={cell.id} {...cellProps} />;
      case 'markdown':
        return <MarkdownCell key={cell.id} {...cellProps} disableDefaultTitleStyle />;
      case 'image':
        return <ImageCell key={cell.id} {...cellProps} />;
      case 'thinking':
        return <AIThinkingCell key={cell.id} {...cellProps} />;
      case 'link':
        return <LinkCell key={cell.id} {...cellProps} />;
      default:
        return (
          <div key={cell.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-red-600">Unknown cell type: {cell.type}</p>
          </div>
        );
    }
  };

  // Cell divider component for inserting new cells
  const CellDivider = ({ index, onAddCell, viewMode }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showKeyboardHint, setShowKeyboardHint] = useState(false);
    const VUE_SECONDARY = '#35495E';

    // 处理键盘事件
    const handleKeyDown = (event) => {
      if (!isHovered) return;

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isModifierPressed = ctrlKey || metaKey;

      if (isModifierPressed && shiftKey) {
        switch (key) {
          case 'L': // Ctrl/Cmd + Shift + L - 插入代码块
            event.preventDefault();
            onAddCell('code', index);
            break;
          case 'M': // Ctrl/Cmd + Shift + M - 插入markdown
            event.preventDefault();
            onAddCell('markdown', index);
            break;
          case 'I': // Ctrl/Cmd + Shift + I - 插入图片
            event.preventDefault();
            onAddCell('image', index);
            break;
          case 'B': // Ctrl/Cmd + Shift + B - 插入AI思考
            event.preventDefault();
            onAddCell('thinking', index);
            break;
        }
      } else if (!isModifierPressed && !shiftKey) {
        // 简化的快捷键（无修饰键）
        switch (key) {
          case 'c': // c - 插入代码块
            event.preventDefault();
            onAddCell('code', index);
            break;
          case 'm': // m - 插入markdown
            event.preventDefault();
            onAddCell('markdown', index);
            break;
          case 'i': // i - 插入图片
            event.preventDefault();
            onAddCell('image', index);
            break;
          case 'a': // a - 插入AI思考
            event.preventDefault();
            onAddCell('thinking', index);
            break;
          case 'l': // l - 插入链接
            event.preventDefault();
            onAddCell('link', index);
            break;
        }
      }
    };

    return (
      <div
        className="h-2 group relative my-2 w-full max-w-screen-xl mx-auto"
        tabIndex={0}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => {
          setIsHovered(true);
          setShowKeyboardHint(true);
        }}
        onBlur={() => {
          setIsHovered(false);
          setShowKeyboardHint(false);
        }}
        onKeyDown={handleKeyDown}
      >
        {isHovered && viewMode === 'complete' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-2 z-10">
            <button
              onClick={() => onAddCell('code', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: VUE_SECONDARY }}
              title="快捷键: C 或 Ctrl+Shift+L"
            >
              <span>+</span> Code
            </button>
            <button
              onClick={() => onAddCell('markdown', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: VUE_SECONDARY }}
              title="快捷键: M 或 Ctrl+Shift+M"
            >
              <span>+</span> Markdown
            </button>
            <button
              onClick={() => onAddCell('image', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: VUE_SECONDARY }}
              title="快捷键: I 或 Ctrl+Shift+I"
            >
              <span>+</span> Image
            </button>
            <button
              onClick={() => onAddCell('thinking', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: VUE_SECONDARY }}
              title="快捷键: A 或 Ctrl+Shift+B"
            >
              <span>+</span> AI
            </button>

            {/* 键盘提示 */}
            {showKeyboardHint && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                按 C/M/I/A 快速添加 cell
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // lbcells0HTML ( TiptapNotebookEditor|)
  const convertCellsToHTML = () => {
    return cells.map(cell => {
      switch (cell.type) {
        case 'markdown':
          return `<div class="markdown-cell">${cell.content}</div>`;
        case 'code':
        case 'Hybrid':
          return `<div class="code-cell" data-language="${cell.language || 'python'}">${cell.content}</div>`;
        case 'thinking':
          return `<div class="thinking-cell" data-agent="${cell.agentName}">${cell.customText || ''}</div>`;
        default:
          return `<div class="unknown-cell">${cell.content || ''}</div>`;
      }
    }).join('\n');
  };

  // setContentFromHTML helper
  const setContentFromHTML = (html) => {
    // TODO: Implement HTML -> cells parsing logic
    console.log('Setting content from HTML:', html);
  };

  // SMcells (!getCurrentViewCells)
  const getCurrentViewCells = () => {
    return cells; // H, @	cells
  };

  // Imperative API exposed to parent components
  useImperativeHandle(ref, () => ({
    editor: null, // Jupyter< h	tiptap editor
    focus: () => {
      if (cells.length > 0 && containerRef.current) {
        const firstCell = containerRef.current.querySelector('[data-cell-id]');
        if (firstCell) {
          firstCell.focus();
        }
      }
    },
    getHTML: convertCellsToHTML,
    setContent: setContentFromHTML,
    clearContent: () => setCells([]),
    isEmpty: () => cells.length === 0,
    // Helpers to access or mutate the cell list
    getCells: () => cells,
    setCells: (newCells) => setCells(newCells),
    addCodeCell: () => handleAddCell('code', cells.length),
    addMarkdownCell: () => handleAddCell('markdown', cells.length),
    addHybridCell: () => handleAddCell('Hybrid', cells.length),
    addAIThinkingCell: (props = {}) => {
      const cellId = generateCellId();
      const newCell = {
        id: cellId,
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
      return cellId;
    },
  }), [cells, setCells]);

  // Determine which cells should be visible based on the current view mode
  const visibleCells = getCurrentViewCells();

  // Handle drop files into the editor area
  const handleEditorDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (!notebookId) {
        console.warn('Notebook ID not set, cannot upload.');
        return;
      }
      const dt = e.dataTransfer;
      if (!dt || !dt.files || dt.files.length === 0) return;
      const files = Array.from(dt.files);

      const uploadConfig = {
        mode: 'open',
        maxFileSize: 50 * 1024 * 1024,
        allowedTypes: [],
        maxFiles: files.length,
        targetDir: '.assets',
      };

      await handleFileUpload({
        notebookId,
        files,
        notebookApiIntegration,
        uploadConfig,
        setUploading,
        setUploadProgress,
        setError: setUploadError,
        fileInputRef,
        setIsPreview: () => {},
        toast: ({ title, description }) => console.log(title, description),
        onUpdate: (_cellId, { uploadedFiles }) => {
          // Insert cells for uploaded files
          (uploadedFiles || []).forEach((name) => {
            const lower = name.toLowerCase();
            const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some(ext => lower.endsWith(ext));
            const relPath = `.assets/${name}`;
            const url = `${Backend_BASE_URL}/assets/${encodeURIComponent(notebookId)}/${encodeURIComponent(name)}`;
            if (isImage) {
              const id = handleAddCell('image', cells.length);
              updateCell(id, `![${name}](${url})`);
            } else {
              const id = handleAddCell('link', cells.length);
              // Prefer relative path in content for portability
              updateCell(id, `[${name}](${relPath})`);
            }
          });
        },
        cellId: '',
        abortControllerRef,
        fetchFileList: async () => { try { await notebookApiIntegration.listFiles(notebookId); } catch {} },
      });
    } catch (err) {
      console.error('Editor drop upload failed:', err);
    }
  }, [notebookId, cells.length, handleFileUpload, updateCell]);

  return (
    <div
      ref={containerRef}
      className={`jupyter-notebook-editor ${className} w-full h-full bg-transparent`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleEditorDrop}
    >
      {/* Complete mode content with drag and drop */}
      <div className="w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto">
        <div className="h-10 w-full"></div>

        {/* 拖拽提示和快捷键帮助 */}
        <div className="relative">
          {/* <div className="h-4 w-full "></div> */}

          {/* 使用拖拽组件渲染cells */}
          <DraggableCellList
            cells={visibleCells}
            onCellsReorder={handleCellsReorder}
            onAddCell={handleAddCell}
            disabled={!isDragEnabled || readOnly}
            className="space-y-4"
            renderCell={(cell, isDragging) => (
              <div
                id={`cell-${cell.id}`}
                data-cell-id={cell.id}
                className={`relative w-full duration-200 ${
                  isDragging ? 'shadow-lg scale-105' : ''
                }`}
              >
                {renderCell(cell)}
              </div>
            )}
          />

          <CellDivider
            index={visibleCells.length}
            onAddCell={handleAddCell}
            viewMode="complete"
          />
        </div>
        <div className="h-20 w-full"></div>
      </div>

      {/* 快捷键帮助面板 */}
      <ShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      
      {/* Jupyter Notebook styles */}
      <style>{`
        .jupyter-notebook-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .jupyter-notebook-editor .code-cell {
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        }

        .jupyter-notebook-editor .markdown-cell {
          line-height: 1.6;
        }

        .jupyter-notebook-editor .thinking-cell {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
        }

        /* 拖拽相关样式 */
        .jupyter-notebook-editor .draggable-cell {
          transition: all 0.2s ease;
        }

        .jupyter-notebook-editor .draggable-cell:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .jupyter-notebook-editor .drag-handle {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .jupyter-notebook-editor .draggable-cell:hover .drag-handle {
          opacity: 1;
        }

        /* 快捷指令高亮 */
        .slash-command-active {
          background-color: #e0f2fe !important;
          border-radius: 3px;
          padding: 1px 2px;
        }
      `}</style>
    </div>
  );
});

JupyterNotebookEditor.displayName = 'JupyterNotebookEditor';

export default JupyterNotebookEditor;