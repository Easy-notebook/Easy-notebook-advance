import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { 
  GripVertical,
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import useStore from '../../../../store/notebookStore';

interface JupyterStyleBlockManagerProps {
  editor: Editor | null;
  children: React.ReactNode;
}

const JupyterStyleBlockManager: React.FC<JupyterStyleBlockManagerProps> = ({
  editor,
  children
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [currentCellId, setCurrentCellId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<HTMLElement | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ show: boolean, position: number, y: number }>({
    show: false,
    position: -1,
    y: 0
  });
  // 锁定拖拽的cell，防止拖拽过程中切换目标
  const [draggedCellId, setDraggedCellId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const { cells, setCells, moveCellToIndex } = useStore();

  // 当cells顺序改变时，确保TipTap编辑器同步更新
  useEffect(() => {
    if (!editor) return;
    
    // 这里可以添加逻辑来强制TipTap重新渲染内容
    // 通常cells的改变会通过TiptapNotebookEditor的useEffect自动同步
    console.log('📱 JupyterStyle: Cells顺序已更新，当前cell数量:', cells.length);
  }, [cells, editor]);

  // 清除隐藏定时器
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // 延迟隐藏工具栏
  const scheduleHide = useCallback(() => {
    if (isDragging) return;
    
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
    console.log('🔍 查找cell元素:', element.tagName, element.className);

    // 首先查找最近的具有data-cell-id或data-type属性的元素
    const cellElement = element.closest('[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]');

    if (cellElement) {
      const cellId = (cellElement as HTMLElement).getAttribute('data-cell-id');
      console.log('✅ 找到cell元素，ID:', cellId);
      if (cellId) return cellId;
    }

    // 对于普通的markdown元素（p, h1-h6等），通过更精确的位置推断
    if (editor) {
      try {
        // 查找包含该元素的最近的块级元素
        const blockElement = element.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre');

        if (blockElement) {
          const rect = blockElement.getBoundingClientRect();

          // 使用块元素的中心点进行位置计算
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;

          const coords = editor.view.posAtCoords({ left: x, top: y });
          if (coords) {
            // 更精确的块索引计算
            let blockIndex = 0;
            let found = false;

            editor.state.doc.descendants((node, pos) => {
              if (found) return false;

              if (node.isBlock) {
                const nodeStart = pos;
                const nodeEnd = pos + node.nodeSize;

                // 检查坐标是否在当前节点范围内
                if (coords.pos >= nodeStart && coords.pos < nodeEnd) {
                  found = true;
                  return false;
                }

                // 只有当坐标在节点之后时才增加索引
                if (coords.pos >= nodeEnd) {
                  blockIndex++;
                }
              }
              return true;
            });

            console.log('📍 位置推断结果:', {
              coords: coords.pos,
              blockIndex,
              cellsLength: cells.length,
              found
            });

            if (blockIndex < cells.length) {
              const cellId = cells[blockIndex].id;
              console.log('✅ 通过位置推断找到cell:', cellId);
              return cellId;
            }
          }
        }
      } catch (error) {
        console.warn('❌ 查找cell失败:', error);
      }
    }

    console.log('❌ 未找到对应的cell');
    return null;
  }, [editor, cells]);

  // 显示工具栏
  const showToolbarForElement = useCallback((element: HTMLElement) => {
    clearHideTimeout();

    const cellId = findCellByElement(element);
    console.log('🎯 显示工具栏 - 找到cellId:', cellId, '当前cellId:', currentCellId);

    if (!cellId) {
      console.log('❌ 未找到cellId，不显示工具栏');
      return;
    }

    if (cellId !== currentCellId) {
      console.log('🔄 切换到新的cell:', cellId);
      setCurrentCellId(cellId);

      const rect = element.getBoundingClientRect();
      setToolbarPosition({
        x: rect.left - 60,
        y: rect.top + window.scrollY
      });
    }

    setShowToolbar(true);
  }, [currentCellId, findCellByElement, clearHideTimeout]);

  // 移动cell到指定位置（使用store的方法）
  const moveCellToPosition = useCallback((fromIndex: number, toIndex: number) => {
    console.log('🎯 JupyterStyle: 请求移动cell', { from: fromIndex, to: toIndex });
    moveCellToIndex(fromIndex, toIndex);
  }, [moveCellToIndex]);

  // 获取cell在数组中的索引
  const getCellIndex = useCallback((cellId: string): number => {
    return cells.findIndex(cell => cell.id === cellId);
  }, [cells]);

  // 验证DOM元素与cells数组的一致性
  const validateDOMCellsConsistency = useCallback(() => {
    if (!containerRef.current) return false;

    const domElements = Array.from(containerRef.current.querySelectorAll(
      '[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]'
    )) as HTMLElement[];

    console.log('🔍 验证DOM一致性:', {
      domElementsCount: domElements.length,
      cellsCount: cells.length,
      domIds: domElements.map(el => el.getAttribute('data-cell-id') || el.getAttribute('data-type')),
      cellIds: cells.map(c => c.id)
    });

    return domElements.length === cells.length;
  }, [cells]);

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
  const insertBlockAbove = useCallback(() => {
    if (!currentCellId) return;
    
    const currentIndex = getCellIndex(currentCellId);
    if (currentIndex === -1) return;
    
    const newCell = {
      id: `cell-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'markdown' as const,
      content: '',
      outputs: [],
      enableEdit: true
    };
    
    const newCells = [...cells];
    newCells.splice(currentIndex, 0, newCell);
    setCells(newCells);
    
    setShowToolbar(false);
  }, [currentCellId, getCellIndex, cells, setCells]);

  // 创建拖拽预览 - 参考Jupyter Notebook的样式
  const createDragPreview = useCallback((originalElement: HTMLElement) => {
    const preview = originalElement.cloneNode(true) as HTMLElement;

    // Jupyter风格的拖拽预览样式
    preview.style.position = 'fixed';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '9999';
    preview.style.opacity = '0.9';
    preview.style.transform = 'rotate(2deg) scale(0.95)';
    preview.style.maxWidth = '700px';
    preview.style.backgroundColor = '#ffffff';
    preview.style.border = '2px solid #4285f4';
    preview.style.borderRadius = '6px';
    preview.style.boxShadow = '0 12px 40px rgba(66, 133, 244, 0.3), 0 4px 12px rgba(0,0,0,0.15)';
    preview.style.transition = 'transform 0.1s ease-out';

    // 添加拖拽指示器
    const dragIndicator = document.createElement('div');
    dragIndicator.style.position = 'absolute';
    dragIndicator.style.left = '-8px';
    dragIndicator.style.top = '50%';
    dragIndicator.style.transform = 'translateY(-50%)';
    dragIndicator.style.width = '4px';
    dragIndicator.style.height = '60%';
    dragIndicator.style.backgroundColor = '#4285f4';
    dragIndicator.style.borderRadius = '2px';
    dragIndicator.style.animation = 'pulse 1s infinite';
    preview.appendChild(dragIndicator);

    document.body.appendChild(preview);
    return preview;
  }, []);

  // 计算drop指示器位置 - 改进版本
  const calculateDropPosition = useCallback((clientY: number) => {
    if (!containerRef.current) return { position: -1, y: 0 };

    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - containerRect.top + window.scrollY;

    console.log('🎯 计算drop位置:', { clientY, relativeY, containerTop: containerRect.top });

    // 找到所有cell元素，按照在DOM中的顺序
    const cellElements = Array.from(containerRef.current.querySelectorAll(
      '[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]'
    )) as HTMLElement[];

    console.log('📍 找到cell元素数量:', cellElements.length);

    // 如果没有元素，返回位置0
    if (cellElements.length === 0) {
      return { position: 0, y: 0 };
    }

    // 遍历所有元素，找到合适的插入位置
    for (let i = 0; i < cellElements.length; i++) {
      const element = cellElements[i];
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top - containerRect.top + window.scrollY;
      const elementBottom = rect.bottom - containerRect.top + window.scrollY;
      const elementMiddle = elementTop + rect.height / 2;

      console.log(`📍 元素 ${i}:`, {
        elementTop,
        elementMiddle,
        elementBottom,
        relativeY,
        shouldInsertBefore: relativeY < elementMiddle
      });

      // 如果鼠标在元素上半部分，插入到该元素之前
      if (relativeY < elementMiddle) {
        return {
          position: i,
          y: elementTop - window.scrollY // 转换回屏幕坐标
        };
      }
    }

    // 如果没有找到合适位置，插入到最后
    const lastElement = cellElements[cellElements.length - 1];
    const lastRect = lastElement.getBoundingClientRect();
    const insertY = lastRect.bottom - containerRect.top;

    console.log('📍 插入到最后位置:', { position: cellElements.length, y: insertY });

    return {
      position: cellElements.length,
      y: insertY
    };
  }, []);

  // 拖拽开始 - 参考Jupyter Notebook的交互
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!currentCellId) {
      console.log('❌ 拖拽开始失败：没有currentCellId');
      return;
    }

    const currentIndex = getCellIndex(currentCellId);
    if (currentIndex === -1) {
      console.log('❌ 拖拽开始失败：找不到cell索引', currentCellId);
      return;
    }

    // 🔒 锁定要拖拽的cell，防止拖拽过程中切换目标
    setDraggedCellId(currentCellId);

    console.log('🎯 开始拖拽cell (已锁定):', {
      cellId: currentCellId,
      index: currentIndex,
      cellType: cells[currentIndex]?.type
    });



    setIsDragging(true);

    e.dataTransfer.setData('application/json', JSON.stringify({
      cellId: currentCellId,
      sourceIndex: currentIndex,
      type: 'jupyter-cell-move'
    }));

    // 创建拖拽预览
    const target = e.target as HTMLElement;
    const cellElement = target.closest('[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]') as HTMLElement;

    if (cellElement) {
      console.log('✅ 找到拖拽元素:', cellElement.tagName, cellElement.getAttribute('data-cell-id') || cellElement.getAttribute('data-type'));

      const preview = createDragPreview(cellElement);
      setDragPreview(preview);

      // 添加Jupyter风格的拖拽样式
      cellElement.classList.add('jupyter-cell-dragging');

      // 隐藏工具栏
      setShowToolbar(false);
    } else {
      console.log('❌ 未找到拖拽元素');
    }

    e.dataTransfer.effectAllowed = 'move';

    // 添加全局拖拽状态
    document.body.style.cursor = 'grabbing';
  }, [currentCellId, getCellIndex, createDragPreview, cells]);

  // 拖拽结束 - 清理所有拖拽状态
  const handleDragEnd = useCallback(() => {
    console.log('🎯 拖拽结束');
    setIsDragging(false);
    setDropIndicator({ show: false, position: -1, y: 0 });
    // 🔓 清除拖拽锁定
    setDraggedCellId(null);

    // 清理拖拽预览
    if (dragPreview) {
      // 添加淡出动画
      dragPreview.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      dragPreview.style.opacity = '0';
      dragPreview.style.transform = 'scale(0.8) rotate(0deg)';

      setTimeout(() => {
        if (document.body.contains(dragPreview)) {
          document.body.removeChild(dragPreview);
        }
        setDragPreview(null);
      }, 200);
    }

    // 恢复所有cell的样式
    const cellElements = containerRef.current?.querySelectorAll(
      '[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]'
    );
    cellElements?.forEach(el => {
      const element = el as HTMLElement;
      element.style.opacity = '';
      element.classList.remove('jupyter-cell-dragging', 'jupyter-drop-target');
    });

    // 恢复全局样式
    document.body.style.cursor = '';

    // 延迟重新显示工具栏
    setTimeout(() => {
      if (currentCellId) {
        setShowToolbar(true);
      }
    }, 150);
  }, [dragPreview, currentCellId]);

  // 拖拽移动 - 增强视觉反馈
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const dropPos = calculateDropPosition(e.clientY);
    setDropIndicator({
      show: true,
      position: dropPos.position,
      y: dropPos.y
    });

    // 更新拖拽预览位置，添加平滑跟随
    if (dragPreview) {
      const offsetX = 15;
      const offsetY = -30;
      dragPreview.style.left = `${e.clientX + offsetX}px`;
      dragPreview.style.top = `${e.clientY + offsetY}px`;

      // 根据移动速度调整旋转角度
      const now = Date.now();
      if (dragPreview.dataset.lastUpdate) {
        const timeDiff = now - parseInt(dragPreview.dataset.lastUpdate);
        const speed = timeDiff < 50 ? 'fast' : 'slow';
        const rotation = speed === 'fast' ? '3deg' : '1deg';
        dragPreview.style.transform = `rotate(${rotation}) scale(0.95)`;
      }
      dragPreview.dataset.lastUpdate = now.toString();
    }

    // 高亮潜在的drop目标
    const cellElements = containerRef.current?.querySelectorAll(
      '[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]'
    );
    cellElements?.forEach((el, index) => {
      const element = el as HTMLElement;
      if (index === dropPos.position) {
        element.classList.add('jupyter-drop-target');
      } else {
        element.classList.remove('jupyter-drop-target');
      }
    });
  }, [calculateDropPosition, dragPreview]);

  // 放置 - 执行cell移动并提供反馈
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) {
        console.log('❌ 没有拖拽数据');
        return;
      }

      const { cellId, sourceIndex, type } = JSON.parse(dragData);
      if (type !== 'jupyter-cell-move') {
        console.log('❌ 不是cell移动操作:', type);
        return;
      }

      // 验证源索引
      if (sourceIndex < 0 || sourceIndex >= cells.length) {
        console.log('❌ 无效的源索引:', sourceIndex, '总数:', cells.length);
        return;
      }

      // 验证cellId匹配
      if (cells[sourceIndex].id !== cellId) {
        console.log('❌ cellId不匹配:', {
          expected: cells[sourceIndex].id,
          actual: cellId,
          sourceIndex
        });
        return;
      }

      const dropPos = calculateDropPosition(e.clientY);
      let targetIndex = dropPos.position;

      console.log('🎯 原始drop位置:', {
        dropPosition: dropPos.position,
        sourceIndex,
        cellsLength: cells.length
      });

      // 重要：调整目标索引逻辑
      // 当从前面拖到后面时，由于源元素会被移除，目标位置需要减1
      // 但是要确保不会超出边界
      if (sourceIndex < targetIndex) {
        targetIndex = Math.max(0, targetIndex - 1);
      }

      // 确保目标索引在有效范围内
      targetIndex = Math.min(targetIndex, cells.length - 1);
      targetIndex = Math.max(0, targetIndex);

      console.log('🎯 执行cell移动:', {
        cellId,
        from: sourceIndex,
        to: targetIndex,
        cellsLength: cells.length
      });

      // 简化移动逻辑，参考JupyterNotebookEditor
      if (sourceIndex !== targetIndex && targetIndex >= 0 && targetIndex < cells.length) {
        console.log('✅ 执行移动操作');
        moveCellToPosition(sourceIndex, targetIndex);
      } else {
        console.log('⚠️ 跳过移动：位置未变化或无效');
      }
    } catch (error) {
      console.error('❌ 拖拽放置失败:', error);
    }

    handleDragEnd();
  }, [calculateDropPosition, moveCellToPosition, handleDragEnd, cells]);

  // 鼠标移动处理
  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (event: MouseEvent) => {
      // 在拖拽过程中，不切换currentCellId，保持锁定状态
      if (isDragging) {
        return;
      }

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

  // 工具栏鼠标事件
  const handleToolbarMouseEnter = useCallback(() => {
    clearHideTimeout();
    setShowToolbar(true);
  }, [clearHideTimeout]);

  const handleToolbarMouseLeave = useCallback(() => {
    if (!isDragging) {
      scheduleHide();
    }
  }, [scheduleHide, isDragging]);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Jupyter风格的Drop指示器 */}
      {dropIndicator.show && (
        <div
          className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
          style={{
            top: dropIndicator.y - 2, // 不需要再加window.scrollY，因为已经在calculateDropPosition中处理了
            height: '4px'
          }}
        >
          {/* 左侧圆点 */}
          <div
            style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#4285f4',
              borderRadius: '50%',
              marginLeft: '6px',
              boxShadow: '0 0 12px rgba(66, 133, 244, 0.8)',
              animation: 'dragPulse 0.8s infinite',
              border: '2px solid white'
            }}
          />
          {/* 中间线条 */}
          <div
            style={{
              flex: 1,
              height: '3px',
              backgroundColor: '#4285f4',
              marginLeft: '6px',
              marginRight: '16px',
              borderRadius: '2px',
              boxShadow: '0 0 8px rgba(66, 133, 244, 0.6)',
              animation: 'pulse 1s infinite'
            }}
          />
          {/* 右侧箭头 */}
          <div
            style={{
              width: '0',
              height: '0',
              borderLeft: '8px solid #4285f4',
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              marginRight: '8px',
              filter: 'drop-shadow(0 0 4px rgba(66, 133, 244, 0.6))'
            }}
          />
        </div>
      )}
      
      {/* Jupyter风格的块管理工具栏 */}
      {showToolbar && currentCellId && (
        <div
          ref={toolbarRef}
          className="fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 p-1 flex flex-col gap-1 backdrop-blur-sm"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          {/* 拖拽手柄 */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="p-2 hover:bg-blue-100 rounded text-gray-600 cursor-grab active:cursor-grabbing transition-colors"
            title="拖拽移动Cell"
          >
            <GripVertical size={14} />
          </div>

          <div className="w-full h-px bg-gray-200" />

          {/* 向上移动 */}
          <button
            onClick={moveBlockUp}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="向上移动"
          >
            <ChevronUp size={14} />
          </button>

          {/* 向下移动 */}
          <button
            onClick={moveBlockDown}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="向下移动"
          >
            <ChevronDown size={14} />
          </button>

          <div className="w-full h-px bg-gray-200" />

          {/* 插入按钮 */}
          <button
            onClick={insertBlockAbove}
            className="p-2 hover:bg-green-100 rounded text-green-600 transition-colors"
            title="在上方插入Cell"
          >
            <Plus size={14} />
          </button>

          {/* 复制 */}
          <button
            onClick={duplicateBlock}
            className="p-2 hover:bg-blue-100 rounded text-blue-600 transition-colors"
            title="复制Cell"
          >
            <Copy size={14} />
          </button>

          {/* 删除 */}
          <button
            onClick={deleteBlock}
            className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
            title="删除Cell"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* CSS动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.7; transform: scaleY(0.8); }
        }

        @keyframes dragPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Jupyter风格的hover效果 */
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

        /* 拖拽时的样式 */
        .jupyter-cell-dragging {
          opacity: 0.3 !important;
          transform: scale(0.98) !important;
          transition: all 0.2s ease !important;
        }

        /* 拖拽目标指示器 */
        .jupyter-drop-target {
          border: 2px dashed #4285f4 !important;
          background-color: rgba(66, 133, 244, 0.08) !important;
          border-radius: 6px !important;
        }
      `}</style>
    </div>
  );
};

export default JupyterStyleBlockManager;