import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import usePreviewStore from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import CSVPreviewApp from './CSVPreviewApp';
import ImageDisplay from './ImageDisplay';
import PDFDisplay from './PDFDisplay';
import { Minimize2, Maximize2, Split, Code, Monitor } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const PreviewApp: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [previewMode, setPreviewMode] = useState<string>(''); // Start with empty state
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [lastModified, setLastModified] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [showSource, setShowSource] = useState<boolean>(false);

    // Store functions for fullscreen control
    const setDetachedCellId = useStore(s => s.setDetachedCellId);
    const isDetachedCellFullscreen = useStore(s => s.isDetachedCellFullscreen);
    const toggleDetachedCellFullscreen = useStore(s => s.toggleDetachedCellFullscreen);

    const processCsvData = useCallback((fileContent: string) => {
        if (!fileContent) return;

        setLoading(true);
        Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors && results.errors.length > 0) {
                    setError(`Parse error: ${results.errors[0].message}`);
                }
                setData(results.data);
                setLoading(false);
            },
            error: (error) => {
                setError(`Parse error: ${error.message}`);
                setLoading(false);
            }
        });
    }, []);

    useEffect(() => {
        // Initialize with current state from preview store
        const currentState = usePreviewStore.getState();
        if (currentState.activeFile) {
            console.log('PreviewApp: Initial activeFile detected:', currentState.activeFile.type, currentState.activeFile.name);
            setPreviewMode(currentState.activeFile.type);
            if (currentState.activeFile.type === 'csv') {
                processCsvData(currentState.activeFile.content);
            } else if (currentState.activeFile.type === 'image') {
                setData(currentState.activeFile.content);
                setFileName(currentState.activeFile.name);
                setLastModified(currentState.activeFile.lastModified);
            } else if (currentState.activeFile.type === 'pdf') {
                setPdfUrl(currentState.activeFile.content);
                setFileName(currentState.activeFile.name);
                setLastModified(currentState.activeFile.lastModified);
            } else if (currentState.activeFile.type === 'html') {
                setHtmlContent(currentState.activeFile.content);
                setFileName(currentState.activeFile.name);
                setLastModified(currentState.activeFile.lastModified);
            }
        } else {
            console.log('PreviewApp: No activeFile found in initial state');
        }

        // Subscribe to changes in activeFile from the preview store
        const unsubscribe = usePreviewStore.subscribe(
            (state) => {
                if (state.activeFile) {
                    console.log('PreviewApp: ActiveFile changed:', state.activeFile.type, state.activeFile.name);
                    setPreviewMode(state.activeFile.type);
                    if (state.activeFile.type === 'csv') {
                        processCsvData(state.activeFile.content);
                    } else if (state.activeFile.type === 'image') {
                        setData(state.activeFile.content);
                        setFileName(state.activeFile.name);
                        setLastModified(state.activeFile.lastModified);
                    } else if (state.activeFile.type === 'pdf') {
                        setPdfUrl(state.activeFile.content);
                        setFileName(state.activeFile.name);
                        setLastModified(state.activeFile.lastModified);
                    } else if (state.activeFile.type === 'html') {
                        setHtmlContent(state.activeFile.content);
                        setFileName(state.activeFile.name);
                        setLastModified(state.activeFile.lastModified);
                    }
                } else {
                    console.log('PreviewApp: ActiveFile cleared');
                }
            }
        );
        return () => unsubscribe();
    }, [processCsvData]);

    // Debug info
    console.log('PreviewApp render:', { previewMode, loading, error, fileName, pdfUrl: !!pdfUrl });

    // Use conditional rendering with proper JSX syntax
    return (
        <div className='w-full h-full flex flex-col'>
            {error && <div className="error-message bg-red-50 border border-red-200 text-red-800 rounded-md p-4 m-4">{error}</div>}
            {loading && <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-theme-500 animate-spin mx-auto mb-2"></div>
                    <div className="text-gray-600">Loading preview...</div>
                </div>
            </div>}

            {/* Show loading state when no preview mode is set yet */}
            {!loading && !error && !previewMode && (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                        <div className="text-lg mb-2">Initializing preview...</div>
                        <div className="text-sm">Please wait while we load the content</div>
                    </div>
                </div>
            )}

            {/* CSV Preview with header toolbar */}
            {!loading && previewMode === 'csv' && (
                <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white/70 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{fileName || 'CSV Preview'}</div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleDetachedCellFullscreen}
                                className="p-1.5 hover:bg-gray-200 rounded"
                                title={isDetachedCellFullscreen ? "Switch to split view" : "Switch to fullscreen"}
                            >
                                {isDetachedCellFullscreen ? <Split size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button
                                onClick={() => setDetachedCellId(null)}
                                className="p-1.5 hover:bg-red-200 rounded text-red-600"
                                title="Close preview"
                            >
                                <Minimize2 size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <CSVPreviewApp/>
                    </div>
                </>
            )}

            {!loading && previewMode === 'image' && (
                <ImageDisplay
                    imageData={data}
                    showDetails={true}
                    showControls={true}
                    imageInitialHeight="50vh"
                    fileName={fileName}
                    lastModified={lastModified}
                />
            )}

            {!loading && previewMode === 'pdf' && (
                <PDFDisplay dataUrl={pdfUrl} fileName={fileName} />
            )}

            {/* HTML preview with CodeCell-style layout */}
            {!loading && previewMode === 'html' && (
                <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
                    {/* Header with CodeCell-style toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-700 truncate">{fileName || 'HTML Preview'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* CodeCell-style mode toggle */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setShowSource(false)}
                                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                        !showSource
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    title="Show preview"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setShowSource(true)}
                                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                        showSource
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    title="Show source code"
                                >
                                    <Code className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={toggleDetachedCellFullscreen}
                                className="p-1.5 hover:bg-gray-200 rounded"
                                title={isDetachedCellFullscreen ? "Switch to split view" : "Switch to fullscreen"}
                            >
                                {isDetachedCellFullscreen ? <Split size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button
                                onClick={() => setDetachedCellId(null)}
                                className="p-1.5 hover:bg-red-200 rounded text-red-600"
                                title="Close preview"
                            >
                                <Minimize2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content area with CodeCell-style structure */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {showSource ? (
                            /* Source code view - CodeCell style */
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
                                        showLineNumbers={true}
                                        wrapLines={true}
                                        wrapLongLines={true}
                                    >
                                        {htmlContent}
                                    </SyntaxHighlighter>
                                </div>
                                {/* Copy button - CodeCell style */}
                                <div className="absolute top-2 right-2 z-10">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(htmlContent);
                                        }}
                                        className="px-2 py-1 text-xs bg-gray-700/90 text-white rounded hover:bg-gray-600 transition-colors backdrop-blur-sm"
                                        title="Copy HTML source"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Preview view - CodeCell output style */
                            <div className="flex-1 p-4 bg-white rounded-b-lg overflow-hidden">
                                <div className="h-full w-full bg-white border border-gray-200 rounded overflow-hidden">
                                    <iframe
                                        title={fileName || 'HTML'}
                                        srcDoc={htmlContent}
                                        className="w-full h-full border-0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreviewApp;