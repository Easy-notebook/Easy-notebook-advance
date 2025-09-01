// store/previewStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notebookApiIntegration } from '../services/notebookServices';
import {
  FileCache,
  initializeStorage,
  type FileObject as StorageFileObject,
  type FileType,
  type ActivePreviewMode,
  getFileType,
  getActivePreviewMode,
  getMimeType,
  SplitPreviewCache
} from '../storage';

/**
 * 预览模式类型
 */
export type PreviewMode = 'notebook' | 'file';

// Re-export types from storage module
export type { FileType, ActivePreviewMode } from '../storage';

/**
 * 文件元数据接口
 */
export interface FileMetadata {
    file: File;
    lastModified?: string | number;
}

// Re-export FileObject from storage module
export type FileObject = StorageFileObject;

/**
 * 预览文件接口（简化版）
 */
export interface PreviewFile {
    id: string;
    path: string;
    name: string;
    type: FileType;
}

/**
 * API 响应接口
 */
export interface FileApiResponse {
    content?: string;
    dataUrl?: string;
    size?: number;
    error?: string;
}

/**
 * Preview Store 状态接口
 */
export interface PreviewStoreState {
    previewMode: PreviewMode;
    currentPreviewFiles: PreviewFile[]; // List of files being previewed
    activeFile: FileObject | null; // Currently active preview file
    activePreviewMode: ActivePreviewMode; // Renderer mode for active file
    dirtyMap: Record<string, boolean>; // fileId -> dirty flag
    isLoading: boolean;
    error: string | null;

    // Current notebook tracking
    currentNotebookId: string | null; // Currently active notebook ID

    // Split preview state - independent from tab system
    activeSplitFile: FileObject | null; // Currently active split preview file
    activeSplitMode: ActivePreviewMode; // Renderer mode for split preview
    isSplitLoading: boolean; // Loading state for split preview
}

/**
 * Preview Store Actions 接口
 */
export interface PreviewStoreActions {
    changePreviewMode: () => void;
    init: () => void;
    clearError: () => void;
    setCurrentPreviewFiles: (files: PreviewFile[]) => void;
    setActiveFile: (file: FileObject | null) => void;
    setActivePreviewMode: (mode: ActivePreviewMode) => void;
    getCurrentPreviewFiles: () => PreviewFile[];
    previewFile: (notebookId: string, filePath: string, fileMetadata?: FileMetadata) => Promise<FileObject | undefined>;
    getActiveFile: () => FileObject | null;
    closePreviewFile: (fileId: string) => void;
    loadFileById: (fileId: string) => Promise<FileObject | null>;
    deleteFileFromCache: (notebookId: string, filePath: string) => Promise<boolean>;
    clearCacheForNotebook: (notebookId: string) => Promise<boolean>;
    getCSVData: () => string | null;
    updateActiveFileContent: (content: string) => Promise<FileObject | null>;
    setTabDirty: (fileId: string, value: boolean) => void;
    isTabDirty: (fileId: string) => boolean;

    // Notebook-based tab loading
    loadNotebookTabs: (notebookId: string) => Promise<void>;
    switchToNotebook: (notebookId: string) => Promise<void>;
    getCurrentNotebookId: () => string | null;
    getTabsByNotebook: (notebookId: string) => PreviewFile[];

    // Split preview actions - independent from tab system
    previewFileInSplit: (notebookId: string, filePath: string, fileMetadata?: FileMetadata) => Promise<FileObject | undefined>;
    closeSplitPreview: () => void;
    getActiveSplitFile: () => FileObject | null;
}

/**
 * 完整的 Preview Store 类型
 */
export type PreviewStore = PreviewStoreState & PreviewStoreActions;

// --- NotebookId-first small helpers (local, decoupled) ---
const FILE_ID_SEP = '::';
const makeFileId = (notebookId: string, filePath: string) => `${notebookId}${FILE_ID_SEP}${filePath}`;
const parseFileId = (fileId: string): { notebookId: string; filePath: string } | null => {
  const idx = fileId.indexOf(FILE_ID_SEP);
  if (idx === -1) return null;
  const notebookId = fileId.slice(0, idx);
  const filePath = fileId.slice(idx + FILE_ID_SEP.length);
  if (!notebookId || !filePath) return null;
  return { notebookId, filePath };
};
const hasNotebookId = (notebookId: string | null | undefined): notebookId is string => {
  if (!notebookId || typeof notebookId !== 'string') {
    console.warn('Operation requires a valid notebookId but got:', notebookId);
    return false;
  }
  return true;
};



