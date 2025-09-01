// LibraryState/FileTags.tsx
// File tags component for displaying file lists

import React, { memo } from 'react';
import { Tag } from 'antd';
import { CONSTANTS } from './types';
import type { FileTagsProps } from './types';

const FileTags: React.FC<FileTagsProps> = memo(({ 
  files, 
  maxVisible = CONSTANTS.MAX_VISIBLE_FILES 
}) => {
  if (!files || files.length === 0) return null;
  
  const displayFiles = files.slice(0, maxVisible);
  const hasMore = files.length > maxVisible;
  
  return (
    <div className="flex flex-wrap gap-1">
      {displayFiles.map((fname, i) => (
        <Tag key={i} className="text-xs">
          {fname.length > CONSTANTS.TRUNCATE_LENGTH 
            ? `${fname.slice(0, CONSTANTS.TRUNCATE_LENGTH)}...` 
            : fname}
        </Tag>
      ))}
      {hasMore && (
        <Tag className="text-xs text-gray-500">
          +{files.length - maxVisible} 更多
        </Tag>
      )}
    </div>
  );
});

FileTags.displayName = 'FileTags';

export default FileTags;