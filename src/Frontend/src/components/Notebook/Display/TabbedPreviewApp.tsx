import React, { useState, useEffect, useCallback } from 'react';
import usePreviewStore, { FileType } from '../../../store/previewStore';
import CSVPreviewWrapper from './DataTable/CSVPreviewWrapper';
import ImageDisplay from './ImageView/ImageDisplay';
import PDFDisplay from './PDFView/PDFDisplay';
import ReactLiveSandbox from './WebView/ReactLiveSandbox';
import DocDisplay from './DocView/DocDisplay';
import {
  Code,
  Monitor,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';


// ---------- Main ----------
const TabbedPreviewApp: React.FC = () => {
  // UI-only state
  const [showSource, setShowSource] = useState(false);

  const {
    activeFile,
    setTabDirty
  } = usePreviewStore();


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
    const effectiveType: FileType | 'notebook' = isExcelName ? 'xlsx' : activeFile.type;

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

      case 'docx':
      case 'doc':
        return (
          <DocDisplay
            fileName={activeFile.name}
            fileContent={activeFile.content}
            onContentChange={async (newContent: string) => {
              setTabDirty(activeFile.id, true);
              await usePreviewStore.getState().updateActiveFileContent(newContent);
            }}
            showControls
          />
        );

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
      {/* Tab controls */}
      {activeFile && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-100">
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
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
};

export default TabbedPreviewApp;
