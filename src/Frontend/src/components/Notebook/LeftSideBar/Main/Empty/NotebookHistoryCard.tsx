// LeftSideBar/Main/Empty/NotebookHistoryCard.tsx
// Compact notebook card for sidebar history display

import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { Button, Skeleton } from 'antd';
import { Star, Clock } from 'lucide-react';
import { FileORM } from '@Storage/index';
import { CodeCell,MarkdownCell, HybridCell, ImageCell, LinkCell } from '@Editor/Cells';
import { formatTime } from '../../../../Senario/State/LibraryState/utils';
import type { NotebookHistoryCardProps } from './types';

interface PreviewCell {
  id: string;
  type: 'code' | 'markdown' | 'hybrid' | 'Hybrid' | 'image' | 'link' | string;
  content: string;
  outputs?: unknown[];
  metadata?: Record<string, unknown>;
}

const NotebookHistoryCard: React.FC<NotebookHistoryCardProps> = memo(({
  notebook,
  onSelect,
  onToggleStar
}) => {
  const [previewCells, setPreviewCells] = useState<PreviewCell[]>([]);
  const [loading, setLoading] = useState(false);

  // Load notebook cells for preview
  useEffect(() => {
    let cancelled = false;

    const loadCells = async () => {
      try {
        setLoading(true);
        const main = await FileORM.getFile(notebook.id, `notebook_${notebook.id}.json`);
        const raw = main?.content;

        if (!raw) {
          if (!cancelled) setPreviewCells([]);
          return;
        }

        let text = '';
        if (typeof raw === 'string') {
          text = raw;
        } else if (raw && typeof (raw as any).text === 'function') {
          text = await (raw as Blob).text();
        }

        if (!text) {
          if (!cancelled) setPreviewCells([]);
          return;
        }

        const parsed = JSON.parse(text);
        const cells = parsed?.cells || [];
        
        // Get first few cells for preview
        const previewData = cells.slice(0, 2).map((cell: any, index: number) => {
          let content = '';
          if (typeof cell.content === 'string') {
            content = cell.content;
          } else if (Array.isArray(cell.content)) {
            content = cell.content.join('\n');
          }

          return {
            id: cell.id || `preview-${index}`,
            type: cell.type || 'markdown',
            content: content.slice(0, 200), // Limit content for preview
            outputs: cell.outputs || [],
            metadata: cell.metadata || {},
          };
        });

        if (!cancelled) {
          setPreviewCells(previewData);
        }
      } catch (error) {
        console.error('Failed to load notebook preview:', error);
        if (!cancelled) setPreviewCells([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCells();

    return () => {
      cancelled = true;
    };
  }, [notebook.id]);

  const handleCardClick = useCallback(async () => {
    try {
      // Align with LibraryState: load notebook, then prepare preview tabs
      const { default: useNotebookStore } = await import('@Store/notebookStore');
      const store = useNotebookStore.getState();
      const loaded = await store.loadFromDatabase(notebook.id);

      if (loaded) {
        const { default: usePreviewStore } = await import('@Store/previewStore');
        const previewStore = usePreviewStore.getState();
        previewStore.setCurrentPreviewFiles([]);
        previewStore.setActiveFile(null);
        previewStore.setActivePreviewMode(null);
        try {
          await previewStore.loadNotebookTabs(notebook.id);
        } catch {}
      } else {
        store.setNotebookId(notebook.id);
        store.setNotebookTitle(notebook.title || notebook.name || `Notebook ${notebook.id.slice(0, 8)}`);
        store.clearCells();
      }

      onSelect(notebook.id, notebook.title);
    } catch (e) {
      // Fallback: still call onSelect to navigate
      onSelect(notebook.id, notebook.title);
    }
  }, [notebook.id, notebook.title, onSelect]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar(notebook.id, e);
  }, [notebook.id, onToggleStar]);

  // Render cell preview in a compact way
  const renderCellPreview = useCallback((cell: PreviewCell) => {
    const cellProps = {
      cell: {
        ...cell,
        enableEdit: false,
      },
      isPreview: true,
      className: "text-xs opacity-75 pointer-events-none",
      style: { 
        transform: 'scale(0.8)',
        transformOrigin: 'top left',
        maxHeight: '60px',
        overflow: 'hidden'
      }
    };

    try {
      switch (cell.type.toLowerCase()) {
        case 'markdown':
          return <MarkdownCell key={cell.id} {...cellProps} />;
        case 'code':
          return <CodeCell key={cell.id} {...cellProps} />;
        case 'hybrid':
          return <HybridCell key={cell.id} {...cellProps} />;
        case 'image':
          return <ImageCell key={cell.id} {...cellProps} />;
        case 'link':
          return <LinkCell key={cell.id} {...cellProps} />;
        default:
          return (
            <div key={cell.id} className="text-xs text-gray-600 truncate">
              {cell.content.slice(0, 100)}
            </div>
          );
      }
    } catch (error) {
      return (
        <div key={cell.id} className="text-xs text-gray-400 italic">
          Preview unavailable
        </div>
      );
    }
  }, []);

  // Notebook preview cover for sidebar
  const notebookPreviewCover = useMemo(
    () => (
      <div className="h-20 bg-slate-50 overflow-hidden relative border-b border-slate-200">
        <div className="p-2 space-y-1">
          {loading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : previewCells.length > 0 ? (
            previewCells.map((cell) => renderCellPreview(cell))
          ) : (
            <div className="text-slate-400 text-xs p-2 text-center">
              <div className="text-base mb-1">📝</div>
              <div>Empty</div>
            </div>
          )}
        </div>

        {/* Bottom fade gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-50 to-transparent" />

        {/* Star indicator */}
        {notebook.isStarred && (
          <div className="absolute top-1 right-1">
            <Star className="w-3 h-3 text-amber-500 fill-current drop-shadow-[0_2px_6px_rgba(245,158,11,0.5)]" />
          </div>
        )}

        {/* Last accessed time */}
        <div className="absolute top-1 left-1 rounded px-1.5 py-0.5 text-xs text-slate-600 bg-white/90 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-0.5">
            <Clock className="w-2 h-2" />
            {formatTime(notebook.lastAccessedAt)}
          </div>
        </div>
      </div>
    ),
    [notebook.isStarred, notebook.lastAccessedAt, previewCells, renderCellPreview, loading],
  );

  return (
    <div
      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:border-[#4F9EF9]"
      onClick={handleCardClick}
    >
      {/* Preview Cover */}
      {notebookPreviewCover}

      {/* Content */}
      <div className="p-3.5">
        {/* Title and actions */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-slate-800 truncate group-hover:text-[#246BEB] transition-colors flex-1">
            {notebook.title || notebook.name || 'Untitled'}
          </h3>

          <Button
            type="text"
            size="small"
            icon={
              notebook.isStarred ? (
                <Star className="w-3 h-3 text-amber-500 fill-current" />
              ) : (
                <Star className="w-3 h-3 text-slate-400 group-hover:text-[#246BEB]" />
              )
            }
            onClick={handleStarClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </div>
  );
});

NotebookHistoryCard.displayName = 'NotebookHistoryCard';

export default NotebookHistoryCard;
