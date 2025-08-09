import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Copy, Trash2, Plus } from 'lucide-react';
import useStore from '../../../../store/notebookStore';

interface SimpleDragManagerProps {
  editor: any;
  children: React.ReactNode;
}

const SimpleDragManager: React.FC<SimpleDragManagerProps> = ({ editor, children }) => {
  const [currentCellId, setCurrentCellId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const { cells, setCells, moveCellToIndex } = useStore();

  // 清除隐藏定时器
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // 延迟隐藏工具栏
  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isDragging) {
        setShowToolbar(false);
        setCurrentCellId(null);
      }
    }, 300);
  }, [clearHideTimeout, isDragging]);

  // 根据DOM元素找到对应的cell
  const findCellByElement = useCallback((element: HTMLElement): string | null => {
    const cellElement = element.closest('[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]');
    
    if (cellElement) {
      const cellId = (cellElement as HTMLElement).getAttribute('data-cell-id');
      if (cellId) return cellId;
    }

    // 通过ProseMirror位置推断
    if (editor) {
      try {
        const blockElement = element.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre');
        
        if (blockElement) {
          const rect = blockElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          const coords = editor.view.posAtCoords({ left: x, top: y });
          if (coords) {
            let blockIndex = 0;
            let found = false;
            
            editor.state.doc.descendants((node, pos) => {
              if (found) return false;
              
              if (node.isBlock) {
                const nodeStart = pos;
                const nodeEnd = pos + node.nodeSize;
                
                if (coords.pos >= nodeStart && coords.pos < nodeEnd) {
                  found = true;
                  return false;
                }
                
                if (coords.pos >= nodeEnd) {
                  blockIndex++;
                }
              }
              return true;
            });
            
            if (blockIndex < cells.length) {
              return cells[blockIndex].id;
            }
          }
        }
      } catch (error) {
        console.warn('查找cell失败:', error);
      }
    }

    return null;
  }, [editor, cells]);

  // 显示工具栏
  const showToolbarForElement = useCallback((element: HTMLElement) => {
    clearHideTimeout();
    
    const cellId = findCellByElement(element);
    if (!cellId) return;
    
    if (cellId !== currentCellId) {
      setCurrentCellId(cellId);
      
      const rect = element.getBoundingClientRect();
      setToolbarPosition({
        x: rect.left - 60,
        y: rect.top + window.scrollY
      });
    }
    
    setShowToolbar(true);
  }, [currentCellId, findCellByElement, clearHideTimeout]);

  // 获取cell在数组中的索引
  const getCellIndex = useCallback((cellId: string): number => {
    return cells.findIndex(cell => cell.id === cellId);
  }, [cells]);

  // 移动cell到指定位置
  const moveCellToPosition = useCallback((fromIndex: number, toIndex: number) => {
    console.log('🎯 SimpleDrag: 请求移动cell', { from: fromIndex, to: toIndex });
    moveCellToIndex(fromIndex, toIndex);
  }, [moveCellToIndex]);

  // 向上移动
  const moveBlockUp = useCallback(() => {
    if (!currentCellId) return;
    
    const currentIndex = getCellIndex(currentCellId);
    if (currentIndex > 0) {
      moveCellToPosition(currentIndex, currentIndex - 1);
    }
    
    setShowToolbar(false);
  }, [currentCellId, getCellIndex, moveCellToPosition]);

  // 向下移动
  const moveBlockDown = useCallback(() => {
    if (!currentCellId) return;
    
    const currentIndex = getCellIndex(currentCellId);
    if (currentIndex < cells.length - 1 && currentIndex !== -1) {
      moveCellToPosition(currentIndex, currentIndex + 1);
    }
    
    setShowToolbar(false);
  }, [currentCellId, getCellIndex, moveCellToPosition, cells.length]);

  // 删除cell
  const deleteBlock = useCallback(() => {
    if (!currentCellId) return;
    
    const newCells = cells.filter(cell => cell.id !== currentCellId);
    setCells(newCells);
    setShowToolbar(false);
  }, [currentCellId, cells, setCells]);

  // 复制cell
  const duplicateBlock = useCallback(() => {
    if (!currentCellId) return;
    
    const currentIndex = getCellIndex(currentCellId);
    if (currentIndex === -1) return;
    
    const cellToDuplicate = cells[currentIndex];
    const newCell = {
      ...cellToDuplicate,
      id: `cell-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      outputs: []
    };
    
    const newCells = [...cells];
    newCells.splice(currentIndex + 1, 0, newCell);
    setCells(newCells);
    setShowToolbar(false);
  }, [currentCellId, getCellIndex, cells, setCells]);

  // 插入新cell
  const insertNewCell = useCallback(() => {
    if (!currentCellId) return;
    
    const currentIndex = getCellIndex(currentCellId);
    if (currentIndex === -1) return;
    
    const newCell = {
      id: `cell-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'markdown' as const,
      content: '',
      outputs: [],
      enableEdit: true,
    };
    
    const newCells = [...cells];
    newCells.splice(currentIndex + 1, 0, newCell);
    setCells(newCells);
    setShowToolbar(false);
  }, [currentCellId, getCellIndex, cells, setCells]);

  // 鼠标移动处理
  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) return;
      
      const target = event.target as HTMLElement;
      
      // 检查是否在工具栏上
      if (toolbarRef.current && toolbarRef.current.contains(target)) {
        clearHideTimeout();
        return;
      }
      
      // 查找块级元素
      const blockElement = target.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre, [data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]');
      
      if (blockElement) {
        showToolbarForElement(blockElement as HTMLElement);
      } else {
        scheduleHide();
      }
    };

    const handleMouseLeave = () => {
      if (!isDragging) {
        scheduleHide();
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      clearHideTimeout();
    };
  }, [editor, showToolbarForElement, scheduleHide, clearHideTimeout, isDragging]);

  return (
    <div ref={containerRef} className="relative">
      {children}

      {/* 简化的工具栏 */}
      {showToolbar && currentCellId && (
        <div
          ref={toolbarRef}
          className="fixed z-50 flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y,
          }}
          onMouseEnter={() => clearHideTimeout()}
          onMouseLeave={scheduleHide}
        >
          <button
            onClick={moveBlockUp}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="向上移动"
            disabled={getCellIndex(currentCellId) === 0}
          >
            <ArrowUp size={16} />
          </button>
          
          <button
            onClick={moveBlockDown}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="向下移动"
            disabled={getCellIndex(currentCellId) === cells.length - 1}
          >
            <ArrowDown size={16} />
          </button>
          
          <div className="w-full h-px bg-gray-200 my-1" />
          
          <button
            onClick={duplicateBlock}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="复制"
          >
            <Copy size={16} />
          </button>
          
          <button
            onClick={insertNewCell}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="插入新cell"
          >
            <Plus size={16} />
          </button>
          
          <button
            onClick={deleteBlock}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* CSS样式 */}
      <style>{`
        .ProseMirror p:hover,
        .ProseMirror h1:hover,
        .ProseMirror h2:hover,
        .ProseMirror h3:hover,
        .ProseMirror h4:hover,
        .ProseMirror h5:hover,
        .ProseMirror h6:hover,
        .ProseMirror ul:hover,
        .ProseMirror ol:hover,
        .ProseMirror blockquote:hover,
        .ProseMirror pre:hover,
        [data-cell-id]:hover,
        [data-type="executable-code-block"]:hover,
        [data-type="thinking-cell"]:hover,
        [data-type="markdown-image"]:hover {
          background-color: rgba(66, 133, 244, 0.04);
          border-left: 3px solid rgba(66, 133, 244, 0.3);
          border-radius: 0 4px 4px 0;
          padding-left: 8px;
          margin-left: -11px;
          transition: all 0.15s ease;
        }
      `}</style>
    </div>
  );
};

export default SimpleDragManager;
