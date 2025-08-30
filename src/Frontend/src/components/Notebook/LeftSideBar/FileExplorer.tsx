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

// Types
type FileNodeDirectory = {
    name: string;
    type: 'directory';
    path: string;
    children: FileNode[];
};

type FileNodeFile = {
    name: string;
    type: 'file';
    path: string;
    size?: number;
    lastModified?: number | string;
};

type FileNode = FileNodeDirectory | FileNodeFile;

type ToastVariant = 'success' | 'destructive' | 'info' | 'default';
interface ToastOptions { title: string; description: string; variant: ToastVariant; }

// Infer a simple mime type from file name
const getMimeTypeForFileName = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    if (ext === 'svg') return 'image/svg+xml';
    if (ext === 'pdf') return 'application/pdf';
    if (['html', 'htm'].includes(ext)) return 'text/html';
    if (['txt', 'md', 'json', 'js', 'py', 'css', 'csv'].includes(ext)) return 'text/plain';
    return 'application/octet-stream';
};

// Create a placeholder File object for preview API which requires a File
const createPlaceholderFile = (name: string, lastModified?: number | string): File => {
    const mime = getMimeTypeForFileName(name);
    const lm = typeof lastModified === 'number' ? lastModified : Date.now();
    return new File([''], name, { type: mime, lastModified: lm });
};

// (no-op)
import usePreviewStore from '../../../store/previewStore';
import useStore from '../../../store/notebookStore';
import { SHARED_STYLES, LAYOUT_CONSTANTS, FILE_PREVIEW_CONFIG } from './shared/constants';
import { LoadingIndicator } from './shared/components';

// Initialize file type icons
initializeFileTypeIcons();

// 使用共享的文件预览配置
const PREVIEWABLE_IMAGE_TYPES = FILE_PREVIEW_CONFIG.image;
const PREVIEWABLE_TEXT_TYPES = FILE_PREVIEW_CONFIG.text;
const PREVIEWABLE_PDF_TYPES = FILE_PREVIEW_CONFIG.pdf;
const PREVIEWABLE_DOC_TYPES = FILE_PREVIEW_CONFIG.doc;

/** Get file icon based on extension */
const getFileIcon = (filename: string | undefined) => {
    if (!filename) return <Icon {...getFileTypeIconProps({ extension: 'txt', size: 20 })} />;

    try {
        const extension = (filename.split('.').pop() || '').toLowerCase();
        // Handle common file types with proper icons
        const iconProps = getFileTypeIconProps({ 
            extension: extension || 'txt', 
            size: 20 
        });
        return <Icon {...iconProps} style={{ color: iconProps.iconName?.includes('python') ? '#3776ab' : 
                                               iconProps.iconName?.includes('javascript') ? '#f7df1e' :
                                               iconProps.iconName?.includes('typescript') ? '#3178c6' :
                                               iconProps.iconName?.includes('react') ? '#61dafb' :
                                               iconProps.iconName?.includes('html') ? '#e34f26' :
                                               iconProps.iconName?.includes('css') ? '#1572b6' :
                                               iconProps.iconName?.includes('json') ? '#000000' :
                                               iconProps.iconName?.includes('markdown') ? '#083fa1' :
                                               '#666666' }} />;
    } catch (error) {
        console.error('Error getting file icon for:', filename, error);
        return <Icon {...getFileTypeIconProps({ extension: 'txt', size: 20 })} />;
    }
};

// Context Menu Component
interface ContextMenuProps {
    x: number;
    y: number;
    file: FileNode | null;
    onClose: () => void;
    onPreview: (file: FileNodeFile) => void;
    onDownload: (file: FileNodeFile) => void;
    onDelete: (file: FileNodeFile) => void;
}

