import { memo, useCallback, useEffect } from 'react';
import {
  Copy,
  Trash2,
  Edit3,
  Eye,
  Maximize2,
  Layers,
  Settings,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface ContextMenuProps {
  id: string;
  top: number;
  left: number;
  right?: number;
  bottom?: number;
  onClose: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onViewDetails?: () => void;
  onEnterInternal?: () => void;
  onRun?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  type?: 'node' | 'edge' | 'pane';
}

export const ContextMenu = memo(({
  id,
  top,
  left,
  right,
  bottom,
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
  onViewDetails,
  onEnterInternal,
  onRun,
  onPause,
  onReset,
  type = 'node',
}: ContextMenuProps) => {
  const handleClick = useCallback((callback?: () => void) => {
    callback?.();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const menuItems = {
    node: [
      onViewDetails && {
        icon: <Eye className="w-4 h-4" />,
        label: 'View Details',
        onClick: () => handleClick(onViewDetails),
        className: 'text-blue-600 hover:bg-blue-50',
      },
      onEnterInternal && {
        icon: <Layers className="w-4 h-4" />,
        label: 'Enter Internal View',
        onClick: () => handleClick(onEnterInternal),
        className: 'text-purple-600 hover:bg-purple-50',
      },
      { type: 'divider' },
      onRun && {
        icon: <Play className="w-4 h-4" />,
        label: 'Run Node',
        onClick: () => handleClick(onRun),
        className: 'text-green-600 hover:bg-green-50',
      },
      onPause && {
        icon: <Pause className="w-4 h-4" />,
        label: 'Pause',
        onClick: () => handleClick(onPause),
        className: 'text-orange-600 hover:bg-orange-50',
      },
      onReset && {
        icon: <RotateCcw className="w-4 h-4" />,
        label: 'Reset State',
        onClick: () => handleClick(onReset),
        className: 'text-gray-600 hover:bg-gray-50',
      },
      { type: 'divider' },
      onEdit && {
        icon: <Edit3 className="w-4 h-4" />,
        label: 'Edit Properties',
        onClick: () => handleClick(onEdit),
        className: 'text-gray-700 hover:bg-gray-50',
      },
      onDuplicate && {
        icon: <Copy className="w-4 h-4" />,
        label: 'Duplicate',
        onClick: () => handleClick(onDuplicate),
        className: 'text-gray-700 hover:bg-gray-50',
      },
      { type: 'divider' },
      onDelete && {
        icon: <Trash2 className="w-4 h-4" />,
        label: 'Delete',
        onClick: () => handleClick(onDelete),
        className: 'text-red-600 hover:bg-red-50',
      },
    ].filter(Boolean),
    edge: [
      onEdit && {
        icon: <Settings className="w-4 h-4" />,
        label: 'Edit Connection',
        onClick: () => handleClick(onEdit),
        className: 'text-gray-700 hover:bg-gray-50',
      },
      { type: 'divider' },
      onDelete && {
        icon: <Trash2 className="w-4 h-4" />,
        label: 'Delete Connection',
        onClick: () => handleClick(onDelete),
        className: 'text-red-600 hover:bg-red-50',
      },
    ].filter(Boolean),
    pane: [
      {
        icon: <Maximize2 className="w-4 h-4" />,
        label: 'Fit View',
        onClick: () => handleClick(),
        className: 'text-gray-700 hover:bg-gray-50',
      },
    ],
  };

  const items = menuItems[type];

  return (
    <div
      className="fixed z-50 animate-in fade-in slide-in-from-top-1 duration-200"
      style={{ top, left, right, bottom }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="min-w-[200px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div
          className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100"
          style={{
            background: 'linear-gradient(135deg, rgba(249,250,251,1) 0%, rgba(243,244,246,1) 100%)',
          }}
        >
          {type === 'node' ? 'Node Actions' : type === 'edge' ? 'Connection Actions' : 'Canvas Actions'}
        </div>

        {/* Menu items */}
        <div className="py-1">
          {items.map((item, index) => {
            if (!item) return null;

            if ('type' in item && item.type === 'divider') {
              return <div key={`divider-${index}`} className="my-1 border-t border-gray-100" />;
            }

            const menuItem = item as any;

            return (
              <button
                key={index}
                onClick={menuItem.onClick}
                className={`
                  w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium
                  transition-all duration-150
                  ${menuItem.className}
                `}
              >
                <div className="flex-shrink-0">{menuItem.icon}</div>
                <span>{menuItem.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100"
          style={{
            background: 'linear-gradient(135deg, rgba(249,250,251,1) 0%, rgba(243,244,246,1) 100%)',
          }}
        >
          Right-click for more options
        </div>
      </div>
    </div>
  );
});

ContextMenu.displayName = 'ContextMenu';
