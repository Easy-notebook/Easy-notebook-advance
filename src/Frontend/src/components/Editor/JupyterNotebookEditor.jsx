import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import useStore from '../../store/notebookStore';
import CodeCell from './Cells/CodeCell';
import HybridCell from './Cells/HybridCell';
import MarkdownCell from './Cells/MarkdownCell';
import ImageCell from './Cells/ImageCell';
import AIThinkingCell from './Cells/AIThinkingCell';

// JupyterNotebookEditor - TiptapNotebookEditor integration
const JupyterNotebookEditor = forwardRef(({
  className = "",
  placeholder = "Start your notebook by adding cells...",
  readOnly = false
}, ref) => {
  
  const { cells, setCells } = useStore();
  const containerRef = useRef(null);
  const [focusedCellId, setFocusedCellId] = useState(null);

  const generateCellId = () => {
    return `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        return <MarkdownCell key={cell.id} {...cellProps} />;
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
      {/* Complete mode content */}
      <div className="w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto">
        <div className="h-10 w-full"></div>
        <div className="relative space-y-4">
          <div className="h-4 w-full"></div>
          <CellDivider index={0} onAddCell={handleAddCell} viewMode="complete" />
          {visibleCells.map((cell, index) => (
            <React.Fragment key={cell.id}>
              <div
                id={`cell-${cell.id}`}
                data-cell-id={cell.id}
                className="relative w-full bg-white rounded-lg px-8"
              >
                {renderCell(cell)}
              </div>
              <CellDivider
                index={index + 1}
                onAddCell={handleAddCell}
                viewMode="complete"
              />
            </React.Fragment>
          ))}
        </div>
        <div className="h-20 w-full"></div>
      </div>
      
      {/* Jupyter Notebook styles */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
});

JupyterNotebookEditor.displayName = 'JupyterNotebookEditor';

export default JupyterNotebookEditor;