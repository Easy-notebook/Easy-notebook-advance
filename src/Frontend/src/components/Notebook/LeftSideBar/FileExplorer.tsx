import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Folder,
    FolderOpen,
    Download,
    Trash,
    Eye,
    RefreshCw,
    X
} from 'lucide-react';
import { Icon } from '@fluentui/react/lib/Icon';
import { getFileTypeIconProps } from '@fluentui/react-file-type-icons';
import { initializeFileTypeIcons } from '@fluentui/react-file-type-icons';
import { notebookApiIntegration } from '../../../services/notebookServices';
import {
    fetchFileList,
    handleFileUpload,
    handleDownload,
    handleDeleteFile
} from '../../../utils/fileUtils';
import usePreviewStore from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import { SHARED_STYLES, LAYOUT_CONSTANTS, FILE_PREVIEW_CONFIG } from './shared/constants';
import { LoadingIndicator } from './shared/components';

// Initialize file type icons
initializeFileTypeIcons();

// 使用共享的文件预览配置
const PREVIEWABLE_IMAGE_TYPES = FILE_PREVIEW_CONFIG.image;
const PREVIEWABLE_TEXT_TYPES = FILE_PREVIEW_CONFIG.text;

/** Get file icon based on extension */
const getFileIcon = (filename) => {
    if (!filename) return <Icon {...getFileTypeIconProps({ extension: '', size: 20 })} />;

    try {
        const extension = filename.split('.').pop().toLowerCase();
        return <Icon {...getFileTypeIconProps({ extension, size: 20 })} />;
    } catch (error) {
        console.error('Error getting file icon:', error);
        return <Icon {...getFileTypeIconProps({ extension: '', size: 20 })} />;
    }
};

// Context Menu Component
const ContextMenu = ({ x, y, file, onClose, onPreview, onDownload, onDelete }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const ext = file?.name ? `.${file.name.split('.').pop().toLowerCase()}` : '';
    const isPreviewable = file?.type === 'file' && [...PREVIEWABLE_IMAGE_TYPES, ...PREVIEWABLE_TEXT_TYPES].includes(ext);

    return (
        <div
            ref={menuRef}
            className="absolute bg-white rounded-lg shadow-lg py-2 z-50 border border-theme-200 animate-fade-in"
            style={{ top: y, left: x, minWidth: '180px' }}
        >
            {file?.type === 'file' && (
                <>
                    {isPreviewable && (
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-theme-50 flex items-center transition-colors duration-200 rounded-md mx-1"
                            onClick={() => {
                                onPreview(file);
                                onClose();
                            }}
                        >
                            <Eye size={16} className="mr-2" />
                            <span>Preview</span>
                        </button>
                    )}
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-theme-50 flex items-center transition-colors duration-200 rounded-md mx-1"
                        onClick={() => {
                            onDownload(file);
                            onClose();
                        }}
                    >
                        <Download size={16} className="mr-2" />
                        <span>Download</span>
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center transition-colors duration-200 rounded-md mx-1"
                        onClick={() => {
                            onDelete(file);
                            onClose();
                        }}
                    >
                        <Trash size={16} className="mr-2" />
                        <span>Delete</span>
                    </button>
                </>
            )}
            {/* Directory-specific actions if needed in the future */}
            <button
                className="w-full text-left px-4 py-2 hover:bg-theme-50 flex items-center transition-colors duration-200 rounded-md mx-1"
                onClick={onClose}
            >
                <X size={16} className="mr-2" />
                <span>Cancel</span>
            </button>
        </div>
    );
};

