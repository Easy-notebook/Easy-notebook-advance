import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import useStore from '../../store/notebookStore';
import CodeCell from './Cells/CodeCell';
import HybridCell from './Cells/HybridCell';
import MarkdownCell from './Cells/MarkdownCell';
import ImageCell from './Cells/ImageCell';
import AIThinkingCell from './Cells/AIThinkingCell';
import DraggableCellList from './DragAndDrop/DraggableCellList';
import SlashCommandMenu from './SlashCommands/SlashCommandMenu';
import { useSlashCommands } from './SlashCommands/useSlashCommands';
import { useKeyboardShortcuts } from './KeyboardShortcuts/useKeyboardShortcuts';
import ShortcutsHelp from './KeyboardShortcuts/ShortcutsHelp';

// JupyterNotebookEditor - TiptapNotebookEditor integration
const JupyterNotebookEditor = forwardRef(({
  className = "",
  placeholder = "Start your notebook by adding cells...",
  readOnly = false
}, ref) => {
  
  const { cells, setCells } = useStore();
  const containerRef = useRef(null);
  const [focusedCellId, setFocusedCellId] = useState(null);
  const [isDragEnabled, setIsDragEnabled] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Add debug logging for cells changes
  useEffect(() => {
    console.log('[JupyterNotebookEditor] Cells updated:', cells.length, 'cells');
    console.log('[JupyterNotebookEditor] Cell types:', cells.map(c => c.type));
  }, [cells]);

  const generateCellId = () => {
    return `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 快捷指令Hook配置
  const slashCommands = useSlashCommands({
    onInsertCodeCell: () => handleAddCell('code'),
    onInsertMarkdownCell: () => handleAddCell('markdown'),
    onInsertImageCell: () => handleAddCell('image'),
    onInsertThinkingCell: () => handleAddCell('thinking'),
    onInsertTable: () => {
      // 插入表格到markdown cell
      const tableMarkdown = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 行1 | 数据 | 数据 |
| 行2 | 数据 | 数据 |`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: tableMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onInsertMath: () => {
      // 插入数学公式到markdown cell
      const mathMarkdown = `$$
E = mc^2
$$`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: mathMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onInsertHeading: (level) => {
      const headingMarkdown = `${'#'.repeat(level)} 标题`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: headingMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onInsertList: (ordered) => {
      const listMarkdown = ordered
        ? `1. 第一项\n2. 第二项\n3. 第三项`
        : `- 第一项\n- 第二项\n- 第三项`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: listMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onInsertQuote: () => {
      const quoteMarkdown = `> 这是一个引用块`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: quoteMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onInsertText: () => handleAddCell('markdown'),
    onAIGenerate: () => {
      console.log('AI生成功能待实现');
      // 这里可以集成AI生成功能
    },
  });

  // 键盘快捷键配置
  useKeyboardShortcuts({
    onInsertCodeCell: () => handleAddCell('code'),
    onInsertMarkdownCell: () => handleAddCell('markdown'),
    onInsertImageCell: () => handleAddCell('image'),
    onInsertThinkingCell: () => handleAddCell('thinking'),
    onInsertTable: () => {
      const tableMarkdown = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 行1 | 数据 | 数据 |
| 行2 | 数据 | 数据 |`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: tableMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onInsertMath: () => {
      const mathMarkdown = `$$
E = mc^2
$$`;
      const newCell = {
        id: generateCellId(),
        type: 'markdown',
        content: mathMarkdown,
        outputs: [],
        enableEdit: true,
      };
      setCells([...cells, newCell]);
    },
    onOpenCommandPalette: () => {
      // 打开快捷指令菜单
      const activeElement = document.activeElement;
      if (activeElement) {
        slashCommands.openMenu(activeElement);
      }
    },
    onSaveNotebook: () => {
      console.log('保存笔记本功能待实现');
      // 这里可以集成保存功能
    },
    onRunCell: () => {
      console.log('运行当前cell功能待实现');
      // 这里可以集成运行功能
    },
    onRunAllCells: () => {
      console.log('运行所有cells功能待实现');
      // 这里可以集成运行所有功能
    },
    disabled: readOnly,
  });

  // 处理cell拖拽排序
  const handleCellsReorder = (newCells) => {
    setCells(newCells);
  };

  const handleAddCell = (type, index = cells.length) => {
    const newCell = {
      id: generateCellId(),
      type,
      content: '',
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
        return <HybridCell key={cell.id} {...cellProps} />;
      case 'markdown':
        return <MarkdownCell key={cell.id} {...cellProps} disableDefaultTitleStyle />;
      case 'image':
        return <ImageCell key={cell.id} {...cellProps} />;
      case 'thinking':
        return <AIThinkingCell key={cell.id} {...cellProps} />;
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
    const VUE_SECONDARY = '#35495E';

    return (
      <div
        className="h-2 group relative my-2 w-full max-w-screen-xl mx-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered && viewMode === 'complete' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-2 z-10">
            <button
              onClick={() => onAddCell('code', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
              style={{ color: VUE_SECONDARY }}
            >
              <span>+</span> Code
            </button>
            <button
              onClick={() => onAddCell('markdown', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
              style={{ color: VUE_SECONDARY }}
            >
              <span>+</span> Markdown
            </button>
            <button
              onClick={() => onAddCell('image', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
              style={{ color: VUE_SECONDARY }}
            >
              <span>+</span> Image
            </button>
            <button
              onClick={() => onAddCell('thinking', index)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm"
              style={{ color: VUE_SECONDARY }}
            >
              <span>+</span> AI
            </button>
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
  
  return (
    <div 
      ref={containerRef}
      className={`jupyter-notebook-editor ${className} w-full h-full bg-transparent`}
    >
      {/* Complete mode content with drag and drop */}
      <div className="w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto">
        <div className="h-10 w-full"></div>

        {/* 拖拽提示和快捷键帮助 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
            <span>💡 提示：悬停在cell左侧可以拖拽重新排序</span>
          </div>
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full transition-colors"
            title="查看键盘快捷键"
          >
            <span>⌨️</span>
            <span>快捷键</span>
          </button>
        </div>

        <div className="relative">
          <div className="h-4 w-full"></div>
          <CellDivider index={0} onAddCell={handleAddCell} viewMode="complete" />

          {/* 使用拖拽组件渲染cells */}
          <DraggableCellList
            cells={visibleCells}
            onCellsReorder={handleCellsReorder}
            disabled={!isDragEnabled || readOnly}
            className="space-y-4"
            renderCell={(cell, isDragging) => (
              <div
                id={`cell-${cell.id}`}
                data-cell-id={cell.id}
                className={`relative w-full bg-white rounded-lg px-8 transition-all duration-200 ${
                  isDragging ? 'shadow-lg scale-105' : 'shadow-sm'
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

      {/* 快捷指令菜单 */}
      <SlashCommandMenu
        isOpen={slashCommands.isMenuOpen}
        onClose={slashCommands.closeMenu}
        onCommand={slashCommands.handleCommand}
        position={slashCommands.menuPosition}
        searchQuery={slashCommands.searchQuery}
      />

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