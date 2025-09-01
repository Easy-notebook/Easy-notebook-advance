// LibraryState/LibraryHeader.tsx
// Header component for the notebook library

import React, { memo } from 'react';
import { Button, Input, Space } from 'antd';
import {
  ArrowLeft,
  RefreshCw,
  Grid,
  List,
  Search as SearchIcon,
  Folder,
} from 'lucide-react';
import { formatSize } from './utils';
import type { LibraryHeaderProps } from './types';

const { Search: AntSearch } = Input;

const LibraryHeader: React.FC<LibraryHeaderProps> = memo(({
  totalNotebooks,
  totalSize,
  searchQuery,
  viewMode,
  refreshing,
  onBack,
  onSearchChange,
  onViewModeChange,
  onRefresh,
}) => (
  <div className="bg-white shadow-sm border-b px-6 py-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Button
          type="text"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={onBack}
          className="hover:bg-gray-100"
        />
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Folder className="w-6 h-6 text-blue-500" />
            我的 Notebook 库
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            共 {totalNotebooks} 个 Notebook · 总大小 {formatSize(totalSize)}
          </p>
        </div>
      </div>

      <Space>
        <Button
          icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          onClick={onRefresh}
          loading={refreshing}
        >
          刷新
        </Button>
        <Button
          type={viewMode === 'grid' ? 'primary' : 'default'}
          icon={<Grid className="w-4 h-4" />}
          onClick={() => onViewModeChange('grid')}
        />
        <Button
          type={viewMode === 'list' ? 'primary' : 'default'}
          icon={<List className="w-4 h-4" />}
          onClick={() => onViewModeChange('list')}
        />
      </Space>
    </div>

    {/* Search Bar */}
    <AntSearch
      placeholder="搜索 Notebook..."
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ maxWidth: 420 }}
      prefix={<SearchIcon className="w-4 h-4 text-gray-400" />}
      allowClear
    />
  </div>
));

LibraryHeader.displayName = 'LibraryHeader';

export default LibraryHeader;