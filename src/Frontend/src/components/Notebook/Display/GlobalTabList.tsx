import React, { useCallback, useMemo } from 'react';
import usePreviewStore, { FileType } from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import { Tabs } from 'antd';
import {
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
      // const projectName = notebookTitle || (tasks && tasks.length > 0 ? tasks[0].title : '');
      // const notebookName = projectName ? `${projectName}.easynb` : 'Current Notebook';
      const notebookName = "Notebook"
      
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

  // 先计算所有的 Hook，然后再决定是否渲染
  const activeKey = useMemo(() => (
    previewMode === 'file' ? (activeFile?.id ?? 'current-notebook') : 'current-notebook'
  ), [previewMode, activeFile?.id]);

  const items = useMemo(() => tabs.map(t => ({
    key: t.id,
    label: (
      <div className="flex items-center gap-2 min-w-0 max-w-48">
        {getFileTabIcon(t.type)}
        <span className={`truncate text-sm ${t.isCurrentNotebook ? 'font-bold text-theme-800' : 'font-medium'}`}>
          {t.name}{t.isDirty ? <span className="text-orange-500 ml-1" aria-label="Unsaved changes">*</span> : null}
        </span>
      </div>
    ),
    closable: !t.isCurrentNotebook && tabs.length > 1,
  })), [tabs]);

  // 只有在有文件tabs或者不在默认状态时才显示tab列表
  const shouldShowTabs = tabs.length > 1 || previewMode === 'file';

  if (!shouldShowTabs) {
    return null;
  }

  return (
      <Tabs
        type="editable-card"
        className="bg-white mb-0 mt-0 p-0"
        style={{ margin: '0px !important' }}
        hideAdd
        items={items}
        activeKey={activeKey}
        onChange={(k) => handleTabSelect(k)}
        onEdit={(targetKey, action) => {
          if (action === 'remove') handleTabClose(targetKey as string);
        }}
      />
  );
};

export default GlobalTabList;