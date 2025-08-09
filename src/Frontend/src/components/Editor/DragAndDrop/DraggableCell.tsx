import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface Cell {
  id: string;
  type: string;
  content: string;
  outputs?: any[];
  [key: string]: any;
}

interface DraggableCellProps {
  cell: Cell;
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

const DraggableCell = forwardRef<HTMLDivElement, DraggableCellProps>(
  ({ cell, children, isActive = false, className = '' }, ref) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: cell.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    // 合并refs
    const combinedRef = (node: HTMLDivElement) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div
        ref={combinedRef}
        style={style}
        className={`
          relative group
          ${isDragging ? 'opacity-50 z-50' : ''}
          ${isActive ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}
          ${className}
        `}
      >
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8
            w-6 h-6 flex items-center justify-center
            text-gray-400 hover:text-gray-600
            cursor-grab active:cursor-grabbing
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            bg-white rounded border border-gray-200 shadow-sm
            hover:shadow-md hover:border-gray-300
            z-10
          `}
          title="拖拽重新排序"
        >
          <GripVertical size={14} />
        </div>

        {/* Cell内容 */}
        <div
          className={`
            relative
            ${isDragging ? 'pointer-events-none' : ''}
          `}
        >
          {children}
        </div>

        {/* 拖拽时的视觉指示器 */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-30 rounded-lg border-2 border-dashed border-blue-300" />
        )}
      </div>
    );
  }
);

DraggableCell.displayName = 'DraggableCell';

export default DraggableCell;
