import React, { useMemo } from 'react';
import { ExternalLink, Trash2, File as FileIcon, FileText, Image as ImageIcon, FileSpreadsheet, FileArchive, FileCode, FileAudio, FileVideo } from 'lucide-react';
import useStore, { Cell as StoreCell } from '../../../store/notebookStore';
import usePreviewStore from '../../../store/previewStore';
import { Backend_BASE_URL } from '../../../config/base_url';

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
  const label = href.split(/[\\/]/).pop() || href; // basename 或完整
  return { href, label };
}

const LinkCell: React.FC<LinkCellProps> = ({ cell, readOnly = false, onDelete, className = '', onFocus, onBlur, isInDetachedView = false }) => {
  const updateCell = useStore(s => s.updateCell);
  const notebookId = useStore(s => s.notebookId);
  const setDetachedCellId = useStore(s => s.setDetachedCellId);

  const { href, label } = useMemo(() => parseContent(cell.content || ''), [cell.content]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCell(cell.id, e.target.value);
  };

  // 根据文件名返回图标元素
  const getFileIconElement = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.svg|\.webp)$/.test(lower)) return <ImageIcon size={18} className="text-gray-600"/>;
    if (/\.pdf$/.test(lower)) return <FileText size={18} className="text-gray-600"/>;
    if (/\.csv$/.test(lower)) return <FileSpreadsheet size={18} className="text-gray-600"/>;
    if (/(\.txt|\.md|\.json|\.html|\.css)$/.test(lower)) return <FileText size={18} className="text-gray-600"/>;
    if (/(\.zip|\.rar|\.7z|\.tar|\.gz)$/.test(lower)) return <FileArchive size={18} className="text-gray-600"/>;
    if (/(\.js|\.ts|\.py|\.java|\.go|\.rs|\.c|\.cpp)$/.test(lower)) return <FileCode size={18} className="text-gray-600"/>;
    if (/(\.mp3|\.wav|\.m4a|\.flac)$/.test(lower)) return <FileAudio size={18} className="text-gray-600"/>;
    if (/(\.mp4|\.mov|\.avi|\.mkv)$/.test(lower)) return <FileVideo size={18} className="text-gray-600"/>;
    return <FileIcon size={18} className="text-gray-600"/>;
  };



  const normalizeFilePath = (url: string): string | null => {
    // Match backend download URL: `${Backend_BASE_URL}/download_file/${notebookId}/${filename}`
    try {
      const base = Backend_BASE_URL?.replace(/\/$/, '');
      const pattern = new RegExp(`^${base}/download_file/${notebookId}/(.+)$`);
      const m = url.match(pattern);
      if (m && m[1]) return decodeURIComponent(m[1]);
    } catch {}

    // Relative path
    const relPattern = new RegExp('^(\\.|\\.\\.|[^:/?#]+$|\\.\\/\\.assets\\/|\\.assets\\/)');
    if (relPattern.test(url)) {
      return url.replace(new RegExp('^\\./'), '');
    }
    // Direct file name
    if (!/^[a-z]+:\/\//i.test(url) && url.indexOf('/') === -1) return url;

    return null; // Not a notebook-managed file
  };

  const openInSplitPreview = async () => {
    // 打开分屏（右侧为 PreviewApp），并驱动预览存储加载文件
    setDetachedCellId(cell.id);

    if (!href || !notebookId) return;
    const filePath = normalizeFilePath(href);

    // 外部链接：新开窗口
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
      // 兜底：如果 .assets 下不存在，则尝试 notebook 根目录同名文件
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

    // 切换到文件预览模式
    if (usePreviewStore.getState().previewMode !== 'file') {
      usePreviewStore.getState().changePreviewMode();
    }
  };

  return (
    <div
      className={`w-full border border-gray-200 rounded-lg bg-white shadow-sm p-3 flex flex-col gap-2 ${className}`}
      onFocus={onFocus}
      onBlur={onBlur}
      data-cell-id={cell.id}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-gray-700 min-w-0">
          {getFileIconElement(label)}
          <span className="text-sm font-medium truncate" title={label}>{label}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
            {label.split('.').pop()?.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isInDetachedView && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInSplitPreview(); }}
              className="text-theme-700 hover:text-theme-600 px-2 py-1 text-xs rounded inline-flex items-center gap-1"
              title="在分屏中预览"
              type="button"
            >
              <ExternalLink size={14} /> 分屏预览
            </button>
          )}

          {onDelete && (
            <button onClick={onDelete} className="text-red-600 hover:text-red-700 px-2 py-1 text-xs rounded inline-flex items-center gap-1" title="删除">
              <Trash2 size={14} /> 删除
            </button>
          )}
        </div>
      </div>

      {!readOnly && (
        <input
          type="text"
          value={cell.content || ''}
          onChange={handleChange}
          placeholder="输入外部文件路径或链接，例如 file:///Users/you/Doc.pdf，./notes/today.md，https://example.com"
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-theme-200"
        />
      )}

      <div className="text-sm">
        {href ? (
          <a
            href={(function(){
              const filePath = normalizeFilePath(href);
              if (!filePath || !notebookId) return href;
              try {
                const base = Backend_BASE_URL?.replace(/\/$/, '') || '';
                return `${base}/download_file/${notebookId}/${encodeURIComponent(filePath)}`;
              } catch { return href; }
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-700 hover:text-theme-600 underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {label}
          </a>
        ) : (
          <span className="text-gray-400">未设置链接</span>
        )}
      </div>

      {href.startsWith('file://') && (
        <div className="text-xs text-gray-500">
          浏览器可能无法直接打开 file:// 链接，如受限请使用本地应用打开。
        </div>
      )}
    </div>
  );
};

export default LinkCell;

