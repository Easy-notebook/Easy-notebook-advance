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
import NotebookAvatar from './NotebookAvatar';
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
}) => {
  const getMenuItems = useCallback((): MenuProps['items'] => [
    {
      key: 'star',
      label: notebook.isStarred ? '取消收藏' : '收藏',
      icon: notebook.isStarred ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />,
      onClick: ({ domEvent }) => onToggleStar(notebook.id, domEvent as unknown as React.MouseEvent),
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
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '删除',
      icon: <Trash2 className="w-4 h-4" />,
      danger: true,
      onClick: () => onDelete(notebook.id),
    },
  ], [notebook.id, notebook.isStarred, onToggleStar, onDelete]);

  const handleCardClick = useCallback(() => {
    onSelect(notebook.id);
  }, [notebook.id, onSelect]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar(notebook.id, e);
  }, [notebook.id, onToggleStar]);

  if (viewMode === 'grid') {
    return (
      <Card
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden"
        style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 16 } }}
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
        <div className="flex items-start justify-between mb-3">
          <NotebookAvatar id={notebook.id} />
          <div className="flex flex-col items-end text-xs text-gray-500">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              {formatTime(notebook.lastAccessedAt)}
            </div>
            <div>{formatSize(notebook.totalSize)}</div>
          </div>
        </div>

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

        {notebook.isStarred && (
          <div className="absolute top-3 right-3">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
          </div>
        )}
      </Card>
    );
  }

  // List view
  return (
    <Card
      className="mb-3 hover:shadow-md transition-all duration-300 cursor-pointer"
      styles={{ body: { padding: '12px 16px' } }}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <NotebookAvatar id={notebook.id} size={40} />
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