// Create the store
const usePreviewStore = create<PreviewStore>()(
    persist(
        (set, get) => ({
            previewMode: 'notebook',
            currentPreviewFiles: [], // List of files being previewed
            activeFile: null, // Currently active preview file
            activePreviewMode: null,
            dirtyMap: {},
            isLoading: false,
            error: null,

            // Current notebook tracking
            currentNotebookId: null, // Currently active notebook ID

            // Split preview initial state
            activeSplitFile: null,
            activeSplitMode: null,
            isSplitLoading: false,

            changePreviewMode: () => {
                if (get().previewMode === 'notebook') {
                    set({ previewMode: 'file' });
                } else {
                    set({ previewMode: 'notebook' });
                }
            },

            // Initialize the store
            init: async () => {
                try {
                    await initializeStorage();


                    // If no current notebook is set, ensure no stale tabs from previous session are shown
                    if (!get().currentNotebookId) {
                        set({ currentPreviewFiles: [], activeFile: null, activePreviewMode: null });
                    }

                    // Restore notebooks from cache after page refresh
                    const cachedNotebooks = await FileCache.getAllNotebooks();
                    console.log(`Restored ${cachedNotebooks.length} notebooks from cache:`, cachedNotebooks);

                    // If there's only one cached notebook or a most recently accessed one,
                    // we could potentially restore it as the active notebook
                    if (cachedNotebooks.length > 0) {
                        // Sort by last accessed time to get the most recent
                        const mostRecentNotebook = cachedNotebooks.sort((a, b) =>
                            b.lastAccessedAt - a.lastAccessedAt
                        )[0];

                        console.log(`Most recent notebook: ${mostRecentNotebook.id} (${mostRecentNotebook.name})`);

                        // Import and update notebook store with the most recent notebook
                        const { default: useNotebookStore } = await import('./notebookStore');
                        useNotebookStore.getState().setNotebookId(mostRecentNotebook.id);
                        useNotebookStore.getState().setNotebookTitle(mostRecentNotebook.name || `Notebook ${mostRecentNotebook.id.slice(0, 8)}`);

                        // Also set the current notebook ID in preview store
                        set({ currentNotebookId: mostRecentNotebook.id });

                        console.log(`Restored notebook context: ${mostRecentNotebook.id}`);

                        // Also restore cached files for this notebook
                        try {
                            const cachedFiles = await FileCache.getFilesForNotebook(mostRecentNotebook.id);
                            console.log(`Restored ${cachedFiles.length} cached files for notebook ${mostRecentNotebook.id}`);

                            // You can set these in preview state if needed
                            // set({ currentPreviewFiles: cachedFiles.map(file => ({...file})) });

                        } catch (fileError) {
                            console.warn('Failed to restore cached files:', fileError);
                        }
                    }

                } catch (error) {
                    console.error('Failed to initialize storage:', error);
                    set({ error: 'Failed to initialize file cache database' });
                }
            },

            // Clear error
            clearError: () => set({ error: null }),

            // Set currently previewed files
            setCurrentPreviewFiles: (files: PreviewFile[]) => set({ currentPreviewFiles: files }),

            // Set active file
            setActiveFile: (file: FileObject | null) => set({ activeFile: file }),

            // Set active preview mode
            setActivePreviewMode: (mode: ActivePreviewMode) => set({ activePreviewMode: mode }),

            getCurrentPreviewFiles: () => get().currentPreviewFiles,

            // Fetch and preview a file
            previewFile: async (notebookId: string, filePath: string, fileMetadata: FileMetadata = {} as FileMetadata): Promise<FileObject | undefined> => {
                set({ isLoading: true, error: null });

                // Generate a unique ID for the file
                const fileId = makeFileId(notebookId, filePath);

                // Check if file exists in cache with optimized query
                const cachedFile = await FileCache.getFile(notebookId, filePath);
                const lastModifiedBackend = fileMetadata.lastModified || null;
                let file = fileMetadata.file;
                if (!file) {
                    // Create a safe placeholder File when not provided (derive name from path)
                    try {
                        const baseName = filePath.split('/').pop() || filePath;
                        const mime = getMimeType(filePath);
                        file = new File([''], baseName, { type: mime, lastModified: Date.now() });
                    } catch (e) {
                        console.warn('Failed to create placeholder File:', e);
                    }
                }
                if (!file) {
                    set({ error: 'File not found', isLoading: false });
                    return;
                }

                // Determine if we need to fetch from backend
                const needsFetch = !cachedFile ||
                    (lastModifiedBackend && cachedFile.lastModified !== lastModifiedBackend);


                if (needsFetch) {
                    try {
                        // Get file from backend for the requested path
                        const response: FileApiResponse = await notebookApiIntegration.getFile(notebookId, filePath);

                        if (!response || response.error) {
                            throw new Error(response?.error || 'Failed to fetch file');
                        }

                        // Determine the file content and type
                        let content = response.content || '';
                        const fileType = getFileType(filePath);
                        console.log('previewStore.previewFile - file type detection:', {
                            filePath,
                            detectedType: fileType,
                            fileExt: filePath.split('.').pop()?.toLowerCase()
                        });

                        // Special handling for xlsx files that might be cached as 'text'
                        const fileExt = filePath.split('.').pop()?.toLowerCase();
                        if (fileExt === 'xlsx' || fileExt === 'xls') {
                            console.log('previewStore.previewFile - Forcing xlsx type for Excel file');
                            // Ensure xlsx files are treated as xlsx, not text
                        }

                        // Handle specific file types
                        if (fileType === 'image') {
                            // For images, content should be the data URL
                            if (typeof content === 'string' && content.startsWith('data:')) {
                                // Already in correct format
                            } else {
                                // Convert to data URL if needed
                                const fileExt = filePath.split('.').pop()?.toLowerCase();
                                content = response.dataUrl || `data:image/${fileExt};base64,${content}`;
                            }
                        } else if (fileType === 'pdf') {
                            // For PDFs, build data URL. If content empty, fall back to served assets URL
                            if (typeof content === 'string' && content.startsWith('data:')) {
                                // Already data URL
                            } else {
                                const dataUrl = content ? `data:application/pdf;base64,${content}` : '';
                                let assetsUrl = '';
                                try {
                                    const base = window.Backend_BASE_URL ? window.Backend_BASE_URL.replace(/\/$/, '') : '';
                                    const name = filePath.split('/').pop() || filePath;
                                    assetsUrl = `${base}/assets/${encodeURIComponent(notebookId)}/${encodeURIComponent(name)}`;
                                } catch {}
                                content = dataUrl || assetsUrl;
                            }
                        } else if (fileType === 'docx') {
                            // For DOC/DOCX files, content should be base64 or data URL for binary files
                            console.log('previewStore - Processing DOCX file:', filePath);
                            console.log('previewStore - Original content type:', typeof content);
                            console.log('previewStore - Content length:', content ? content.length : 0);
                            console.log('previewStore - Content preview:', content ? content.substring(0, 100) + '...' : 'empty');

                            if (typeof content === 'string' && content.startsWith('data:')) {
                                console.log('previewStore - Content is already data URL format');
                                // Already data URL format
                            } else if (content) {
                                // Convert to data URL for binary handling
                                console.log('previewStore - Converting to data URL format');
                                const mimeType = fileExt === 'doc' ?
                                    'application/msword' :
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                                content = `data:${mimeType};base64,${content}`;
                                console.log('previewStore - Final content length:', content.length);
                            } else {
                                console.error('previewStore - No content received for DOCX file');
                            }
                        }

                        // Create file object data for cache
                        const fileObjectData = {
                            id: fileId,
                            notebookId,
                            path: filePath,
                            name: file.name,
                            content,
                            type: fileType,
                            lastModified: String(lastModifiedBackend || new Date().toISOString()),
                            size: response.size || 0
                        };

                        // Save to optimized IndexedDB
                        await FileCache.saveFile(fileObjectData);

                        // Create full file object for state
                        const fileObject: FileObject = {
                            ...fileObjectData,
                            cachedAt: Date.now(),
                            accessCount: 1,
                            lastAccessed: Date.now()
                        };

                        // Set as active file and renderer mode
                        const activeMode = getActivePreviewMode(fileType);
                        set({
                            activeFile: fileObject,
                            activePreviewMode: activeMode,
                            isLoading: false
                        });

                        // Update current preview files list - better management
                        const { currentPreviewFiles } = get();
                        const existingFileIndex = currentPreviewFiles.findIndex(f => f.id === fileId);

                        let updatedFiles: PreviewFile[];
                        if (existingFileIndex >= 0) {
                            // Update existing file in the list
                            updatedFiles = [...currentPreviewFiles];
                            updatedFiles[existingFileIndex] = {
                                id: fileId,
                                path: filePath,
                                name: file.name,
                                type: fileType
                            };
                        } else {
                            // Add new file to the list
                            updatedFiles = [...currentPreviewFiles, {
                                id: fileId,
                                path: filePath,
                                name: file.name,
                                type: fileType
                            }];
                        }

                        set({ currentPreviewFiles: updatedFiles });
                        return fileObject;
                    } catch (e: any) {
                        const msg = (e && e.message) ? String(e.message) : '';
                        console.log('previewFile: fetch error -', { msg, filePath });

                        const isNotFound = /not\s*found/i.test(msg) || /404/.test(msg);

                        // If it's a 404 error, don't create tabs for missing files
                        if (isNotFound) {
                            console.warn(`File not found: ${filePath} - will not create tab`);
                            set({ isLoading: false, error: null }); // Clear error, don't show to user
                            return undefined; // Return undefined instead of throwing
                        }

                        // For non-404 errors, try fallbacks
                        const baseName = filePath.split('/').pop() || filePath;

                        if (baseName !== filePath) {
                            console.log('previewFile: trying fallback to basename -', baseName);
                            try {
                                return await get().previewFile(notebookId, baseName, fileMetadata);
                            } catch (fallbackError) {
                                console.warn('Basename fallback also failed:', fallbackError);
                            }
                        }

                        // Try URL encoding the file path
                        if (filePath.includes(' ')) {
                            console.log('previewFile: trying URL encoded path');
                            const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
                            if (encodedPath !== filePath) {
                                try {
                                    return await get().previewFile(notebookId, encodedPath, fileMetadata);
                                } catch (encodingError) {
                                    console.warn('URL encoding fallback also failed:', encodingError);
                                }
                            }
                        }

                        // All fallbacks failed, don't create a tab
                        set({ isLoading: false, error: null }); // Clear error, don't show to user
                        console.warn(`All attempts to load file failed: ${filePath} - no tab will be created`);
                        return undefined; // Return undefined instead of throwing
                    }
                } else {
                    // File found in cache
                    const cachedMode = getActivePreviewMode(cachedFile.type as FileType);
                    set({
                        activeFile: cachedFile,
                        activePreviewMode: cachedMode,
                        isLoading: false
                    });

                    // Update current preview files list - better management for cached files
                    const { currentPreviewFiles } = get();
                    const existingFileIndex = currentPreviewFiles.findIndex(f => f.id === fileId);

                    let updatedFiles: PreviewFile[];
                    if (existingFileIndex >= 0) {
                        // Update existing file in the list
                        updatedFiles = [...currentPreviewFiles];
                        updatedFiles[existingFileIndex] = {
                            id: fileId,
                            path: filePath,
                            name: file.name,
                            type: getFileType(filePath)
                        };
                    } else {
                        // Add new file to the list
                        updatedFiles = [...currentPreviewFiles, {
                            id: fileId,
                            path: filePath,
                            name: file.name,
                            type: getFileType(filePath)
                        }];
                    }

                    set({ currentPreviewFiles: updatedFiles });
                    return cachedFile;
                }
            },

            getActiveFile: () => get().activeFile,

            // Close a preview file
            closePreviewFile: (fileId: string) => {
                const { currentPreviewFiles, activeFile, dirtyMap } = get();

                // Compute next active before removal to preserve adjacency
                const closedIndex = currentPreviewFiles.findIndex(f => f.id === fileId);
                const updatedFiles = currentPreviewFiles.filter(f => f.id !== fileId);

                // Clean dirty flag for closed tab
                const { [fileId]: _, ...nextDirtyMap } = dirtyMap;

                // If it was the active file, set a new active file or null
                if (activeFile && activeFile.id === fileId) {
                    if (updatedFiles.length > 0) {
                        // Prefer the neighbor at the same index; fallback to last index available
                        const nextIndex = Math.min(closedIndex, updatedFiles.length - 1);
                        const nextId = updatedFiles[nextIndex].id;
                        get().loadFileById(nextId).then((newActiveFile) => {
                            set({
                                currentPreviewFiles: updatedFiles,
                                activeFile: newActiveFile,
                                dirtyMap: nextDirtyMap
                            });
                        });
                    } else {
                        set({
                            currentPreviewFiles: updatedFiles,
                            activeFile: null,
                            activePreviewMode: null,
                            dirtyMap: nextDirtyMap
                        });
                    }
                } else {
                    // Just update the files list
                    set({ currentPreviewFiles: updatedFiles, dirtyMap: nextDirtyMap });
                }
            },

            // Load a file by its ID
            loadFileById: async (fileId: string): Promise<FileObject | null> => {
                try {
                    console.log(`Loading file by ID: ${fileId}`);

                    const parsed = parseFileId(fileId);
                    if (!parsed) {
                        console.error('Invalid fileId format:', fileId);
                        return null;
                    }
                    const { notebookId, filePath } = parsed;

                    // Validate extracted values
                    if (!notebookId || !filePath) {
                        console.error('Invalid fileId components:', { fileId, notebookId, filePath });
                        return null;
                    }

                    // Check cache first
                    const cachedFile = await FileCache.getFile(notebookId, filePath);
                    if (cachedFile) {
                        console.log(`Found file in cache: ${filePath}`);
                        // Set active preview mode based on file type
                        const previewMode = getActivePreviewMode(cachedFile.type as FileType);

                        set({
                            activeFile: cachedFile,
                            activePreviewMode: previewMode
                        });
                        return cachedFile;
                    }

                    // Try to fetch from server, but handle errors gracefully
                    try {
                        console.log(`Attempting to fetch file from server: ${filePath}`);
                        const fetched = await get().previewFile(notebookId, filePath);
                        if (fetched) {
                            console.log(`✅ Successfully fetched and loaded file: ${filePath}`);
                            return fetched;
                        } else {
                            console.warn(`File fetch returned undefined: ${filePath}`);
                            return null;
                        }
                    } catch (e: any) {
                        const msg = e?.message || String(e);
                        const isNotFound = /not\s*found/i.test(msg) || /404/.test(msg);

                        if (isNotFound) {
                            console.warn(`File not found on server: ${filePath} - this is normal for missing files`);

                            // Remove this tab from the preview files list since the file doesn't exist
                            const { currentPreviewFiles } = get();
                            const updatedFiles = currentPreviewFiles.filter(f => f.id !== fileId);

                            set({
                                currentPreviewFiles: updatedFiles,
                                error: null // Don't show error to user for missing files
                            });

                            return null;
                        } else {
                            console.error(`Error loading file ${filePath}:`, e);
                            return null;
                        }
                    }
                } catch (error) {
                    console.error('Error loading file by ID:', error);
                    return null;
                }
            },

            // Delete a file from cache
            deleteFileFromCache: async (notebookId: string, filePath: string): Promise<boolean> => {
                try {
                    await FileCache.deleteFile(notebookId, filePath);

                    // Update state if needed
                    const fileId = makeFileId(notebookId, filePath);
                    const { currentPreviewFiles } = get();

                    // Remove from preview files list
                    if (currentPreviewFiles.some(f => f.id === fileId)) {
                        get().closePreviewFile(fileId);
                    }

                    return true;
                } catch (error) {
                    console.error('Error deleting file from cache:', error);
                    set({ error: 'Failed to delete file from cache' });
                    return false;
                }
            },

            // Clear all files for a notebook
            clearCacheForNotebook: async (notebookId: string): Promise<boolean> => {
                try {
                    await FileCache.clearNotebookCache(notebookId);

                    // Update state
                    const { currentPreviewFiles } = get();
                    const updatedFiles = currentPreviewFiles.filter(
                        f => !f.id.startsWith(`${notebookId}::`)
                    );

                    // Handle active file and preview mode setting
                    if (updatedFiles.length > 0) {
                        const activeFile = await get().loadFileById(updatedFiles[0].id);
                        const activePreviewMode = activeFile
                            ? getActivePreviewMode(activeFile.type as FileType)
                            : 'default';

                        set({
                            currentPreviewFiles: updatedFiles,
                            activeFile: activeFile,
                            activePreviewMode: activePreviewMode
                        });
                    } else {
                        set({
                            currentPreviewFiles: updatedFiles,
                            activeFile: null,
                            activePreviewMode: null
                        });
                    }

                    return true;
                } catch (error) {
                    console.error('Error clearing notebook cache:', error);
                    set({ error: 'Failed to clear notebook cache' });
                    return false;
                }
            },

            // Get CSV data for CSVPreviewApp
            getCSVData: (): string | null => {
                const { activeFile } = get();
                if (!activeFile || activeFile.type !== 'csv') return null;

                try {
                    if (typeof activeFile.content === 'string') {
                        return activeFile.content;
                    }
                    return null;
                } catch (error) {
                    console.error('Error getting CSV data:', error);
                    return null;
                }
            },

            // Update active file content and keep cache consistent
            updateActiveFileContent: async (content: string): Promise<FileObject | null> => {
                const state = get();
                const file = state.activeFile;
                if (!file) return null;

                const updated: FileObject = { ...file, content };

                // Transform to match FileCache.saveFile expected format
                const cacheData = {
                    notebookId: updated.notebookId,
                    filePath: updated.path,
                    fileName: updated.name,
                    content: updated.content,
                    lastModified: updated.lastModified,
                    size: updated.size
                };

                if (!hasNotebookId(updated.notebookId)) {
                    set({ isLoading: false });
                    return null;
                }

                await FileCache.saveFile(cacheData);
                set({ activeFile: updated });
                return updated;
            },

            setTabDirty: (fileId: string, value: boolean) => {
                set((s) => ({ dirtyMap: { ...s.dirtyMap, [fileId]: value } }));
            },

            isTabDirty: (fileId: string): boolean => {
                return !!get().dirtyMap[fileId];
            },

            // Load tabs for a specific notebook
            loadNotebookTabs: async (notebookId: string): Promise<void> => {
                try {
                    console.log(`📁 Loading tabs for notebook ${notebookId}...`);

                    set({ isLoading: true, error: null });

                    // 🔍 Get current state to check if we're switching notebooks
                    const currentState = get();
                    const currentNotebookId = currentState.getCurrentNotebookId();

                    if (currentNotebookId && currentNotebookId !== notebookId) {
                        console.log(`📝 Switching from notebook ${currentNotebookId} to ${notebookId}`);
                        // Clear all tabs when switching notebooks
                        set({
                            currentPreviewFiles: [],
                            activeFile: null,
                            activePreviewMode: null
                        });
                    } else if (currentNotebookId === notebookId) {
                        console.log(`📋 Already on notebook ${notebookId}, refreshing tabs`);
                    }

                    // 📂 Get files from storage (only for current notebook)
                    let files: any[] = [];
                    try {
                        const { FileORM } = await import('../storage');
                        const fileResults = await FileORM.getFilesForNotebook(notebookId, false); // Don't load content for tabs

                        // 🔍 Filter out notebook main files and invalid files
                        const filteredResults = fileResults.filter(result => {
                            const filePath = result.metadata.filePath;
                            const fileName = result.metadata.fileName;

                            // Skip notebook main files (they shouldn't be tabs)
                            if (filePath.startsWith('notebook_') && filePath.endsWith('.json')) {
                                console.log(`📋 Skipping notebook main file: ${fileName}`);
                                return false;
                            }

                            // Skip .easynb files (they are notebook files, not separate tabs)
                            if (fileName.endsWith('.easynb')) {
                                console.log(`📋 Skipping .easynb file: ${fileName}`);
                                return false;
                            }

                            return true;
                        });

                        files = filteredResults.map(result => ({
                            id: makeFileId(notebookId, result.metadata.filePath),
                            path: result.metadata.filePath,
                            name: result.metadata.fileName,
                            type: result.metadata.fileType,
                            lastModified: result.metadata.lastModified,
                            size: result.metadata.size,
                            notebookId: result.metadata.notebookId,
                            exists: true
                        }));

                        console.log(`📂 Found ${files.length} valid files for tabs (filtered from ${fileResults.length} total)`);

                        // 🔄 Also fetch files from backend for this notebook and merge
                        try {
                            const resp = await notebookApiIntegration.listFiles(notebookId);
                            if (resp && (resp as any).status === 'ok' && Array.isArray((resp as any).files)) {
                                const nodes = (resp as any).files as any[];
                                const flatten = (arr: any[]): any[] => arr.flatMap((n) => (
                                    n && n.type === 'directory' && Array.isArray(n.children) ? flatten(n.children) : [n]
                                ));
                                const flatFiles = flatten(nodes);
                                const filteredBackend = flatFiles.filter((f) => {
                                    const fileName = f?.name || '';
                                    const filePath = f?.path || f?.name || '';
                                    if (filePath.startsWith('notebook_') && filePath.endsWith('.json')) return false;
                                    if (fileName.endsWith('.easynb')) return false;
                                    return true;
                                });
                                const backendFiles = filteredBackend.map((f) => ({
                                    id: makeFileId(notebookId, f.path || f.name),
                                    path: f.path || f.name,
                                    name: f.name,
                                    type: getFileType((f.path || f.name) as string),
                                }));

                                // Merge storage files and backend files by path
                                const byPath = new Map<string, any>();
                                files.forEach((x) => byPath.set(x.path, x));
                                backendFiles.forEach((x) => { if (!byPath.has(x.path)) byPath.set(x.path, x); });
                                files = Array.from(byPath.values());
                                console.log(`📦 Merged files from storage+backend: ${files.length}`);
                            }
                        } catch (e) {
                            console.warn('📦 Backend listFiles failed:', e);
                        }

                    } catch (storageError) {
                        console.warn('📂 Storage system failed:', storageError);
                        files = [];
                    }

                    // 🏷️ Convert to PreviewFile format with additional validation
                    const { validateFileForTab } = await import('../utils/fileValidation');

                    const previewFiles: PreviewFile[] = files
                        .filter(file => {
                            const validation = validateFileForTab(file.path || '', file.name || '', '');

                            if (!validation.isValid) {
                                console.log(`🚫 Skipping invalid file: ${file.name} - ${validation.reason}`);
                                return false;
                            }

                            return true;
                        })
                        .map(file => ({
                            id: file.id || `${notebookId}::${file.path}`,
                            path: file.path,
                            name: file.name,
                            type: getFileType(file.path || file.name) as FileType
                        }));

                    console.log(`✅ Processed ${previewFiles.length} valid preview files for tabs`);

                    // 🎯 Only set tabs for current notebook (no auto-active file)
                    // Guard: do not show stale tabs if notebook no longer matches
                    const stillCurrent = get().currentNotebookId === notebookId && !!notebookId;
                    if (!stillCurrent) {
                        set({ currentPreviewFiles: [], activeFile: null, activePreviewMode: null, isLoading: false });
                        console.log('🧹 Cleared tabs due to no active notebook');
                        return;
                    }
                    set({
                        currentPreviewFiles: previewFiles,
                        activeFile: null, // Don't auto-activate any file
                        activePreviewMode: null,
                        isLoading: false
                    });

                    console.log(`✅ Loaded ${previewFiles.length} tabs for notebook ${notebookId} (safe mode)`);
                } catch (error) {
                    console.error(`Failed to load tabs for notebook ${notebookId}:`, error);
                    set({
                        error: `Failed to load notebook tabs: ${error}`,
                        isLoading: false
                    });
                }
            },

            // Switch to a different notebook and load its tabs
            switchToNotebook: async (notebookId: string): Promise<void> => {
                try {
                    console.log(`Switching to notebook ${notebookId}...`);

                    // Update notebook store
                    const { default: useNotebookStore } = await import('./notebookStore');
                    const notebookStore = useNotebookStore.getState();

                    // Load notebook content from database
                    const loaded = await notebookStore.loadFromDatabase(notebookId);
                    if (!loaded) {
                        console.warn(`Could not load notebook ${notebookId} from database`);
                    }

                    // Set current notebook ID, switch to notebook mode, and load tabs
                    set({ 
                        currentNotebookId: notebookId,
                        previewMode: 'notebook',  // 确保切换到notebook预览模式
                        activeFile: null  // 清除活跃文件
                    });
                    await get().loadNotebookTabs(notebookId);

                    console.log(`✅ Switched to notebook ${notebookId}, previewMode set to notebook`);
                } catch (error) {
                    console.error(`Failed to switch to notebook ${notebookId}:`, error);
                    set({ error: `Failed to switch notebook: ${error}` });
                }
            },

            // Get current notebook ID
            getCurrentNotebookId: (): string | null => {
                return get().currentNotebookId;
            },

            // Get tabs filtered by notebook ID
            getTabsByNotebook: (notebookId: string): PreviewFile[] => {
                const { currentPreviewFiles } = get();
                return currentPreviewFiles.filter(file =>
                    file.id.startsWith(`${notebookId}::`)
                );
            },

            // Split preview methods - independent from tab system
            previewFileInSplit: async (notebookId: string, filePath: string, fileMetadata: FileMetadata = {} as FileMetadata): Promise<FileObject | undefined> => {
                set({ isSplitLoading: true, error: null });

                console.log(`🔀 Split preview: Loading ${filePath} from notebook ${notebookId}`);

                try {
                    // Generate a unique ID for the file
                    const fileId = makeFileId(notebookId, filePath);

                    // Check if file exists in split preview cache (independent from tabs)
                    const cachedFile = await SplitPreviewCache.getFile(notebookId, filePath);
                    const lastModifiedBackend = fileMetadata.lastModified || null;

                    let file = fileMetadata.file;
                    if (!file) {
                        // Create a safe placeholder File when not provided
                        try {
                            const baseName = filePath.split('/').pop() || filePath;
                            const mime = getMimeType(filePath);
                            file = new File([''], baseName, { type: mime, lastModified: Date.now() });
                        } catch (e) {
                            console.warn('Failed to create placeholder File for split preview:', e);
                        }
                    }

                    if (!file) {
                        set({ error: 'File not found for split preview', isSplitLoading: false });
                        return;
                    }

                    // Determine if we need to fetch from backend
                    const needsFetch = !cachedFile || (lastModifiedBackend && cachedFile.lastModified !== lastModifiedBackend);

                    let fileObject: FileObject;

                    if (needsFetch) {
                        console.log(`🌐 Split preview: Fetching ${filePath} from backend`);

                        // Get file from backend
                        const response: FileApiResponse = await notebookApiIntegration.getFile(notebookId, filePath);

                        if (!response || response.error) {
                            throw new Error(response?.error || 'Failed to fetch file for split preview');
                        }

                        // Process file content based on type (similar to regular preview)
                        let content = response.content || '';
                        const fileType = getFileType(filePath);

                        if (fileType === 'image') {
                            if (typeof content === 'string' && content.startsWith('data:')) {
                                // Already in correct format
                            } else {
                                const fileExt = filePath.split('.').pop()?.toLowerCase();
                                content = response.dataUrl || `data:image/${fileExt};base64,${content}`;
                            }
                        } else if (fileType === 'pdf') {
                            if (typeof content === 'string' && content.startsWith('data:')) {
                                // Already data URL
                            } else {
                                const dataUrl = content ? `data:application/pdf;base64,${content}` : '';
                                let assetsUrl = '';
                                try {
                                    const base = window.Backend_BASE_URL ? window.Backend_BASE_URL.replace(/\/$/, '') : '';
                                    const name = filePath.split('/').pop() || filePath;
                                    assetsUrl = `${base}/assets/${encodeURIComponent(notebookId)}/${encodeURIComponent(name)}`;
                                } catch {}
                                content = dataUrl || assetsUrl;
                            }
                        } else if (fileType === 'docx') {
                            if (typeof content === 'string' && content.startsWith('data:')) {
                                // Already data URL format
                            } else if (content) {
                                const fileExt = filePath.split('.').pop()?.toLowerCase();
                                const mimeType = fileExt === 'doc' ?
                                    'application/msword' :
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                                content = `data:${mimeType};base64,${content}`;
                            }
                        }

                        // Create file object (fill required fields for FileObject)
                        fileObject = {
                            id: fileId,
                            notebookId,
                            name: file.name,
                            path: filePath,
                            content,
                            type: fileType,
                            size: file.size,
                            lastModified: new Date(lastModifiedBackend || Date.now()).toISOString(),
                            cachedAt: Date.now(),
                            accessCount: 1,
                            lastAccessed: Date.now()
                        };

                        // Cache the file for future use in split preview cache (independent from tabs)
                        await SplitPreviewCache.saveFile(notebookId, filePath, {
                            name: fileObject.name,
                            content: fileObject.content,
                            type: fileObject.type,
                            size: fileObject.size,
                            lastModified: fileObject.lastModified
                        });

                    } else {
                        console.log(`💾 Split preview: Using cached ${filePath}`);
                        // Convert SplitFileData to FileObject format (fill required fields)
                        fileObject = {
                            id: cachedFile.id,
                            notebookId: cachedFile.notebookId,
                            name: cachedFile.fileName,
                            path: cachedFile.filePath,
                            content: cachedFile.content,
                            type: cachedFile.type as FileType,
                            size: cachedFile.size,
                            lastModified: cachedFile.lastModified,
                            cachedAt: cachedFile.cachedAt,
                            accessCount: 1,
                            lastAccessed: Date.now()
                        };
                    }

                    // Set split preview state
                    const splitMode = getActivePreviewMode(fileObject.type as FileType);
                    set({
                        activeSplitFile: fileObject,
                        activeSplitMode: splitMode,
                        isSplitLoading: false,
                        error: null
                    });

                    console.log(`✅ Split preview loaded: ${filePath}`);
                    return fileObject;

                } catch (error) {
                    console.error(`❌ Split preview failed for ${filePath}:`, error);
                    set({
                        isSplitLoading: false,
                        error: `Failed to load file in split preview: ${error}`,
                        activeSplitFile: null,
                        activeSplitMode: null
                    });
                    return undefined;
                }
            },

            closeSplitPreview: () => {
                console.log('🔀 Closing split preview');
                set({
                    activeSplitFile: null,
                    activeSplitMode: null,
                    isSplitLoading: false,
                    error: null
                });
            },

            getActiveSplitFile: (): FileObject | null => {
                return get().activeSplitFile;
            },

        }),
        {
            name: 'preview-store',
            partialize: (state) => ({
                currentPreviewFiles: state.currentPreviewFiles
            })
        }
    )
);

// Initialize IndexedDB when the store is first used
usePreviewStore.getState().init();

export default usePreviewStore;