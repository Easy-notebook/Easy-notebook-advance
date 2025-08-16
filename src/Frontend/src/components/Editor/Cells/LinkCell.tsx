import React, { useMemo } from 'react';
import { ExternalLink, Trash2, Minimize2, Maximize2, Split } from 'lucide-react';
import { Icon } from '@fluentui/react/lib/Icon';
import { getFileTypeIconProps, initializeFileTypeIcons } from '@fluentui/react-file-type-icons';
import useStore, { Cell as StoreCell } from '../../../store/notebookStore';
import usePreviewStore from '../../../store/previewStore';
import { Backend_BASE_URL } from '../../../config/base_url';

// Initialize file type icons
initializeFileTypeIcons();

interface LinkCellProps {
  cell: StoreCell;
  readOnly?: boolean;
  onDelete?: () => void;
  className?: string;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  isInDetachedView?: boolean;
}

function parseContent(content: string): { href: string; label: string } {
  const md = content.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (md) {
    const label = md[1].trim();
    const href = md[2].trim();
    return { href, label };
  }
  const href = (content || '').trim();
  const label = href.split(/[\\/]/).pop() || href;
  return { href, label };
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

const LinkCell: React.FC<LinkCellProps> = ({ 
  cell, 
  readOnly = false, 
  onDelete, 
  className = '', 
  onFocus, 
  onBlur, 
  isInDetachedView = false 
}) => {
  const updateCell = useStore(s => s.updateCell);
  const notebookId = useStore(s => s.notebookId);
  const setDetachedCellId = useStore(s => s.setDetachedCellId);
  const detachedCellId = useStore(s => s.detachedCellId);
  const isDetachedCellFullscreen = useStore(s => s.isDetachedCellFullscreen);
  const toggleDetachedCellFullscreen = useStore(s => s.toggleDetachedCellFullscreen);

  // Check if this cell is currently detached
  const isDetached = detachedCellId === cell.id;

  const { href, label } = useMemo(() => parseContent(cell.content || ''), [cell.content]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCell(cell.id, e.target.value);
  };

  // Get file extension and icon props
  const fileExtension = useMemo(() => {
    const parts = label.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }, [label]);

  const iconProps = useMemo(() => {
    if (!href) return getFileTypeIconProps({ extension: 'generic', size: 32 });
    
    // Special handling for URLs
    if (/^https?:\/\//i.test(href)) {
      return getFileTypeIconProps({ extension: 'html', size: 32 });
    }
    
    return getFileTypeIconProps({ 
      extension: fileExtension || 'generic',
      size: 32
    });
  }, [href, fileExtension]);

  const normalizeFilePath = (url: string): string | null => {
    try {
      const base = Backend_BASE_URL?.replace(/\/$/, '');
      const pattern = new RegExp(`^${base}/download_file/${notebookId}/(.+)$`);
      const m = url.match(pattern);
      if (m && m[1]) return decodeURIComponent(m[1]);
    } catch {}

    const relPattern = new RegExp('^(\\.|\\.\\.|[^:/?#]+$|\\.\\/\\.assets\\/|\\.assets\\/)');
    if (relPattern.test(url)) {
      return url.replace(new RegExp('^\\./'), '');
    }
    
    if (!/^[a-z]+:\/\//i.test(url) && url.indexOf('/') === -1) return url;

    return null;
  };

  const openInSplitPreview = async () => {
    setDetachedCellId(cell.id);

    if (!href || !notebookId) return;
    const filePath = normalizeFilePath(href);

    if (!filePath) {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    try {
      const fileObj = { name: filePath.split('/').pop() || filePath, path: filePath, type: 'file' } as any;
      await usePreviewStore.getState().previewFile(notebookId, filePath, { file: fileObj } as any);
    } catch (err: any) {
      console.error('Open split preview failed:', err);
      try {
        const baseName = (filePath || href).split('/').pop() || '';
        if (baseName && baseName !== filePath) {
          const fileObj2 = { name: baseName, path: baseName, type: 'file' } as any;
          await usePreviewStore.getState().previewFile(notebookId, baseName, { file: fileObj2 } as any);
        }
      } catch (e) {
        console.error('Fallback to root failed:', e);
      }
    }
  };

  const handleOpen = () => {
    if (!href) return;
    
    const filePath = normalizeFilePath(href);
    if (!filePath || !notebookId) {
      // External link
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    // Internal file - construct download URL
    try {
      const base = Backend_BASE_URL?.replace(/\/$/, '') || '';
      const downloadUrl = `${base}/download_file/${notebookId}/${encodeURIComponent(filePath)}`;
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  if (!readOnly && !href) {
    // Edit mode when no href is set
    return (
      <div
        className={`w-full border border-gray-200 rounded-lg bg-white shadow-sm p-4 ${className}`}
        onFocus={onFocus}
        onBlur={onBlur}
        data-cell-id={cell.id}
      >
        <input
          type="text"
          value={cell.content || ''}
          onChange={handleChange}
          placeholder="输入文件路径或链接 (例如: ./document.pdf, https://example.com)"
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
      </div>
    );
  }

  // Show detached state indicator if this cell is in split view
  if (isDetached && !isInDetachedView) {
    return (
      <div className="flex justify-start">
        <div className="max-w-md bg-theme-50/50 border border-theme-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-theme-500" />
              <span className="text-sm font-medium text-theme-700">Attachment opened in split view</span>
            </div>
            <button
              onClick={() => setDetachedCellId(null)}
              className="p-1.5 hover:bg-theme-200 rounded text-theme-700"
              title="Return to normal view"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Attachment card style
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-md bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
        onFocus={onFocus}
        onBlur={onBlur}
        data-cell-id={cell.id}
      >
      <div className="flex items-center p-3 gap-3">
        {/* File Icon */}
        <div className="flex-shrink-0">
          <div 
            className="w-10 h-10 flex items-center justify-center rounded"
            style={{ 
              backgroundColor: iconProps.iconColor ? `${iconProps.iconColor}15` : '#f3f4f6'
            }}
          >
            <Icon {...iconProps} />
          </div>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div 
            className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleOpen}
            title={label}
          >
            {label}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {fileExtension && (
              <span className="uppercase">{fileExtension} • </span>
            )}
            {href.startsWith('http') ? '外部链接' : '本地文件'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isInDetachedView ? (
            /* Detached view toolbar */
            <>
              <button
                onClick={toggleDetachedCellFullscreen}
                className="p-1.5 hover:bg-gray-200 rounded"
                title={isDetachedCellFullscreen ? "Switch to split view" : "Switch to fullscreen"}
                type="button"
              >
                {isDetachedCellFullscreen ? <Split size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setDetachedCellId(null)}
                className="p-1.5 hover:bg-red-200 rounded text-red-600"
                title="Close detached view"
                type="button"
              >
                <Minimize2 size={16} />
              </button>
            </>
          ) : (
            /* Normal view actions */
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openInSplitPreview();
                }}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="分屏预览"
                type="button"
              >
                <ExternalLink size={16} />
              </button>

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="删除"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit input (if not readonly and content exists) */}
      {!readOnly && href && (
        <div className="px-3 pb-3">
          <input
            type="text"
            value={cell.content || ''}
            onChange={handleChange}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="编辑路径..."
          />
        </div>
      )}

      {/* Warning for file:// protocol */}
      {href.startsWith('file://') && (
        <div className="px-3 pb-3">
          <div className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
            ⚠️ 浏览器可能限制 file:// 协议，建议使用相对路径
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default LinkCell;