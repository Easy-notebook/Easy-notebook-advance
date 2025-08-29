import React, { useState, useEffect, useCallback, useMemo } from 'react';
import usePreviewStore, { FileType } from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import CSVPreviewWrapper from './DataTable/CSVPreviewWrapper';
import ImageDisplay from './ImageView/ImageDisplay';
import PDFDisplay from './PDFView/PDFDisplay';
import ReactLiveSandbox from './WebView/ReactLiveSandbox';
import {
  Minimize2,
  Maximize2,
  Split,
  Code,
  Monitor,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ---------- Types ----------
interface FileTab {
  id: string;
  name: string;
  type: FileType;
  isActive: boolean;
  isDirty?: boolean;
}

// ---------- Helpers ----------
const getFileTabIcon = (type: FileType) => {
  switch (type) {
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
      return <Code className="w-4 h-4" aria-hidden />;
    default:
      return <FileText className="w-4 h-4" aria-hidden />;
  }
};

// ---------- Tab ----------
interface TabProps {
  tab: FileTab;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onSave?: (id: string) => void;
  isClosable?: boolean;
}

const Tab: React.FC<TabProps> = ({ tab, onSelect, onClose, isClosable = true }) => {
  const handleClose = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClose(tab.id);
    },
    [onClose, tab.id]
  );

  return (
    <button
      type="button"
      className={`
        group flex items-center gap-2 px-3 py-2 border-r border-gray-200
        transition-colors duration-200 min-w-0 max-w-48
        ${tab.isActive
          ? 'bg-white border-b-2 border-b-theme-500 text-gray-900'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
      `}
      onClick={() => onSelect(tab.id)}
      title={tab.name}
      aria-current={tab.isActive ? 'page' : undefined}
    >
      {getFileTabIcon(tab.type)}
      <span className="truncate text-sm font-medium">
        {tab.name}
        {tab.isDirty && <span className="text-orange-500 ml-1" aria-label="Unsaved changes">*</span>}
      </span>
      {isClosable && (
        <button
          type="button"
          className="ml-1 p-0.5 hover:bg-gray-200 rounded"
          onClick={handleClose}
          aria-label={`Close ${tab.name}`}
          title="Close"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </button>
  );
};

// ---------- Main ----------
const TabbedPreviewApp: React.FC = () => {
  // UI-only state
  const [showSource, setShowSource] = useState(false);

  // Global stores
  const setDetachedCellId = useStore((s) => s.setDetachedCellId);
  const isDetachedCellFullscreen = useStore((s) => s.isDetachedCellFullscreen);
  const toggleDetachedCellFullscreen = useStore((s) => s.toggleDetachedCellFullscreen);
  const notebookId = useStore((s) => s.notebookId);

  const {
    currentPreviewFiles,
    activeFile,
    isTabDirty,
    setTabDirty,
    setCurrentPreviewFiles,
    setActiveFile
  } = usePreviewStore();

  // --- Memos ---
  const tabs = useMemo<FileTab[]>(
    () =>
      currentPreviewFiles.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        isActive: activeFile?.id === file.id,
        isDirty: isTabDirty(file.id)
      })),
    [currentPreviewFiles, activeFile?.id, isTabDirty]
  );

  // --- Actions ---
  const previewFileById = useCallback((compositeId: string) => {
    const sep = compositeId.indexOf('::');
    if (sep === -1) return;
    const nbId = compositeId.slice(0, sep);
    const filePath = compositeId.slice(sep + 2);
    // 直接调用 store 的动作，避免闭包状态不一致
    usePreviewStore.getState().previewFile(nbId, filePath);
  }, []);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      // 若已经是激活态则跳过
      if (activeFile?.id === tabId) return;
      previewFileById(tabId);
    },
    [activeFile?.id, previewFileById]
  );

  const handleTabClose = useCallback((tabId: string) => {
    usePreviewStore.getState().closePreviewFile(tabId);
  }, []);

  const handleTabSave = useCallback(
    async (tabId: string) => {
      // 你的内容持久化逻辑应该已在 onChange 内完成，这里只清理 dirty 标记
      setTabDirty(tabId, false);
    },
    [setTabDirty]
  );

  // 键盘快捷键：⌘/Ctrl+S 清理当前 tab 的 dirty（不阻断你已有的保存逻辑）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (!isSave) return;
      e.preventDefault();
      if (activeFile) {
        setTabDirty(activeFile.id, false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFile, setTabDirty]);

  // --- Notebook 隔离：仅保留当前 notebook 的 tab ---
  useEffect(() => {
    if (!notebookId) return;
    const prefix = `${notebookId}::`;
    const filtered = currentPreviewFiles.filter((f) => f.id.startsWith(prefix));
    if (filtered.length !== currentPreviewFiles.length) {
      setCurrentPreviewFiles(filtered);
      if (activeFile && !activeFile.id.startsWith(prefix)) {
        setActiveFile(null);
      }
    }
  }, [notebookId, currentPreviewFiles, activeFile, setCurrentPreviewFiles, setActiveFile]);

  // --- 确保有激活文件：优先最近加入（列表最后一个） ---
  useEffect(() => {
    if (!activeFile && currentPreviewFiles.length > 0) {
      const last = currentPreviewFiles[currentPreviewFiles.length - 1];
      previewFileById(last.id);
    }
  }, [activeFile, currentPreviewFiles, previewFileById]);

  // --- 当切走 HTML 文件时，自动关闭源码视图 ---
  useEffect(() => {
    if (activeFile?.type !== 'html' && showSource) {
      setShowSource(false);
    }
    // 依赖中显式包含 type 与 showSource，避免无效/过度刷新
  }, [activeFile?.type, showSource]);

  // --- 渲染内容 ---
  const renderContent = useCallback(() => {
    if (!activeFile) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <div className="text-lg mb-2">No file selected</div>
            <div className="text-sm">Select a file from the file explorer to preview it here</div>
          </div>
        </div>
      );
    }

    // 兜底矫正：部分 xlsx 可能被误识别为 text/html
    const isExcelName =
      activeFile.name.toLowerCase().endsWith('.xlsx') || activeFile.name.toLowerCase().endsWith('.xls');
    const effectiveType: FileType = isExcelName ? 'xlsx' : activeFile.type;

    switch (effectiveType) {
      case 'csv':
      case 'xlsx':
        return (
          <div className="flex-1 overflow-hidden">
            <CSVPreviewWrapper typeOverride={effectiveType === 'xlsx' ? 'xlsx' : 'csv'} />
          </div>
        );

      case 'image':
        return (
          <ImageDisplay
            imageData={activeFile.content}
            showDetails
            showControls
            imageInitialHeight="50vh"
            fileName={activeFile.name}
            lastModified={activeFile.lastModified}
          />
        );

      case 'pdf':
        return <PDFDisplay dataUrl={activeFile.content} fileName={activeFile.name} />;

      case 'jsx':
      case 'react':
        return (
          <ReactLiveSandbox
            code={activeFile.content}
            fileName={activeFile.name}
            language="jsx"
            onCodeChange={async (newCode: string) => {
              setTabDirty(activeFile.id, true);
              await usePreviewStore.getState().updateActiveFileContent(newCode);
            }}
          />
        );

      case 'html':
        return (
          <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex-1 flex flex-col min-h-0">
              {showSource ? (
                <div className="flex-1 relative bg-gray-800 rounded-b-lg overflow-hidden">
                  <div className="h-full overflow-auto">
                    <SyntaxHighlighter
                      language="html"
                      style={tomorrow}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        height: '100%',
                        background: '#2d3748',
                        borderRadius: '0 0 8px 8px'
                      }}
                      showLineNumbers
                      wrapLines
                      wrapLongLines
                    >
                      {activeFile.content}
                    </SyntaxHighlighter>
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(activeFile.content);
                        } catch {
                          // 旧浏览器/非安全上下文兜底
                          const ta = document.createElement('textarea');
                          ta.value = activeFile.content;
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-700/90 text-white rounded hover:bg-gray-600 transition-colors backdrop-blur-sm"
                      title="Copy HTML source"
                      aria-label="Copy HTML source"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-4 bg-white rounded-b-lg overflow-hidden">
                  <div className="h-full w-full bg-white border border-gray-200 rounded overflow-hidden">
                    <iframe
                      title={activeFile.name}
                      srcDoc={activeFile.content}
                      className="w-full h-full border-0"
                      // 基础 sandbox 提升安全性；根据需要增减权限
                      sandbox="allow-same-origin allow-forms allow-scripts"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-lg mb-2">Unsupported file type</div>
              <div className="text-sm">Cannot preview {activeFile.name}</div>
            </div>
          </div>
        );
    }
  }, [activeFile, setTabDirty, showSource]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Tab bar */}
      <div className="flex items-center bg-gray-100 border-b border-gray-200 min-h-[40px]">
        <div className="flex flex-1 overflow-x-auto">
          {tabs.length > 0 ? (
            tabs.map((tab) => (
              <Tab
                key={tab.id}
                tab={tab}
                onSelect={handleTabSelect}
                onClose={handleTabClose}
                onSave={handleTabSave}
                isClosable={tabs.length > 1}
              />
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500 text-sm">No files open</div>
          )}
        </div>

        {/* Tab controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-300">
          {/* HTML 预览/源码切换 */}
          {activeFile?.type === 'html' && (
            <div className="flex items-center bg-gray-200 rounded p-1" role="tablist" aria-label="HTML view switch">
              <button
                type="button"
                onClick={() => setShowSource(false)}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  !showSource ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Show preview"
                aria-selected={!showSource}
              >
                <Monitor className="w-4 h-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setShowSource(true)}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  showSource ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Show source code"
                aria-selected={showSource}
              >
                <Code className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}

          {/* 全屏切换 */}
          <button
            type="button"
            onClick={toggleDetachedCellFullscreen}
            className="p-1.5 hover:bg-gray-200 rounded"
            title={isDetachedCellFullscreen ? 'Switch to split view' : 'Switch to fullscreen'}
            aria-pressed={isDetachedCellFullscreen}
          >
            {isDetachedCellFullscreen ? <Split size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* 关闭预览 */}
          <button
            type="button"
            onClick={() => setDetachedCellId(null)}
            className="p-1.5 hover:bg-red-200 rounded text-red-600"
            title="Close preview"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
};

export default TabbedPreviewApp;
