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

interface ImprovedBlockManagerProps {
  editor: Editor | null;
  children: React.ReactNode;
}

const ImprovedBlockManager: React.FC<ImprovedBlockManagerProps> = ({
  editor,
  children
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [currentBlockPos, setCurrentBlockPos] = useState<number | null>(null);
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
      setCurrentBlockPos(null);
    }, 300);
  }, [clearHideTimeout]);

  // 获取块在 ProseMirror 文档中的准确位置
  const getBlockPosition = useCallback((blockElement: HTMLElement): number | null => {
    if (!editor) return null;
    
    try {
      const view = editor.view;
      const rect = blockElement.getBoundingClientRect();
      const editorRect = view.dom.getBoundingClientRect();
      
      // 计算块中心点的相对坐标
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // 获取 ProseMirror 位置
      const coords = view.posAtCoords({ left: centerX, top: centerY });
      if (!coords) return null;
      
      // 确保位置是块级节点的开始位置
      const resolvedPos = view.state.doc.resolve(coords.pos);
      const blockPos = resolvedPos.start(resolvedPos.depth);
      
      return blockPos;
    } catch (error) {
      console.error('获取块位置失败:', error);
      return null;
    }
  }, [editor]);

  // 显示工具栏
  const showToolbarForBlock = useCallback((blockElement: HTMLElement) => {
    clearHideTimeout();
    
    const pos = getBlockPosition(blockElement);
    if (pos === null) return;
    
    if (pos !== currentBlockPos) {
      setCurrentBlockPos(pos);
      
      const rect = blockElement.getBoundingClientRect();
      setToolbarPosition({
        x: rect.left - 60,
        y: rect.top + window.scrollY
      });
    }
    
    setShowToolbar(true);
  }, [currentBlockPos, getBlockPosition, clearHideTimeout]);

  // 获取当前块的节点信息
  const getCurrentNode = useCallback(() => {
    if (!editor || currentBlockPos === null) return null;
    
    try {
      const resolvedPos = editor.state.doc.resolve(currentBlockPos);
      return {
        pos: currentBlockPos,
        node: resolvedPos.nodeAfter,
        resolvedPos
      };
    } catch {
      return null;
    }
  }, [editor, currentBlockPos]);

  // 向上移动块
  const moveBlockUp = useCallback(() => {
    const nodeInfo = getCurrentNode();
    if (!nodeInfo || !editor) return;
    
    const { pos, node } = nodeInfo;
    if (!node) return;
    
    const tr = editor.state.tr;
    
    // 查找前一个同级块
    let prevPos = pos - 1;
    let prevNode = null;
    
    while (prevPos >= 0) {
      const resolvedPrevPos = tr.doc.resolve(prevPos);
      const candidateNode = resolvedPrevPos.nodeBefore;
      
      if (candidateNode && candidateNode.isBlock) {
        prevNode = candidateNode;
        prevPos = resolvedPrevPos.pos - candidateNode.nodeSize;
        break;
      }
      prevPos--;
    }
    
    if (prevNode && prevPos >= 0) {
      // 先删除当前节点
      tr.delete(pos, pos + node.nodeSize);
      // 在前一个节点前面插入
      tr.insert(prevPos, node);
      
      editor.view.dispatch(tr);
    }
    
    setShowToolbar(false);
  }, [getCurrentNode, editor]);

  // 向下移动块
  const moveBlockDown = useCallback(() => {
    const nodeInfo = getCurrentNode();
    if (!nodeInfo || !editor) return;
    
    const { pos, node } = nodeInfo;
    if (!node) return;
    
    const tr = editor.state.tr;
    
    // 查找下一个同级块
    let nextPos = pos + node.nodeSize;
    let nextNode = null;
    
    while (nextPos < tr.doc.content.size) {
      const resolvedNextPos = tr.doc.resolve(nextPos);
      const candidateNode = resolvedNextPos.nodeAfter;
      
      if (candidateNode && candidateNode.isBlock) {
        nextNode = candidateNode;
        break;
      }
      nextPos++;
    }
    
    if (nextNode) {
      // 先删除当前节点
      tr.delete(pos, pos + node.nodeSize);
      // 在下一个节点后面插入
      const insertPos = nextPos - node.nodeSize + nextNode.nodeSize;
      tr.insert(insertPos, node);
      
      editor.view.dispatch(tr);
    }
    
    setShowToolbar(false);
  }, [getCurrentNode, editor]);

  // 删除块
  const deleteBlock = useCallback(() => {
    const nodeInfo = getCurrentNode();
    if (!nodeInfo || !editor) return;
    
    const { pos, node } = nodeInfo;
    if (!node) return;
    
    const tr = editor.state.tr;
    tr.delete(pos, pos + node.nodeSize);
    editor.view.dispatch(tr);
    
    setShowToolbar(false);
  }, [getCurrentNode, editor]);

  // 复制块
  const duplicateBlock = useCallback(() => {
    const nodeInfo = getCurrentNode();
    if (!nodeInfo || !editor) return;
    
    const { pos, node } = nodeInfo;
    if (!node) return;
    
    const tr = editor.state.tr;
    const duplicatedNode = node.copy(node.content);
    const insertPos = pos + node.nodeSize;
    tr.insert(insertPos, duplicatedNode);
    editor.view.dispatch(tr);
    
    setShowToolbar(false);
  }, [getCurrentNode, editor]);

  // 在上方插入新块
  const insertBlockAbove = useCallback(() => {
    if (!editor || currentBlockPos === null) return;
    
    const schema = editor.state.schema;
    const newParagraph = schema.nodes.paragraph.create();
    
    editor.chain()
      .focus()
      .insertContentAt(currentBlockPos, newParagraph.toJSON())
      .run();
    
    setShowToolbar(false);
  }, [editor, currentBlockPos]);

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (currentBlockPos === null || !editor) return;
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    
    e.dataTransfer.setData('application/json', JSON.stringify({
      sourcePos: currentBlockPos,
      type: 'improved-block-move'
    }));
    
    // 不立即隐藏工具栏，让用户看到拖拽反馈
    // setShowToolbar(false);
    
    // 添加拖拽样式到当前块
    const currentNode = getCurrentNode();
    if (currentNode) {
      // 通过查找对应的DOM元素添加拖拽样式
      setTimeout(() => {
        const blockElements = Array.from(containerRef.current?.querySelectorAll('.ProseMirror [data-block-id]') || []);
        const currentBlockElement = blockElements.find(el => {
          const pos = getBlockPosition(el as HTMLElement);
          return pos === currentBlockPos;
        });
        if (currentBlockElement) {
          (currentBlockElement as HTMLElement).style.opacity = '0.5';
          (currentBlockElement as HTMLElement).style.transform = 'rotate(2deg)';
        }
      }, 0);
    }
  }, [currentBlockPos, editor, getCurrentNode, getBlockPosition]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    // 清除拖拽样式
    const blockElements = Array.from(containerRef.current?.querySelectorAll('.ProseMirror [data-block-id]') || []);
    blockElements.forEach(el => {
      (el as HTMLElement).style.opacity = '';
      (el as HTMLElement).style.transform = '';
    });
    
    // 延迟一点时间后重新显示工具栏，避免立即显示造成闪烁
    setTimeout(() => {
      if (!isDragging) {
        const hoveredElement = document.elementFromPoint(
          toolbarPosition.x + 60, // 工具栏右侧位置
          toolbarPosition.y + 20   // 工具栏中间位置
        );
        
        if (hoveredElement) {
          const blockElement = hoveredElement.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre');
          if (blockElement) {
            showToolbarForBlock(blockElement as HTMLElement);
          }
        }
      }
    }, 100);
  }, [isDragging, toolbarPosition, showToolbarForBlock]);

  // 拖拽放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) return;
      
      const { sourcePos, type } = JSON.parse(dragData);
      if (type !== 'improved-block-move' || typeof sourcePos !== 'number') return;
      
      const target = e.target as HTMLElement;
      const targetBlock = target.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre') as HTMLElement;
      
      if (targetBlock && editor) {
        const targetPos = getBlockPosition(targetBlock);
        if (targetPos !== null && targetPos !== sourcePos) {
          const tr = editor.state.tr;
          const sourceResolvedPos = tr.doc.resolve(sourcePos);
          const sourceNode = sourceResolvedPos.nodeAfter;
          
          if (sourceNode) {
            // 删除源节点
            tr.delete(sourcePos, sourcePos + sourceNode.nodeSize);
            
            // 计算新的插入位置
            let insertPos = targetPos;
            if (sourcePos < targetPos) {
              insertPos = targetPos - sourceNode.nodeSize;
            }
            
            // 插入到目标位置
            tr.insert(insertPos, sourceNode);
            editor.view.dispatch(tr);
          }
        }
      }
    } catch (error) {
      console.error('拖拽处理错误:', error);
    }
    
    handleDragEnd();
  }, [editor, getBlockPosition, handleDragEnd]);

  // 监听鼠标移动
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

  return (
    <div 
      ref={containerRef} 
      className="relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={handleDrop}
    >
      {children}
      
      {/* 改进的块管理工具栏 */}
      {showToolbar && currentBlockPos !== null && (
        <div
          ref={toolbarRef}
          className="fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 p-1 flex flex-col gap-1 backdrop-blur-sm"
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
            className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-grab active:cursor-grabbing transition-colors"
            title="拖拽移动"
          >
            <GripVertical size={14} />
          </div>

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

          {/* 插入按钮 */}
          <button
            onClick={insertBlockAbove}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="在上方插入"
          >
            <Plus size={14} />
          </button>

          {/* 复制 */}
          <button
            onClick={duplicateBlock}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="复制块"
          >
            <Copy size={14} />
          </button>

          {/* 删除 */}
          <button
            onClick={deleteBlock}
            className="p-2 hover:bg-gray-100 rounded text-red-600 transition-colors"
            title="删除块"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* 内联样式 */}
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
        .ProseMirror pre:hover {
          background-color: rgba(59, 130, 246, 0.05);
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default ImprovedBlockManager;