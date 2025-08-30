import React, { useCallback, useMemo } from 'react';
import usePreviewStore, { FileType } from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import {
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  FileCode,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';

// ---------- Types ----------
interface FileTab {
  id: string;
  name: string;
  type: FileType | 'notebook';
  isActive: boolean;
  isDirty?: boolean;
  isCurrentNotebook?: boolean;
}

// ---------- Helpers ----------
const getFileTabIcon = (type: FileType | 'notebook') => {
  switch (type) {
    case 'notebook':
      return <img src="/icon.svg" className="w-4 h-4" alt="Notebook" />;
    case 'csv':
      return <FileText className="w-4 h-4" aria-hidden />;
    case 'xlsx':
      return <FileSpreadsheet className="w-4 h-4" aria-hidden />;
    case 'image':
      return <ImageIcon className="w-4 h-4" aria-hidden />;
    case 'pdf':
      return <FileIcon className="w-4 h-4" aria-hidden />;
    case 'jsx':
    case 'react':
      return <FileCode className="w-4 h-4" aria-hidden />;
    case 'html':
      return <FileCode className="w-4 h-4" aria-hidden />;
    case 'docx':
    case 'doc':
      return <FileImage className="w-4 h-4" aria-hidden />;
    default:
      return <FileText className="w-4 h-4" aria-hidden />;
  }
};

// ---------- Tab ----------
interface TabProps {
  tab: FileTab;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  isClosable?: boolean;
}

const Tab: React.FC<TabProps> = ({ tab, onSelect, onClose, isClosable = true }) => {
  const handleClose = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onClose(tab.id);
    },
    [onClose, tab.id]
  );

  // 当前notebook tab永远不可关闭
  const canClose = isClosable && !tab.isCurrentNotebook;

  return (
    <div
      className={`
        group flex items-center gap-2 px-3 py-2 border-r border-gray-200
        transition-colors duration-200 min-w-0 max-w-48 cursor-pointer
        ${tab.isActive
          ? 'bg-white border-b-2 border-b-theme-500 text-gray-900'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
        ${tab.isCurrentNotebook ? 'border-l-2 border-l-theme-400' : ''}
      `}
      onClick={() => onSelect(tab.id)}
      title={tab.name}
      role="tab"
      aria-selected={tab.isActive}
      aria-current={tab.isActive ? 'page' : undefined}
    >
      {getFileTabIcon(tab.type)}
      <span className={`truncate text-sm ${
        tab.isCurrentNotebook 
          ? 'font-bold text-theme-800' 
          : 'font-medium'
      }`}>
        {tab.name}
        {tab.isDirty && <span className="text-orange-500 ml-1" aria-label="Unsaved changes">*</span>}
      </span>
      {canClose && (
        <div
          className="ml-1 p-0.5 hover:bg-gray-200 rounded cursor-pointer"
          onClick={handleClose}
          aria-label={`Close ${tab.name}`}
          title="Close"
          role="button"
        >
          <X className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

// ---------- Main Component ----------
const GlobalTabList: React.FC = () => {
  // Global stores
  const notebookTitle = useStore((s) => s.notebookTitle);
  const tasks = useStore((s) => s.tasks);

  const {
    currentPreviewFiles,
    activeFile,
    isTabDirty,
    previewMode
  } = usePreviewStore();

  // --- Memos ---
  const tabs = useMemo<FileTab[]>(
    () => {
      // 构建notebook tab的名称，与左侧文件树保持一致
      const projectName = notebookTitle || (tasks && tasks.length > 0 ? tasks[0].title : '');
      const notebookName = projectName ? `${projectName}.easynb` : 'Current Notebook';
      
      const notebookTab: FileTab = {
        id: 'current-notebook',
        name: notebookName,
        type: 'notebook',
        isActive: previewMode !== 'file', // 当不在文件预览模式时，notebook tab为激活状态
        isDirty: false,
        isCurrentNotebook: true
      };
      
      const fileTabs = currentPreviewFiles.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        isActive: previewMode === 'file' && activeFile?.id === file.id,
        isDirty: isTabDirty(file.id)
      }));
      
      return [notebookTab, ...fileTabs];
    },
    [currentPreviewFiles, activeFile?.id, isTabDirty, notebookTitle, tasks, previewMode]
  );

  // --- Actions ---
  const previewFileById = useCallback((compositeId: string) => {
    const sep = compositeId.indexOf('::');
    if (sep === -1) return;
    const nbId = compositeId.slice(0, sep);
    const filePath = compositeId.slice(sep + 2);
    usePreviewStore.getState().previewFile(nbId, filePath);
  }, []);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      // 如果选择的是当前notebook tab
      if (tabId === 'current-notebook') {
        // 切换到notebook模式（隐藏文件预览）
        if (previewMode === 'file') {
          usePreviewStore.getState().changePreviewMode();
        }
        return;
      }
      
      // 选择文件tab
      // 确保处于文件预览模式
      if (previewMode !== 'file') {
        usePreviewStore.getState().changePreviewMode();
      }
      
      // 预览对应文件
      previewFileById(tabId);
    },
    [previewFileById, previewMode]
  );

  const handleTabClose = useCallback((tabId: string) => {
    // 不允许关闭当前notebook tab
    if (tabId === 'current-notebook') return;
    usePreviewStore.getState().closePreviewFile(tabId);
  }, []);

  // 只有在有文件tabs或者不在默认状态时才显示tab列表
  const shouldShowTabs = tabs.length > 1 || previewMode === 'file';

  if (!shouldShowTabs) {
    return null;
  }

  return (
    <div className="flex items-center bg-gray-100 border-b border-gray-200 min-h-[40px]">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            onSelect={handleTabSelect}
            onClose={handleTabClose}
            isClosable={tabs.length > 1 && !tab.isCurrentNotebook}
          />
        ))}
      </div>
    </div>
  );
};

export default GlobalTabList;