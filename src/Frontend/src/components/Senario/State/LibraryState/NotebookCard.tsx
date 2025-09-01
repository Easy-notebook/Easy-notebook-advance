// LibraryState/NotebookCard.tsx
// Individual notebook card component with grid and list view support

import React, { memo, useCallback } from 'react';
import { Card, Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  Star,
  StarOff,
  Clock,
  FileText,
  MoreHorizontal,
  Edit,
  Download,
  Trash2,
} from 'lucide-react';
import { FileORM } from '@Storage/index';
import CodeCell from '../../../Editor/Cells/CodeCell';
import MarkdownCell from '../../../Editor/Cells/MarkdownCell';
import HybridCell from '../../../Editor/Cells/HybridCell';
import ImageCell from '../../../Editor/Cells/ImageCell';
import FileTags from './FileTags';
import NotebookStats from './NotebookStats';
import { formatTime, formatSize } from './utils';
import type { NotebookCardProps } from './types';

const { Meta } = Card;

const NotebookCard: React.FC<NotebookCardProps> = memo(({
  notebook,
  viewMode,
  onSelect,
  onToggleStar,
  onDelete,
  onExport,
}) => {
  const [previewCells, setPreviewCells] = React.useState<any[]>([]);

  // Load notebook cells for preview
  React.useEffect(() => {
    const loadCells = async () => {
      try {
        console.log(`🔍 Loading preview cells for notebook ${notebook.id}`);
        const main = await FileORM.getFile(notebook.id, `notebook_${notebook.id}.json`);
        
        console.log(`📄 File retrieval result for ${notebook.id}:`, {
          found: !!main,
          hasContent: !!main?.content,
          contentType: typeof main?.content,
          contentLength: main?.content?.length || 0,
          needsRemoteFetch: main?.needsRemoteFetch,
          metadata: main?.metadata ? {
            hasLocalContent: main.metadata.hasLocalContent,
            storageType: main.metadata.storageType,
            size: main.metadata.size
          } : null
        });
        
        // If content is empty but file exists, try to debug why
        if (main && !main.content) {
          console.warn(`📄 Empty content detected for ${notebook.id}, investigating...`);
          
          // Try to list all files for this notebook to debug
          try {
            const { FileORM } = await import('@Storage/index');
            const allFiles = await FileORM.getFilesForNotebook(notebook.id, false);
            console.log(`📁 All files for ${notebook.id}:`, allFiles.map(f => ({
              filePath: f.filePath,
              fileName: f.fileName,
              hasLocalContent: f.hasLocalContent,
              size: f.size,
              storageType: f.storageType
            })));
          } catch (debugError) {
            console.warn('Debug listing failed:', debugError);
          }
        }
        
        const raw = main?.content;
        
        if (raw) {
          let text = '';
          if (typeof raw === 'string') text = raw;
          else if (raw instanceof Blob) text = await raw.text();
          
          let data: any = null;
          try {
            data = JSON.parse(text);
          } catch {
            try {
              const decoded = atob(text);
              data = JSON.parse(decoded);
            } catch (parseError) {
              console.warn(`Failed to parse notebook data for ${notebook.id}:`, parseError);
              setPreviewCells([]);
              return;
            }
          }
          
          console.log(`📄 Notebook data for ${notebook.id}:`, {
            hasCells: !!data?.cells,
            cellCount: data?.cells?.length || 0,
            firstCellType: data?.cells?.[0]?.cell_type || data?.cells?.[0]?.cellType,
            firstCellContent: data?.cells?.[0]?.source || data?.cells?.[0]?.content
          });
          
          if (data?.cells && Array.isArray(data.cells) && data.cells.length > 0) {
            // Take first 5 cells for preview
            const previewCellsData = data.cells.slice(0, 5).map((cell, index) => {
              const source = cell.source || cell.content || '';
              const content = Array.isArray(source) ? source.join('') : source;
              
              return {
                id: `preview-${notebook.id}-${index}`,
                type: cell.cell_type || cell.cellType || 'markdown',
                content: content,
                outputs: cell.outputs || [],
                metadata: cell.metadata || {}
              };
            }).filter(cell => cell.content && cell.content.trim() !== ''); // Filter out empty cells
            
            console.log(`📝 Preview cells for ${notebook.id}:`, previewCellsData.length, 'non-empty cells');
            setPreviewCells(previewCellsData);
          } else {
            console.log(`📝 No valid cells found for ${notebook.id}`);
            setPreviewCells([]);
          }
        } else {
          console.log(`📝 No content found for ${notebook.id}`);
          setPreviewCells([]);
        }
      } catch (error) {
        console.warn(`Failed to load preview cells for ${notebook.id}:`, error);
        setPreviewCells([]);
      }
    };

    loadCells();
  }, [notebook.id]);

  // Render cell preview component
  const renderCellPreview = (cell: any) => {
    const commonProps = {
      cell,
      isActive: false,
      isEditing: false,
      onEdit: () => {},
      onDelete: () => {},
      onAddCell: () => {},
      onUpdateCell: () => {},
      onMoveUp: () => {},
      onMoveDown: () => {},
      readOnly: true,
      className: "pointer-events-none transform scale-75 origin-top-left mb-1"
    };

    // Limit content length for preview
    const previewCell = {
      ...cell,
      content: cell.content?.length > 150 ? cell.content.substring(0, 150) + '...' : cell.content
    };

    switch (cell.type) {
      case 'code':
        return <CodeCell key={cell.id} {...commonProps} cell={previewCell} />;
      case 'markdown':
        return <MarkdownCell key={cell.id} {...commonProps} cell={previewCell} />;
      case 'hybrid':
      case 'Hybrid':
        return <HybridCell key={cell.id} {...commonProps} cell={previewCell} />;
      case 'image':
        return <ImageCell key={cell.id} {...commonProps} cell={previewCell} />;
      default:
        return <MarkdownCell key={cell.id} {...commonProps} cell={previewCell} />;
    }
  };
  const getMenuItems = useCallback((): MenuProps['items'] => [
    {
      key: 'star',
      label: notebook.isStarred ? '取消收藏' : '收藏',
      icon: notebook.isStarred ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation();
        onToggleStar(notebook.id, domEvent as unknown as React.MouseEvent);
      },
    },
    {
      key: 'edit',
      label: '重命名',
      icon: <Edit className="w-4 h-4" />,
      disabled: true,
    },
    {
      key: 'download',
      label: '导出',
      icon: <Download className="w-4 h-4" />,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation();
        onExport?.(notebook.id);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '删除',
      icon: <Trash2 className="w-4 h-4" />,
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation();
        onDelete(notebook.id);
      },
    },
  ], [notebook.id, notebook.isStarred, onToggleStar, onDelete, onExport]);

  const handleCardClick = useCallback(() => {
    onSelect(notebook.id);
  }, [notebook.id, onSelect]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar(notebook.id, e);
  }, [notebook.id, onToggleStar]);

  // Create notebook preview cover
  const notebookPreviewCover = (
    <div className="h-48 bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden relative">
      <div className="p-3 space-y-2">
        {previewCells.length > 0 ? (
          previewCells.map((cell) => renderCellPreview(cell))
        ) : (
          <div className="text-gray-400 text-sm p-8 text-center">
            <div className="text-2xl mb-2">📝</div>
            <div>Empty Notebook</div>
          </div>
        )}
      </div>
      
      {/* Gradient overlay to fade content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-100 to-transparent pointer-events-none" />
      
      {/* Star indicator on cover */}
      {notebook.isStarred && (
        <div className="absolute top-3 right-3">
          <Star className="w-5 h-5 text-yellow-500 fill-current drop-shadow-sm" />
        </div>
      )}
      
      {/* Time and size info on cover */}
      <div className="absolute top-3 left-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(notebook.lastAccessedAt)}
        </div>
      </div>
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <Card
        hoverable
        className="transition-all duration-300 cursor-pointer"
        style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}
        cover={notebookPreviewCover}
        onClick={handleCardClick}
        actions={[
          <Button
            key="star"
            type="text"
            icon={
              notebook.isStarred ? (
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )
            }
            onClick={handleStarClick}
          />,
          <Button key="files" type="text" icon={<FileText className="w-4 h-4" />} />,
          <Dropdown key="more" menu={{ items: getMenuItems() }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreHorizontal className="w-4 h-4" />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>,
        ]}
      >
        <Meta
          title={
            <div className="truncate text-base font-semibold text-gray-900">
              {notebook.name || `Notebook ${notebook.id.slice(0, 8)}`}
            </div>
          }
          description={
            <div className="space-y-2">
              {notebook.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{notebook.description}</p>
              )}
              <NotebookStats
                fileCount={notebook.fileCount}
                accessCount={notebook.accessCount}
                totalSize={notebook.totalSize}
              />
              <FileTags files={notebook.lastOpenedFiles} />
            </div>
          }
        />
      </Card>
    );
  }

  // List view - simple layout without cover
  return (
    <Card
      hoverable
      className="mb-3 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Small preview thumbnail */}
          <div className="w-16 h-12 bg-gradient-to-b from-gray-50 to-gray-100 rounded overflow-hidden flex-shrink-0">
            <div className="p-1 space-y-1 scale-50 transform origin-top-left w-[200%]">
              {previewCells.slice(0, 2).map((cell) => renderCellPreview(cell))}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {notebook.name || `Notebook ${notebook.id.slice(0, 8)}`}
              </h3>
              {notebook.isStarred && (
                <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {notebook.description || '暂无描述'}
            </div>
            <div className="mt-2">
              <FileTags files={notebook.lastOpenedFiles} maxVisible={5} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="text-right">
            <div>{notebook.fileCount ?? 0} 个文件</div>
            <div>{formatSize(notebook.totalSize)}</div>
          </div>
          <div className="text-right">
            <div>{formatTime(notebook.lastAccessedAt)}</div>
            <div>{notebook.accessCount ?? 0} 次访问</div>
          </div>
          <Dropdown menu={{ items: getMenuItems() }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={<MoreHorizontal className="w-4 h-4" />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>
    </Card>
  );
});

NotebookCard.displayName = 'NotebookCard';

export default NotebookCard;