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

interface SimpleDragBlockManagerProps {
  editor: Editor | null;
  children: React.ReactNode;
}

const SimpleDragBlockManager: React.FC<SimpleDragBlockManagerProps> = ({
  editor,
  children
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [currentBlock, setCurrentBlock] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

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
      setShowToolbar(false);
      setCurrentBlock(null);
    }, 300);
  }, [clearHideTimeout]);

  // 显示工具栏
  const showToolbarForBlock = useCallback((blockElement: HTMLElement) => {
    clearHideTimeout();
    
    if (blockElement !== currentBlock) {
      setCurrentBlock(blockElement);
      
      const rect = blockElement.getBoundingClientRect();
      setToolbarPosition({
        x: rect.left - 60,
        y: rect.top + window.scrollY
      });
    }
    
    setShowToolbar(true);
  }, [currentBlock, clearHideTimeout]);

  // 获取所有块级元素
  const getAllBlocks = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre'));
  }, []);

  // 简单的块移动 - 使用文本内容交换
  const moveBlockUp = () => {
    if (!editor || !currentBlock) return;
    
    const blocks = getAllBlocks();
    const currentIndex = blocks.indexOf(currentBlock);
    
    if (currentIndex > 0) {
      const prevBlock = blocks[currentIndex - 1] as HTMLElement;
      swapBlockContents(currentBlock, prevBlock);
    }
    
    setShowToolbar(false);
  };

  const moveBlockDown = () => {
    if (!editor || !currentBlock) return;
    
    const blocks = getAllBlocks();
    const currentIndex = blocks.indexOf(currentBlock);
    
    if (currentIndex < blocks.length - 1) {
      const nextBlock = blocks[currentIndex + 1] as HTMLElement;
      swapBlockContents(currentBlock, nextBlock);
    }
    
    setShowToolbar(false);
  };

  // 交换两个块的内容
  const swapBlockContents = (block1: HTMLElement, block2: HTMLElement) => {
    const content1 = block1.innerHTML;
    const content2 = block2.innerHTML;
    
    block1.innerHTML = content2;
    block2.innerHTML = content1;
    
    // 触发编辑器更新
    if (editor) {
      editor.commands.focus();
    }
  };

  const deleteBlock = () => {
    if (!editor || !currentBlock) return;
    
    // 简单删除DOM元素
    currentBlock.remove();
    setShowToolbar(false);
    
    // 触发编辑器更新
    editor.commands.focus();
  };

  const duplicateBlock = () => {
    if (!editor || !currentBlock) return;
    
    // 克隆当前块
    const clonedBlock = currentBlock.cloneNode(true) as HTMLElement;
    
    // 插入到当前块后面
    if (currentBlock.parentNode) {
      currentBlock.parentNode.insertBefore(clonedBlock, currentBlock.nextSibling);
    }
    
    setShowToolbar(false);
    
    // 触发编辑器更新
    editor.commands.focus();
  };

  const insertBlockAbove = () => {
    if (!editor || !currentBlock) return;
    
    // 创建新的段落
    const newBlock = document.createElement('p');
    newBlock.innerHTML = '<br>';
    
    // 插入到当前块前面
    if (currentBlock.parentNode) {
      currentBlock.parentNode.insertBefore(newBlock, currentBlock);
    }
    
    setShowToolbar(false);
    
    // 触发编辑器更新并聚焦新块
    editor.commands.focus();
  };

  // 拖拽功能
  const handleDragStart = (e: React.DragEvent) => {
    if (!currentBlock) return;
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'block-move');
    
    // 存储当前块的索引
    const blocks = getAllBlocks();
    const currentIndex = blocks.indexOf(currentBlock);
    e.dataTransfer.setData('application/json', JSON.stringify({
      sourceIndex: currentIndex,
      sourceContent: currentBlock.outerHTML
    }));
    
    // 添加拖拽样式
    currentBlock.style.opacity = '0.5';
    currentBlock.style.transform = 'rotate(2deg)';
    
    setShowToolbar(false);
  };

  const handleDragEnd = () => {
    if (currentBlock) {
      currentBlock.style.opacity = '';
      currentBlock.style.transform = '';
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) return;
      
      const { sourceIndex } = JSON.parse(dragData);
      
      const target = e.target as HTMLElement;
      const targetBlock = target.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre') as HTMLElement;
      
      if (targetBlock) {
        const blocks = getAllBlocks();
        const targetIndex = blocks.indexOf(targetBlock);
        const sourceBlock = blocks[sourceIndex] as HTMLElement;
        
        if (sourceBlock && targetBlock && sourceBlock !== targetBlock) {
          // 简单的DOM重排
          if (sourceIndex < targetIndex) {
            // 向下移动
            targetBlock.parentNode?.insertBefore(sourceBlock, targetBlock.nextSibling);
          } else {
            // 向上移动
            targetBlock.parentNode?.insertBefore(sourceBlock, targetBlock);
          }
          
          // 触发编辑器更新
          if (editor) {
            editor.commands.focus();
          }
        }
      }
    } catch (error) {
      console.error('拖拽处理错误:', error);
    }
    
    handleDragEnd();
  };

  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) return; // 拖拽时不处理hover
      
      const target = event.target as HTMLElement;
      
      // 检查是否在工具栏上
      if (toolbarRef.current && toolbarRef.current.contains(target)) {
        clearHideTimeout();
        return;
      }
      
      // 查找块级元素
      const blockElement = target.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre');
      
      if (blockElement) {
        showToolbarForBlock(blockElement as HTMLElement);
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
  }, [editor, showToolbarForBlock, scheduleHide, clearHideTimeout, isDragging]);

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

  // 添加CSS样式
  useEffect(() => {
    const styleId = 'simple-drag-block-styles';
    
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
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
      .ProseMirror pre:hover {
        background-color: rgba(59, 130, 246, 0.05);
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
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
      
      .simple-drag-toolbar {
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: opacity 0.2s ease;
      }
      
      .simple-drag-toolbar button,
      .simple-drag-toolbar div {
        transition: all 0.2s ease;
      }
      
      .simple-drag-toolbar button:hover,
      .simple-drag-toolbar div:hover {
        background-color: rgba(59, 130, 246, 0.1);
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* 简单的拖拽工具栏 */}
      {showToolbar && currentBlock && (
        <div
          ref={toolbarRef}
          className="simple-drag-toolbar fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 p-1 flex flex-col gap-1"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y,
          }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          {/* 拖拽手柄 */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-grab active:cursor-grabbing"
            title="拖拽移动"
          >
            <GripVertical size={14} />
          </div>

          {/* 向上移动 */}
          <button
            onClick={moveBlockUp}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="向上移动"
          >
            <ChevronUp size={14} />
          </button>

          {/* 向下移动 */}
          <button
            onClick={moveBlockDown}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="向下移动"
          >
            <ChevronDown size={14} />
          </button>

          {/* 插入按钮 */}
          <button
            onClick={insertBlockAbove}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="在上方插入"
          >
            <Plus size={14} />
          </button>

          {/* 复制 */}
          <button
            onClick={duplicateBlock}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="复制块"
          >
            <Copy size={14} />
          </button>

          {/* 删除 */}
          <button
            onClick={deleteBlock}
            className="p-2 hover:bg-gray-100 rounded text-red-600"
            title="删除块"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleDragBlockManager;