// FileTreeItem Component
const FileTreeItem = memo(({
    item,
    level = 0,
    onFileSelect,
    notebookId,
    onContextMenu,
    onDragOver,
    onDrop
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = useCallback(() => {
        if (item.type === 'directory') {
            setIsExpanded(prev => !prev);
        }
    }, [item]);

    const handleClick = useCallback(() => {
        if (item.type === 'file') {
            onFileSelect?.(item);
        } else {
            toggleExpand();
        }
    }, [item, toggleExpand, onFileSelect]);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        onContextMenu(e, item);
    }, [item, onContextMenu]);

    const handleDragOver = useCallback((e) => {
        if (item.type === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            onDragOver?.(e, item);
        }
    }, [item, onDragOver]);

    const handleDrop = useCallback((e) => {
        if (item.type === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            onDrop?.(e, item);
        }
    }, [item, onDrop]);

    // 使用共享的布局常量
    const indent = LAYOUT_CONSTANTS.fileTree.indent;
    const paddingLeft = `${(level * indent) + LAYOUT_CONSTANTS.fileTree.padding}px`;

    return (
        <>
            <div
                className={`
                    flex items-center py-1 cursor-pointer
                    text-gray-700 transition-colors duration-${LAYOUT_CONSTANTS.animation.fast}
                    ${SHARED_STYLES.button.hover}
                `}
                style={{ paddingLeft }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggable={item.type === 'file'}
                onDragStart={(e) => {
                    if (item.type === 'file') {
                        e.dataTransfer.setData('text/plain', JSON.stringify(item));
                    }
                }}
            >
                {/* Directory expand/collapse arrow */}
                {item.type === 'directory' && (
                    <div className={`mr-1 transition-transform duration-${LAYOUT_CONSTANTS.animation.fast}`}>
                        {isExpanded
                            ? <ChevronDown size={16} className="text-theme-600" />
                            : <ChevronRight size={16} className="text-theme-600" />
                        }
                    </div>
                )}

                {/* File icon with consistent alignment */}
                <div className={`
                    mr-2 transition-colors duration-${LAYOUT_CONSTANTS.animation.fast}
                    ${item.type !== 'directory' ? 'ml-4' : ''}
                    flex items-center justify-center
                    w-${LAYOUT_CONSTANTS.fileTree.iconSize} h-${LAYOUT_CONSTANTS.fileTree.iconSize}
                `}>
                    {item.type === 'directory'
                        ? (isExpanded
                            ? <FolderOpen size={LAYOUT_CONSTANTS.fileTree.iconSize} className="text-theme-700" />
                            : <Folder size={LAYOUT_CONSTANTS.fileTree.iconSize} className="text-theme-700" />
                        )
                        : getFileIcon(item.name)
                    }
                </div>

                {/* File or folder name */}
                <span
                    className={`
                        truncate text-sm font-medium
                        transition-colors duration-${LAYOUT_CONSTANTS.animation.fast}
                        ${item.type === 'directory'
                            ? 'text-theme-800 hover:text-theme-900'
                            : 'text-gray-700 hover:text-theme-700'
                        }
                    `}
                    title={item.name}
                >
                    {item.name}
                </span>
            </div>

            {/* Render children if directory is expanded */}
            {item.type === 'directory' && isExpanded && item.children && (
                <div>
                    {item.children.map((child, index) => (
                        <FileTreeItem
                            key={`${child.type}-${child.name}-${index}`}
                            item={child}
                            level={level + 1}
                            onFileSelect={onFileSelect}
                            notebookId={notebookId}
                            onContextMenu={onContextMenu}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                        />
                    ))}
                </div>
            )}
        </>
    );
});



