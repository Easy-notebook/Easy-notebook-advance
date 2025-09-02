import React, { useCallback, useMemo } from 'react';
import usePreviewStore, { FileType } from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import useRouteStore from '../../../store/routeStore';
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
  const { navigateToWorkspace } = useRouteStore();

  const {
    currentPreviewFiles,
    activeFile,
    isTabDirty,
    previewMode,
    getCurrentNotebookId
  } = usePreviewStore();

  // --- Memos ---
  const tabs = useMemo<FileTab[]>(
    () => {
      // Get current notebook ID
      const currentNotebookId = getCurrentNotebookId();
      
      // If no notebook is active, don't show any tabs
      if (!currentNotebookId) {
        return [];
      }
      
      // 构建notebook tab的名称，与左侧文件树保持一致
      // const projectName = notebookTitle || (tasks && tasks.length > 0 ? tasks[0].title : '');
      // const notebookName = projectName ? `${projectName}.easynb` : 'Current Notebook';
      const notebookName = "Notebook";
      
      console.log('📋 GlobalTabList - Building tabs:', {
        currentNotebookId,
        currentPreviewFiles: currentPreviewFiles.length,
        previewMode,
        activeFileId: activeFile?.id
      });
      
      const notebookTab: FileTab = {
        id: 'current-notebook',
        name: notebookName,
        type: 'notebook',
        isActive: previewMode !== 'file', // 当不在文件预览模式时，notebook tab为激活状态
        isDirty: false,
        isCurrentNotebook: true
      };
      
      // Filter files to only show those belonging to current notebook
      const filteredFiles = currentPreviewFiles.filter(file => 
        file.id.startsWith(`${currentNotebookId}::`)
      );
      
      const fileTabs = filteredFiles.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        isActive: previewMode === 'file' && activeFile?.id === file.id,
        isDirty: isTabDirty(file.id)
      }));
      
      return [notebookTab, ...fileTabs];
    },
    [currentPreviewFiles, activeFile?.id, isTabDirty, notebookTitle, tasks, previewMode, getCurrentNotebookId]
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
      console.log(`GlobalTabList: Selecting tab ${tabId}`);
      const store = usePreviewStore.getState();
      
      // 如果选择的是当前notebook tab
      if (tabId === 'current-notebook') {
        const currentNotebookId = getCurrentNotebookId();
        if (currentNotebookId) {
          // 导航到工作区路由，这会触发完整的 notebook 加载流程
          console.log(`TabList: Navigating to workspace for notebook ${currentNotebookId}`);
          navigateToWorkspace(currentNotebookId);
        }
        
        // 切换到notebook模式，但不直接清除活跃文件，而是使用switchToNotebook
        console.log(`GlobalTabList: Before mode change - previewMode: ${previewMode}`);
        
        if (currentNotebookId && typeof store.switchToNotebook === 'function') {
          // 使用switchToNotebook来正确处理状态切换
          store.switchToNotebook(currentNotebookId);
        } else {
          // 降级处理：手动切换模式
          if (previewMode === 'file') {
            store.changePreviewMode();
          }
          store.setActiveFile(null);
        }
        
        console.log(`GlobalTabList: Switched to notebook mode`);
        return;
      }
      
      // 选择文件tab
      console.log(`GlobalTabList: Selecting file tab ${tabId}`);
      
      // 确保处于文件预览模式
      if (previewMode !== 'file') {
        console.log(`GlobalTabList: Changing to file preview mode`);
        store.changePreviewMode();
      }
      
      // 预览对应文件
      previewFileById(tabId);
    },
    [previewFileById, previewMode, getCurrentNotebookId, navigateToWorkspace]
  );

  const handleTabClose = useCallback((tabId: string) => {
    // 不允许关闭当前notebook tab
    if (tabId === 'current-notebook') return;
    
    console.log(`GlobalTabList: Closing tab ${tabId}`);
    const store = usePreviewStore.getState();
    const currentNotebookId = getCurrentNotebookId();
    
    // 检查这是否是当前活跃的文件tab
    const isClosingActiveTab = activeFile?.id === tabId;
    
    // 检查关闭后还有没有其他文件tabs （在关闭之前检查）
    const remainingFileTabs = currentPreviewFiles.filter(file => 
      file.id !== tabId && file.id.startsWith(`${currentNotebookId}::`)
    );
    
    console.log(`GlobalTabList: Remaining file tabs after close: ${remainingFileTabs.length}, isClosingActiveTab: ${isClosingActiveTab}`);
    
    // 如果这是最后一个文件tab且是活跃tab，需要同时处理删除和模式切换
    if (isClosingActiveTab && remainingFileTabs.length === 0) {
      console.log(`GlobalTabList: Closing last active file tab, performing atomic operation`);
      
      // 先切换到notebook模式（在删除之前）
      if (currentNotebookId && typeof store.switchToNotebook === 'function') {
        console.log(`GlobalTabList: Using switchToNotebook for atomic state change`);
        store.switchToNotebook(currentNotebookId);
      } else {
        // 降级处理：手动切换状态
        console.log(`GlobalTabList: Manual state change fallback`);
        if (store.previewMode === 'file') {
          store.changePreviewMode();
        }
        store.setActiveFile(null);
      }
      
      // 导航回workspace（确保显示notebook内容）
      if (currentNotebookId) {
        navigateToWorkspace(currentNotebookId);
      }
      
      // 然后删除tab（此时状态已经切换，不会影响显示）
      store.closePreviewFile(tabId);
    } else {
      // 普通删除操作，让PreviewStore的内置逻辑处理
      store.closePreviewFile(tabId);
    }
    
    console.log(`GlobalTabList: Tab ${tabId} close operation completed`);
  }, [activeFile?.id, currentPreviewFiles, getCurrentNotebookId, navigateToWorkspace]);

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

  // 只有当有实际文件tabs时才显示tab列表（不仅仅是notebook tab）
  const currentNotebookId = getCurrentNotebookId();
  const fileTabs = tabs.filter(tab => !tab.isCurrentNotebook);
  
  // 修改显示逻辑：当有notebook时，如果有文件tabs就显示所有tabs，没有文件tabs就不显示
  // 但是保证不影响MainContent的显示
  const shouldShowTabs = currentNotebookId && fileTabs.length > 0;

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