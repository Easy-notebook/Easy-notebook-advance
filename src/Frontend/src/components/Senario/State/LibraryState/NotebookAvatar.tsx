// LibraryState/NotebookAvatar.tsx
// Notebook avatar component

import React, { memo } from 'react';
import { Avatar } from 'antd';
import { BookOpen } from 'lucide-react';
import { getNotebookColor } from './utils';
import type { NotebookAvatarProps } from './types';

const NotebookAvatar: React.FC<NotebookAvatarProps> = memo(({ id, size = 48 }) => (
  <Avatar
    size={size}
    style={{
      backgroundColor: getNotebookColor(id),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    icon={<BookOpen className={`w-${size / 8} h-${size / 8}`} />}
  />
));

NotebookAvatar.displayName = 'NotebookAvatar';

export default NotebookAvatar;