// Main FileTree Component
const FileTree = memo(({ notebookId, projectName }) => {
    // Get tasks from store to determine if outline can be parsed
    const tasks = useStore((state) => state.tasks);
    const [files, setFiles] = useState(null);
    const [fileTree, setFileTree] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
    const [draggedOver, setDraggedOver] = useState(null);
    const fileInputRef = useRef(null);
    const abortControllerRef = useRef(null);
    const dropZoneRef = useRef(null);
    const [uploadState, setUploadState] = useState({
        uploading: false,
        progress: 0,
        error: null
    });

    // Access preview store
    const {error: previewError, isLoading: previewLoading } = usePreviewStore();

    // Upload configuration wrapped in useMemo to prevent recreation on every render
    const uploadConfig = useMemo(() => ({
        mode: 'restricted',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        allowedTypes: ['.txt', '.md', '.json', '.js', '.py', '.html', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.csv']
    }), []);

    // Toast notification stub (replace with your own toast system)
    const toast = useCallback(({ title, description, variant }) => {
        console.log(`${variant}: ${title} - ${description}`);
        // Implement your toast notification here
    }, []);

    // Fetch file list function
    const fetchFileListWrapper = useCallback(async () => {
        if (!notebookId) return;
        setIsLoading(true);
        try {
            // Fetch notebook files
            await fetchFileList({
                notebookId,
                notebookApiIntegration,
                setFileList: setFiles,
                toast
            });
            
        } catch (err) {
            console.error('Error fetching files:', err);
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    }, [notebookId, toast]);

    // Initial file fetch
    useEffect(() => {
        fetchFileListWrapper();
    }, [fetchFileListWrapper]);


    // Process file tree from backend - backend now returns hierarchical structure
    const processFileTree = useMemo(() => {
        if (!files || files.length === 0) {
            return [];
        }

        try {
            // If files is already a hierarchical structure (array of objects with children)
            if (Array.isArray(files) && files.length > 0 && typeof files[0] === 'object' && files[0].type) {
                return files; // Backend already provided the tree structure
            }

            // Fallback: if still receiving flat file paths, build tree manually
            const tree = [];
            const directories = {};

            files.forEach(filePath => {
                const pathStr = typeof filePath === 'string' ? filePath : filePath.path || filePath.name;
                if (!pathStr) return;
                
                const parts = pathStr.split('/');
                let currentPath = '';
                let currentTree = tree;

                // Build directory structure
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!part) continue;
                    
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    if (!directories[currentPath]) {
                        const newDir = {
                            name: part,
                            type: 'directory',
                            path: currentPath,
                            children: []
                        };
                        directories[currentPath] = newDir;
                        currentTree.push(newDir);
                    }
                    currentTree = directories[currentPath].children;
                }

                // Add file
                const fileName = parts[parts.length - 1];
                if (fileName) {
                    const fileObj = {
                        name: fileName,
                        type: 'file',
                        path: pathStr,
                        size: typeof filePath === 'object' ? filePath.size : undefined,
                        lastModified: typeof filePath === 'object' ? filePath.lastModified : undefined
                    };

                    if (parts.length === 1) {
                        tree.push(fileObj);
                    } else {
                        const parentPath = parts.slice(0, -1).join('/');
                        if (directories[parentPath]) {
                            directories[parentPath].children.push(fileObj);
                        }
                    }
                }
            });

            return tree;
        } catch (error) {
            console.error('Error processing file tree:', error);
            return [];
        }
    }, [files]);

    // Update file tree when processFileTree changes
    useEffect(() => {
        setFileTree(processFileTree);
    }, [processFileTree]);

    // Handle preview using the preview store
    const handlePreviewFile = useCallback(async (file) => {
        try {
            if (!file) {
                console.error('Error previewing file: file is null');
                toast({
                    title: "Error",
                    description: "No file selected for preview",
                    variant: "destructive",
                });
                return;
            }

            const fileInfo = await notebookApiIntegration.getFileInfo(useStore.getState().notebookId, file.path);
            await usePreviewStore.getState().previewFile(useStore.getState().notebookId, file.path, {
                lastModified: fileInfo.lastModified,
                file: file
            });
        } catch (err) {
            console.error('Error previewing file:', err);
            toast({
                title: "Preview Error",
                description: `Failed to preview ${file?.name || 'file'}: ${err.message}`,
                variant: "destructive",
            });
        }
    },[toast]);

    // Handle file selection using the preview store
    const handleFileSelect = useCallback(async (file) => {
        console.log('File selected:', file);
        
        if (!file) {
            console.error('File selection error: file is null');
            return;
        }

        if (usePreviewStore.getState().previewMode === 'notebook') {
            usePreviewStore.getState().changePreviewMode('file');
        }

        const fileExt = file.name.split('.').pop().toLowerCase();
        const isPreviewable = [...PREVIEWABLE_IMAGE_TYPES, ...PREVIEWABLE_TEXT_TYPES].includes(`.${fileExt}`);

        if (isPreviewable) {
            handlePreviewFile(file);
        }
    }, [handlePreviewFile]);

    // Handle state menu
    const handleContextMenu = useCallback((e, item) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            item
        });
    }, []);

    // Close state menu
    const closeContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
    }, []);

    // Handle download
    const handleDownloadFile = useCallback((file) => {
        handleDownload({
            notebookId,
            filename: file.path,
            notebookApiIntegration,
            toast
        });
    }, [notebookId, toast]);

    // Handle delete
    const handleDeleteFileAction = useCallback((file) => {
        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
            handleDeleteFile({
                notebookId,
                filename: file.path,
                notebookApiIntegration,
                fetchFileList: fetchFileListWrapper,
                toast
            });
        }
    }, [notebookId, fetchFileListWrapper, toast]);


    // Handle drag over
    const handleDragOver = useCallback((e, item) => {
        e.preventDefault();
        setDraggedOver(item.path);
    }, []);

    // Handle file drop
    const handleDrop = useCallback((e, targetDir) => {
        e.preventDefault();
        setDraggedOver(null);

        // Handle file dropping from file explorer
        if (e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            handleFileUpload({
                notebookId,
                files,
                notebookApiIntegration,
                uploadConfig,
                setUploading: (uploading) => setUploadState(prev => ({ ...prev, uploading })),
                setUploadProgress: (progress) => setUploadState(prev => ({ ...prev, progress })),
                setError: (error) => setUploadState(prev => ({ ...prev, error })),
                fileInputRef,
                setIsPreview: () => { },
                toast,
                onUpdate: () => { },
                cellId: '',
                abortControllerRef,
                fetchFileList: fetchFileListWrapper,
            });
            return;
        }

        // Handle internal drag and drop (file moving between directories)
        try {
            const draggedItem = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (draggedItem && draggedItem.type === 'file') {
                console.log(`Move ${draggedItem.path} to ${targetDir.path}`);
                // Implement file moving functionality here
                // You'll need to add a moveFile method to notebookApiIntegration
                toast({
                    title: "Move Operation",
                    description: `Moving ${draggedItem.name} to ${targetDir.name}`,
                    variant: "info",
                });
            }
        } catch (err) {
            console.error('Error parsing dragged data:', err);
        }
    }, [notebookId, uploadConfig, fetchFileListWrapper, toast]);

    // Handle global drop zone
    useEffect(() => {
        const handleGlobalDrop = (e) => {
            if (!dropZoneRef.current || !dropZoneRef.current.contains(e.target)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                handleFileUpload({
                    notebookId,
                    files,
                    notebookApiIntegration,
                    uploadConfig,
                    setUploading: (uploading) => setUploadState(prev => ({ ...prev, uploading })),
                    setUploadProgress: (progress) => setUploadState(prev => ({ ...prev, progress })),
                    setError: (error) => setUploadState(prev => ({ ...prev, error })),
                    fileInputRef,
                    setIsPreview: () => { },
                    toast,
                    onUpdate: () => { },
                    cellId: '',
                    abortControllerRef,
                    fetchFileList: fetchFileListWrapper,
                });

                // Display a toast notification
                toast({
                    title: "Upload Started",
                    description: `Uploading ${files.length} file(s)`,
                    variant: "info",
                });
            }
        };

        const handleGlobalDragOver = (e) => {
            if (dropZoneRef.current && dropZoneRef.current.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('drop', handleGlobalDrop);
        document.addEventListener('dragover', handleGlobalDragOver);

        return () => {
            document.removeEventListener('drop', handleGlobalDrop);
            document.removeEventListener('dragover', handleGlobalDragOver);
        };
    }, [notebookId, uploadConfig, fetchFileListWrapper, toast]);

    // We're keeping the file input for future use if needed but not actively using it
    const handleFileInputChange = useCallback((e) => {
        if (e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            handleFileUpload({
                notebookId,
                files,
                notebookApiIntegration,
                uploadConfig,
                setUploading: (uploading) => setUploadState(prev => ({ ...prev, uploading })),
                setUploadProgress: (progress) => setUploadState(prev => ({ ...prev, progress })),
                setError: (error) => setUploadState(prev => ({ ...prev, error })),
                fileInputRef,
                setIsPreview: () => { },
                toast,
                onUpdate: () => { },
                cellId: '',
                abortControllerRef,
                fetchFileList: fetchFileListWrapper,
            });
        }
    }, [notebookId, uploadConfig, fetchFileListWrapper, toast]);

    // Cancel upload
    const handleCancelUpload = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    if (isLoading && !files) {
        return <LoadingIndicator text="Loading files..." />;
    }

    return (
        <div className="py-1 relative h-full" ref={dropZoneRef}>
            {/* Hidden file input for uploads - kept but not actively used */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileInputChange}
            />

            {/* Drag & drop instruction overlay - appears when dragging over */}
            {/* {(draggedOver || uploadState.uploading) ? null : (
                <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-0 hover:opacity-30 transition-opacity duration-300 bg-theme-50 border border-dashed border-theme-300 rounded-lg">
                    <div className="text-center">
                        <p className="text-theme-600 text-sm font-medium">Drag and drop files here to upload</p>
                    </div>
                </div>
            )} */}

            {/* Upload status overlay */}
            {uploadState.uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-10 flex flex-col justify-center items-center rounded-lg border border-theme-200">
                    <div className="mb-3 text-theme-800 font-medium">Uploading files...</div>
                    <div className="w-64 h-3 bg-theme-100 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-theme-500 to-theme-600 rounded-full transition-all duration-300"
                            style={{ width: `${uploadState.progress}%` }}
                        ></div>
                    </div>
                    <div className="mt-2 text-theme-700 font-semibold">{uploadState.progress}%</div>
                    <button
                        className="mt-4 px-4 py-2 bg-theme-100 text-theme-700 rounded-lg hover:bg-theme-200 transition-colors duration-200 font-medium"
                        onClick={handleCancelUpload}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Loading indicator for preview operations */}
            {previewLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="animate-pulse text-theme-700 font-medium">Loading preview...</div>
                </div>
            )}

            {/* File tree header with refresh button */}
            {projectName && (<div className="flex justify-between items-center px-3 mb-3 ml-2 mt-3">
                <h2 className="text-lg font-bold text-theme-800">
                    {projectName}
                </h2>
                <button
                    className="p-2 rounded-lg hover:bg-theme-100 text-theme-700 transition-colors duration-200"
                    onClick={fetchFileListWrapper}
                    title="Refresh file list"
                >
                    <RefreshCw size={14} />
                </button>
            </div>)}

            {/* Drop zone indicator */}
            {draggedOver && (
                <div className="absolute inset-0 border-2 border-dashed border-theme-400 bg-theme-50 bg-opacity-60 z-0 rounded-lg animate-pulse"></div>
            )}

            {/* File tree content */}
            {fileTree.length >0 && (
                <div>
                    {fileTree.map((item, index) => (
                        <FileTreeItem
                            key={`${item.type}-${item.name}-${index}`}
                            item={item}
                            onFileSelect={handleFileSelect}
                            notebookId={notebookId}
                            onContextMenu={handleContextMenu}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        />
                    ))}
                </div>
            )}

            {(projectName || (tasks && tasks.length > 0)) && (<div
                className="
                flex items-center py-2 cursor-pointer
                text-gray-700 hover:bg-theme-50 transition-colors duration-200
                px-3 rounded-lg mx-2 mb-2
                "
                onClick={() => {
                    if (usePreviewStore.getState().previewMode === 'file') {
                        usePreviewStore.getState().changePreviewMode();
                    } 
                }}
            >
                <div className={`mr-3`}>
                    <img src={"./icon.svg"} className="w-8 h-8" />
                </div>
                {/* File or folder name */}
                <span
                    className="truncate text-sm font-bold text-theme-800"
                >
                    {(projectName || (tasks && tasks.length > 0 ? tasks[0].title : '')) + ".easynb"}
                </span>

            </div>)}

            {/* Context Menu */}
            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.item}
                    onClose={closeContextMenu}
                    onPreview={handlePreviewFile}
                    onDownload={handleDownloadFile}
                    onDelete={handleDeleteFileAction}
                />
            )}

            {/* Preview Modal */}
            {/* <PreviewModal
                isOpen={previewState.isOpen}
                onClose={() => setPreviewState(prev => ({ ...prev, isOpen: false }))}
                file={previewState.file}
                content={previewState.content}
                type={previewState.type}
            /> */}

            {/* Error display */}
            {previewError && (
                <div className="absolute bottom-4 right-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow-md animate-fade-in">
                    <p className="text-sm font-medium">{previewError}</p>
                </div>
            )}

        </div>
    );
});

export default FileTree;