const ContextMenu = ({ x, y, file, onClose, onPreview, onDownload, onDelete }: ContextMenuProps) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const node = menuRef.current as unknown as HTMLElement | null;
            if (node && !node.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const ext = file?.name ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
    const isPreviewable = file?.type === 'file' && [...PREVIEWABLE_IMAGE_TYPES, ...PREVIEWABLE_TEXT_TYPES, ...PREVIEWABLE_PDF_TYPES, ...PREVIEWABLE_DOC_TYPES].includes(ext);

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
                                onPreview(file as FileNodeFile);
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
                            onDownload(file as FileNodeFile);
                            onClose();
                        }}
                    >
                        <Download size={16} className="mr-2" />
                        <span>Download</span>
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center transition-colors duration-200 rounded-md mx-1"
                        onClick={() => {
                            onDelete(file as FileNodeFile);
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
interface FileTreeItemProps {
    item: FileNode;
    level?: number;
    onFileSelect?: (file: FileNodeFile) => void;
    notebookId?: string;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, item: FileNode) => void;
    onDragOver?: (e: React.DragEvent<HTMLDivElement>, item: FileNodeDirectory) => void;
    onDrop?: (e: React.DragEvent<HTMLDivElement>, item: FileNodeDirectory) => void;
}

const FileTreeItem = memo(({ item, level = 0, onFileSelect, notebookId, onContextMenu, onDragOver, onDrop }: FileTreeItemProps) => {
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

    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        onContextMenu(e, item);
    }, [item, onContextMenu]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        if (item.type === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            onDragOver?.(e, item);
        }
    }, [item, onDragOver]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
                    {item.children.map((child: FileNode, index: number) => (
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
interface FileTreeProps { notebookId: string; projectName?: string; }

const FileTree = memo(({ notebookId, projectName }: FileTreeProps) => {
    // Get tasks from store to determine if outline can be parsed
    const tasks = useStore((state) => state.tasks);
    const [files, setFiles] = useState<any[] | null>(null);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; item: FileNode | null}>({ visible: false, x: 0, y: 0, item: null });
    const [draggedOver, setDraggedOver] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const dropZoneRef = useRef<HTMLDivElement | null>(null);
    const [uploadState, setUploadState] = useState<{ uploading: boolean; progress: number; error: string | null}>({
        uploading: false,
        progress: 0,
        error: null
    });

    // Access preview store
    const {error: previewError, isLoading: previewLoading } = usePreviewStore();

    // Upload configuration wrapped in useMemo to prevent recreation on every render
    const uploadConfig = useMemo(() => ({
        mode: 'restricted' as const,
        maxFileSize: 50 * 1024 * 1024, // 50MB to support larger DOC/DOCX files
        maxFiles: 10,
        allowedTypes: ['.txt', '.md', '.json', '.js', '.py', '.html', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.csv', '.pdf', '.doc', '.docx', '.xlsx', '.xls'],
        targetDir: '.assets'
    }), []);

    // Toast notification stub (replace with your own toast system)
    const toast = useCallback(({ title, description, variant }: ToastOptions) => {
        console.log(`${variant}: ${title} - ${description}`);
        // Implement your toast notification here
    }, []);

    // Adapter to satisfy utils NotebookApiIntegration shape
    const utilsApi = useMemo(() => ({
        listFiles: async (nid: string) => {
            const resp: any = await notebookApiIntegration.listFiles(nid);
            const mapNode = (f: any): any => ({
                name: f.name,
                size: f.size,
                type: f.type,
                lastModified: f.lastModified ?? 0,
                path: f.path || f.name,
                ...(f.type === 'directory' ? { children: Array.isArray(f.children) ? f.children.map(mapNode) : [] } : {})
            });
            return {
                status: resp.status,
                message: resp.message,
                files: Array.isArray(resp.files) ? resp.files.map(mapNode) : []
            } as { status: 'ok' | 'error'; message?: string; files?: any[] };
        },
        uploadFiles: async (
            nid: string,
            files: File[],
            config: { mode: 'restricted' | 'open'; allowedTypes: string[]; maxFiles?: number },
            _onProgress: (e: ProgressEvent) => void,
            _signal: AbortSignal
        ) => {
            // Include targetDir via type cast to match backend while keeping local types strict
            return await notebookApiIntegration.uploadFiles(nid, files, {
                mode: config.mode,
                allowedTypes: config.allowedTypes,
                maxFiles: config.maxFiles,
                ...(uploadConfig.targetDir ? { targetDir: uploadConfig.targetDir } : {})
            } as any);
        },
        getFilePreviewUrl: async (nid: string, filename: string) => {
            try {
                const base = window.Backend_BASE_URL ? window.Backend_BASE_URL.replace(/\/$/, '') : '';
                const name = filename.split('/').pop() || filename;
                return `${base}/assets/${encodeURIComponent(nid)}/${encodeURIComponent(name)}`;
            } catch {
                return '';
            }
        },
        getFileContent: async (nid: string, filename: string) => {
            const resp: any = await notebookApiIntegration.getFile(nid, filename);
            return resp.content || '';
        },
        downloadFile: async (nid: string, filename: string) => {
            const blob = await notebookApiIntegration.downloadFile(nid, filename);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename.split('/').pop() || filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        },
        deleteFile: async (_nid: string, _filename: string) => {
            throw new Error('Delete API not implemented');
        }
    }), [uploadConfig.targetDir]);

    // Fetch file list function
    const fetchFileListWrapper = useCallback(async () => {
        if (!notebookId) return;
        setIsLoading(true);
        try {
            // Fetch notebook files
            await fetchFileList({
                notebookId,
                notebookApiIntegration: utilsApi as any,
                setFileList: (list) => setFiles(list as any[]),
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

    // Listen for global file list refresh events (e.g., when new files are generated)
    useEffect(() => {
        const handleRefreshFileList = () => {
            console.log('📁 Received refreshFileList event, refreshing file list...');
            fetchFileListWrapper();
        };

        window.addEventListener('refreshFileList', handleRefreshFileList);
        return () => {
            window.removeEventListener('refreshFileList', handleRefreshFileList);
        };
    }, [fetchFileListWrapper]);


    // Process file tree from backend - backend now returns hierarchical structure
    const processFileTree = useMemo<FileNode[]>(() => {
        if (!files || files.length === 0) {
            return [];
        }

        try {
            console.log('Processing file tree, files:', files);
            
            // If files is already a hierarchical structure (array of objects with children)
            if (Array.isArray(files) && files.length > 0 && typeof files[0] === 'object' && (files[0] as any).type) {
                console.log('Files already in tree structure:', files);
                return files as unknown as FileNode[]; // Backend already provided the tree structure
            }

            // Fallback: if still receiving flat file paths, build tree manually
            const tree: FileNode[] = [];
            const directories: Record<string, FileNodeDirectory> = {};

            console.log('Building tree from flat structure...');

            (files as any[]).forEach((filePath: any, index: number) => {
                const pathStr = typeof filePath === 'string' ? filePath : filePath.path || filePath.name;
                console.log(`Processing file ${index}:`, pathStr, filePath);
                
                if (!pathStr) return;
                
                const parts = pathStr.split('/').filter(part => part.trim() !== ''); // Filter empty parts
                let currentPath = '';
                let currentTree = tree as FileNode[];

                // Build directory structure
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!part) continue;
                    
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    
                    // Find existing directory or create new one
                    let existingDir = currentTree.find(item => item.type === 'directory' && item.name === part) as FileNodeDirectory;
                    
                    if (!existingDir) {
                        const newDir: FileNodeDirectory = {
                            name: part,
                            type: 'directory',
                            path: currentPath,
                            children: []
                        };
                        directories[currentPath] = newDir;
                        currentTree.push(newDir);
                        existingDir = newDir;
                    }
                    
                    currentTree = existingDir.children;
                }

                // Add file
                const fileName = parts[parts.length - 1];
                if (fileName) {
                    const fileObj: FileNodeFile = {
                        name: fileName,
                        type: 'file',
                        path: pathStr,
                        size: typeof filePath === 'object' ? filePath.size : undefined,
                        lastModified: typeof filePath === 'object' ? filePath.lastModified : undefined
                    };

                    currentTree.push(fileObj);
                }
            });

            console.log('Final processed tree:', tree);
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
    const handlePreviewFile = useCallback(async (file: FileNodeFile) => {
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

            await usePreviewStore.getState().previewFile(notebookId, file.path, {
                file: createPlaceholderFile(file.name, file.lastModified)
            } as any);
        } catch (err) {
            console.error('Error previewing file:', err);
            toast({
                title: "Preview Error",
                description: `Failed to preview ${file?.name || 'file'}: ${err instanceof Error ? err.message : String(err)}`,
                variant: "destructive",
            });
        }
    },[toast, notebookId]);

    // Handle file selection using the preview store
    const handleFileSelect = useCallback(async (file: FileNodeFile) => {
        console.log('File selected:', file);
        
        if (!file) {
            console.error('File selection error: file is null');
            return;
        }

        // Switch to file preview mode
        if (usePreviewStore.getState().previewMode !== 'file') {
            usePreviewStore.getState().changePreviewMode();
        }

        const fileExt = (file.name.split('.').pop() || '').toLowerCase();
        
        // Extended previewable types including JSX/TSX
        const jsxTypes = ['.jsx', '.tsx'];
        const allPreviewableTypes = [...PREVIEWABLE_IMAGE_TYPES, ...PREVIEWABLE_TEXT_TYPES, ...PREVIEWABLE_PDF_TYPES, ...PREVIEWABLE_DOC_TYPES, ...jsxTypes];
        const isPreviewable = allPreviewableTypes.includes(`.${fileExt}`);

        console.log('File extension:', fileExt, 'Is previewable:', isPreviewable);

        if (isPreviewable) {
            handlePreviewFile(file);
        } else {
            // For non-previewable files, show a message
            toast({
                title: "File Type Not Supported",
                description: `Cannot preview ${file.name}. File type .${fileExt} is not supported for preview.`,
                variant: "info"
            });
        }
    }, [handlePreviewFile, toast]);

    // Handle state menu
    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>, item: FileNode) => {
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
    const handleDownloadFile = useCallback((file: FileNodeFile) => {
        handleDownload({
            notebookId,
            filename: file.path,
            notebookApiIntegration: utilsApi as any,
            toast
        });
    }, [notebookId, toast, utilsApi]);

    // Handle delete
    const handleDeleteFileAction = useCallback((file: FileNodeFile) => {
        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
            handleDeleteFile({
                notebookId,
                filename: file.path,
                notebookApiIntegration: utilsApi as any,
                fetchFileList: fetchFileListWrapper,
                toast
            });
        }
    }, [notebookId, fetchFileListWrapper, toast, utilsApi]);


    // Handle drag over
    const handleDragOver = useCallback((e: React.DragEvent, item: FileNodeDirectory) => {
        e.preventDefault();
        setDraggedOver(item.path);
    }, []);

    // Handle file drop
    const handleDrop = useCallback((e: React.DragEvent, targetDir: FileNodeDirectory) => {
        e.preventDefault();
        setDraggedOver(null);

        // Handle file dropping from file explorer
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files) as File[];
            handleFileUpload({
                notebookId,
                files,
                notebookApiIntegration: utilsApi as any,
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
            const draggedItem = JSON.parse(e.dataTransfer.getData('text/plain')) as FileNode;
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
        const handleGlobalDrop = (e: DragEvent) => {
            const node = dropZoneRef.current as unknown as HTMLElement | null;
            if (!node || !node.contains(e.target as Node)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files) as File[];
                handleFileUpload({
                    notebookId,
                    files,
                    notebookApiIntegration: utilsApi as any,
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

        const handleGlobalDragOver = (e: DragEvent) => {
            const node = dropZoneRef.current as unknown as HTMLElement | null;
            if (node && node.contains(e.target as Node)) {
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
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            handleFileUpload({
                notebookId,
                files,
                notebookApiIntegration: utilsApi as any,
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
    }, [notebookId, uploadConfig, fetchFileListWrapper, toast, utilsApi]);

    // Cancel upload
    const handleCancelUpload = useCallback(() => {
        abortControllerRef.current?.abort();
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
                <div className={`mr-2 ml-3`}>
                    <img src={"/icon.svg"} className="w-7 h-7" />
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