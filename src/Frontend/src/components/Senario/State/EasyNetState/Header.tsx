import React from 'react';
import {Save, FolderOpen, Plus } from 'lucide-react';

interface HeaderProps {
  graphName?: string;
  onSave: () => void;
  onLoad: () => void;
  onNew: () => void;
}

const Header: React.FC<HeaderProps> = ({onSave, onLoad, onNew }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">

      <div className="flex items-center gap-2">
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建
        </button>

        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          <FolderOpen className="h-4 w-4" />
          打开
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
        >
          <Save className="h-4 w-4" />
          保存
        </button>
      </div>
    </div>
  );
};

export default Header;