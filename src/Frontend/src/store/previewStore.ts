// store/previewStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notebookApiIntegration } from '../services/notebookServices';

// Optimized IndexedDB setup - force recreation
const DB_NAME = 'easyremote-file-cache-v3';
const DB_VERSION = 1;
const FILE_STORE = 'files';

/**
 * 文件类型
 */
export type FileType = 'image' | 'csv' | 'xlsx' | 'text' | 'pdf' | 'html' | 'jsx' | 'react' | 'doc' | 'docx';

/**
 * 预览模式类型
 */
export type PreviewMode = 'notebook' | 'file';

// Active preview renderer mode for the current file
export type ActivePreviewMode = 'default' | 'csv' | 'jsx' | 'html' | 'image' | 'pdf' | 'text' | 'doc' | 'docx' | null;

/**
 * 文件元数据接口
 */
export interface FileMetadata {
    file: File;
    lastModified?: string | number;
}

/**
 * 优化后的文件对象接口
 */
export interface FileObject {
    id: string;  // `${notebookId}::${filePath}`
    notebookId: string;
    path: string;
    name: string;
    content: string;
    type: FileType;
    lastModified: string;
    size: number;
    // 缓存管理字段
    cachedAt: number;
    accessCount: number;
    lastAccessed: number;
}

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
}

/**
 * 完整的 Preview Store 类型
 */
export type PreviewStore = PreviewStoreState & PreviewStoreActions;

// Optimized IndexedDB with connection pool
class IndexedDBPool {
    private static instance: IDBDatabase | null = null;
    private static initPromise: Promise<IDBDatabase> | null = null;
    
    static async getDB(): Promise<IDBDatabase> {
        if (this.instance && this.instance.version === DB_VERSION) {
            return this.instance;
        }
        
        if (!this.initPromise) {
            this.initPromise = this.initializeDB();
        }
        
        return this.initPromise;
    }
    
    private static async initializeDB(): Promise<IDBDatabase> {
        // First, clear old databases if they exist
        try {
            const oldDBNames = ['easyremote-file-cache', 'easyremote-file-cache-v2'];
            for (const oldName of oldDBNames) {
                try {
                    await new Promise<void>((resolve) => {
                        const deleteReq = indexedDB.deleteDatabase(oldName);
                        deleteReq.onsuccess = () => resolve();
                        deleteReq.onerror = () => resolve(); // Continue even if delete fails
                        deleteReq.onblocked = () => resolve();
                        setTimeout(() => resolve(), 1000); // Timeout after 1s
                    });
                } catch (e) {
                    // Ignore errors when deleting old databases
                }
            }
        } catch (e) {
            console.warn('Could not clean old databases:', e);
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            // 超时处理
            const timeout = setTimeout(() => {
                reject(new Error('IndexedDB initialization timeout'));
            }, 10000); // Increased timeout for first-time setup
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                if (!db.objectStoreNames.contains(FILE_STORE)) {
                    const store = db.createObjectStore(FILE_STORE, { keyPath: 'id' });
                    
                    // 优化的索引设计
                    store.createIndex('notebookPath', ['notebookId', 'path'], { unique: true });
                    store.createIndex('notebook', 'notebookId', { unique: false });
                    store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                    store.createIndex('cachedAt', 'cachedAt', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
            
            request.onsuccess = () => {
                clearTimeout(timeout);
                this.instance = request.result;
                
                // 监听数据库关闭事件
                this.instance.onclose = () => {
                    this.instance = null;
                    this.initPromise = null;
                };
                
                resolve(this.instance);
            };
            
            request.onerror = () => {
                clearTimeout(timeout);
                this.initPromise = null;
                reject(request.error);
            };
        });
    }
    
    static close() {
        if (this.instance) {
            this.instance.close();
            this.instance = null;
            this.initPromise = null;
        }
    }
}

// 缓存管理常量
const MAX_CACHE_SIZE = 100;
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24小时

// 更新文件访问统计
const updateFileAccessStats = async (file: FileObject): Promise<void> => {
    try {
        const db = await IndexedDBPool.getDB();
        
        const updatedFile: FileObject = {
            ...file,
            accessCount: file.accessCount + 1,
            lastAccessed: Date.now()
        };
        
        const transaction = db.transaction([FILE_STORE], 'readwrite');
        const store = transaction.objectStore(FILE_STORE);
        store.put(updatedFile);
        
        // 异步操作，不等待完成
    } catch (error) {
        console.error('updateFileAccessStats error:', error);
    }
};

// LRU缓存清理机制
const cleanupCacheIfNeeded = async (): Promise<void> => {
    try {
        const db = await IndexedDBPool.getDB();
        
        return new Promise<void>((resolve) => {
            const transaction = db.transaction([FILE_STORE], 'readwrite');
            const store = transaction.objectStore(FILE_STORE);
            
            // 1. 清理过期文件
            const ageIndex = store.index('cachedAt');
            const cutoffTime = Date.now() - MAX_CACHE_AGE;
            const ageRange = IDBKeyRange.upperBound(cutoffTime);
            const ageRequest = ageIndex.openCursor(ageRange);
            
            ageRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
            
            // 2. 如果文件数量超过限制，删除最少访问的文件
            const countRequest = store.count();
            countRequest.onsuccess = () => {
                if (countRequest.result > MAX_CACHE_SIZE) {
                    const accessIndex = store.index('lastAccessed');
                    const accessRequest = accessIndex.openCursor();
                    let deleteCount = countRequest.result - MAX_CACHE_SIZE;
                    
                    accessRequest.onsuccess = (event) => {
                        const cursor = (event.target as IDBRequest).result;
                        if (cursor && deleteCount > 0) {
                            cursor.delete();
                            deleteCount--;
                            cursor.continue();
                        }
                    };
                }
            };
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve(); // 清理失败不影响主流程
        });
    } catch (error) {
        console.error('cleanupCacheIfNeeded error:', error);
    }
};

// 优化的文件保存
const saveFileToCache = async (fileData: Omit<FileObject, 'cachedAt' | 'accessCount' | 'lastAccessed'>): Promise<boolean> => {
    try {
        const db = await IndexedDBPool.getDB();
        
        const file: FileObject = {
            ...fileData,
            id: `${fileData.notebookId}::${fileData.path}`,
            cachedAt: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readwrite');
            const store = transaction.objectStore(FILE_STORE);
            const request = store.put(file);
            
            transaction.oncomplete = () => {
                // 异步执行缓存清理，不阻塞主流程
                cleanupCacheIfNeeded().catch(console.error);
                resolve(true);
            };
            
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(new Error('Transaction aborted'));
            
            // 事务超时
            setTimeout(() => {
                try {
                    transaction.abort();
                    reject(new Error('Save operation timeout'));
                } catch (e) {
                    // Transaction may already be complete
                }
            }, 5000);
        });
    } catch (error) {
        console.error('Error saving file to cache:', error);
        return false;
    }
};

// 优化的文件获取 - 使用复合索引直接查询
const getFileFromCache = async (notebookId: string, filePath: string): Promise<FileObject | null> => {
    const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 3000) // 3秒超时
    );
    
    const queryPromise = (async (): Promise<FileObject | null> => {
        try {
            const db = await IndexedDBPool.getDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([FILE_STORE], 'readonly');
                const store = transaction.objectStore(FILE_STORE);
                const index = store.index('notebookPath');
                
                // 使用复合索引直接查询，避免内存过滤
                const request = index.get([notebookId, filePath]);
                
                request.onsuccess = () => {
                    const file = request.result as FileObject | undefined;
                    if (file) {
                        // 更新访问统计
                        updateFileAccessStats(file).catch(console.error);
                    }
                    resolve(file || null);
                };
                
                request.onerror = () => reject(request.error);
                
                // 事务超时处理
                transaction.onerror = () => reject(new Error('Transaction failed'));
                transaction.onabort = () => reject(new Error('Transaction aborted'));
            });
        } catch (error) {
            console.error('getFileFromCache error:', error);
            return null;
        }
    })();
    
    // 使用 Promise.race 实现超时
    return Promise.race([queryPromise, timeoutPromise]);
};

// 优化的文件删除
const deleteFileFromCache = async (notebookId: string, filePath: string): Promise<boolean> => {
    try {
        const fileId = `${notebookId}::${filePath}`;
        const db = await IndexedDBPool.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readwrite');
            const store = transaction.objectStore(FILE_STORE);
            const request = store.delete(fileId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
            
            // 超时处理
            setTimeout(() => {
                reject(new Error('Delete operation timeout'));
            }, 3000);
        });
    } catch (error) {
        console.error('Error deleting file from cache:', error);
        return false;
    }
};

// 优化的notebook文件获取
const getFilesForNotebook = async (notebookId: string): Promise<FileObject[]> => {
    try {
        const db = await IndexedDBPool.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readonly');
            const store = transaction.objectStore(FILE_STORE);
            const index = store.index('notebook');
            const request = index.getAll(notebookId);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
            
            // 超时处理
            setTimeout(() => {
                reject(new Error('Query timeout'));
            }, 5000);
        });
    } catch (error) {
        console.error('getFilesForNotebook error:', error);
        return [];
    }
};

// 优化的notebook缓存清理
const clearCacheForNotebook = async (notebookId: string): Promise<boolean> => {
    try {
        const db = await IndexedDBPool.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readwrite');
            const store = transaction.objectStore(FILE_STORE);
            const index = store.index('notebook');
            const request = index.openCursor(notebookId);
            
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };
            
            request.onerror = () => reject(request.error);
            
            // 超时处理
            setTimeout(() => {
                reject(new Error('Clear operation timeout'));
            }, 10000);
        });
    } catch (error) {
        console.error('Error clearing cache for notebook:', error);
        return false;
    }
};

// Determine file type from extension
const getFileType = (filePath: string): FileType => {
    const fileExt = filePath.split('.').pop()?.toLowerCase();

    // Image files
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(`.${fileExt}`)) {
        return 'image';
    }

    // CSV files
    if (fileExt === 'csv') {
        return 'csv';
    }

    // Excel files
    if (fileExt === 'xlsx' || fileExt === 'xls') {
        return 'xlsx';
    }

    // PDF files
    if (fileExt === 'pdf') {
        return 'pdf';
    }

    // DOC/DOCX files
    if (fileExt === 'doc' || fileExt === 'docx') {
        return 'docx';
    }

    // HTML files
    if (fileExt === 'html' || fileExt === 'htm') {
        return 'html';
    }

    // React/JSX files
    if (fileExt === 'jsx' || fileExt === 'tsx') {
        return 'jsx';
    }

    // Other text files
    if (['.txt', '.md', '.json', '.js', '.py', '.css'].includes(`.${fileExt}`)) {
        return 'text';
    }

    // Default
    return 'text';
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

            changePreviewMode: () => {
                if (get().previewMode === 'notebook') {
                    set({ previewMode: 'file' });
                } else {
                    set({ previewMode: 'notebook' });
                }
            },

            // Initialize the store
            init: () => {
                IndexedDBPool.getDB().catch(error => {
                    console.error('Failed to initialize IndexedDB:', error);
                    set({ error: 'Failed to initialize file cache database' });
                });
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
                const fileId = `${notebookId}::${filePath}`;

                // Check if file exists in cache with optimized query
                const cachedFile = await getFileFromCache(notebookId, filePath);
                const lastModifiedBackend = fileMetadata.lastModified || null;
                let file = fileMetadata.file;
                if (!file) {
                    // Create a safe placeholder File when not provided (derive name from path)
                    try {
                        const baseName = filePath.split('/').pop() || filePath;
                        const ext = baseName.split('.').pop()?.toLowerCase() || '';
                        const mime = ext === 'svg' ? 'image/svg+xml'
                            : ['png','jpg','jpeg','gif','webp'].includes(ext) ? (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
                            : ext === 'pdf' ? 'application/pdf'
                            : ['html','htm'].includes(ext) ? 'text/html'
                            : ['txt','md','json','js','py','css','csv'].includes(ext) ? 'text/plain'
                            : 'application/octet-stream';
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
                        await saveFileToCache(fileObjectData);
                        
                        // Create full file object for state
                        const fileObject: FileObject = {
                            ...fileObjectData,
                            cachedAt: Date.now(),
                            accessCount: 1,
                            lastAccessed: Date.now()
                        };

                        // Set as active file and renderer mode
                        const activeMode: ActivePreviewMode = (
                            fileType === 'csv' ? 'csv' :
                            fileType === 'jsx' ? 'jsx' :
                            fileType === 'html' ? 'html' :
                            fileType === 'image' ? 'image' :
                            fileType === 'pdf' ? 'pdf' :
                            fileType === 'docx' ? 'docx' :
                            'text'
                        );
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
                        
                        // Fallback: if .assets path not found, try basename at notebook root
                        const baseName = filePath.split('/').pop() || filePath;
                        const isNotFound = /not\s*found/i.test(msg) || /404/.test(msg);
                        
                        if (isNotFound && baseName !== filePath) {
                            console.log('previewFile: trying fallback to basename -', baseName);
                            return await get().previewFile(notebookId, baseName, fileMetadata);
                        }
                        
                        // Try URL encoding the file path
                        if (isNotFound && filePath.includes(' ')) {
                            console.log('previewFile: trying URL encoded path');
                            const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
                            if (encodedPath !== filePath) {
                                return await get().previewFile(notebookId, encodedPath, fileMetadata);
                            }
                        }
                        
                        set({ isLoading: false, error: `Failed to load file: ${msg}` });
                        throw e;
                    }
                } else {
                    // File found in cache
                    const cachedMode: ActivePreviewMode = (
                        cachedFile.type === 'csv' ? 'csv' :
                        cachedFile.type === 'jsx' ? 'jsx' :
                        cachedFile.type === 'html' ? 'html' :
                        cachedFile.type === 'image' ? 'image' :
                        cachedFile.type === 'pdf' ? 'pdf' :
                        cachedFile.type === 'docx' ? 'docx' :
                        'text'
                    );
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
                            type: cachedFile.type
                        };
                    } else {
                        // Add new file to the list
                        updatedFiles = [...currentPreviewFiles, {
                            id: fileId,
                            path: filePath,
                            name: file.name,
                            type: cachedFile.type
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
                    const separatorIndex = fileId.indexOf('::');
                    if (separatorIndex === -1) {
                        console.error('Invalid fileId format:', fileId);
                        return null;
                    }
                    const notebookId = fileId.substring(0, separatorIndex);
                    const filePath = fileId.substring(separatorIndex + 2);

                    const cachedFile = await getFileFromCache(notebookId, filePath);
                    if (cachedFile) {
                        // Set active preview mode based on file type
                        let previewMode: ActivePreviewMode = 'default';
                        if (cachedFile.type === 'csv') {
                            previewMode = 'csv';
                        } else if (cachedFile.type === 'jsx' || cachedFile.type === 'react') {
                            previewMode = 'jsx';
                        } else if (cachedFile.type === 'html') {
                            previewMode = 'html';
                        } else if (cachedFile.type === 'image') {
                            previewMode = 'image';
                        } else if (cachedFile.type === 'pdf') {
                            previewMode = 'pdf';
                        } else if (cachedFile.type === 'docx') {
                            previewMode = 'docx';
                        } else if (cachedFile.type === 'text') {
                            previewMode = 'text';
                        }

                        set({
                            activeFile: cachedFile,
                            activePreviewMode: previewMode
                        });
                        return cachedFile;
                    }

                    // Fallback: not in cache, fetch it and set active
                    try {
                        const fetched = await get().previewFile(notebookId, filePath);
                        return fetched || null;
                    } catch (e) {
                        console.warn('loadFileById fallback failed', e);
                        return null;
                    }
                } catch (error) {
                    console.error('Error loading file by ID:', error);
                    return null;
                }
            },

            // Delete a file from cache
            deleteFileFromCache: async (notebookId: string, filePath: string): Promise<boolean> => {
                try {
                    await deleteFileFromCache(notebookId, filePath);

                    // Update state if needed
                    const fileId = `${notebookId}-${filePath}`;
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
                    await clearCacheForNotebook(notebookId);

                    // Update state
                    const { currentPreviewFiles } = get();
                    const updatedFiles = currentPreviewFiles.filter(
                        f => !f.id.startsWith(`${notebookId}::`)
                    );

                    // Handle active file and preview mode setting
                    if (updatedFiles.length > 0) {
                        const activeFile = await get().loadFileById(updatedFiles[0].id);
                        let activePreviewMode: ActivePreviewMode = 'default';
                        if (activeFile?.type === 'csv') {
                            activePreviewMode = 'csv';
                        } else if (activeFile?.type === 'jsx' || activeFile?.type === 'react') {
                            activePreviewMode = 'jsx';
                        } else if (activeFile?.type === 'html') {
                            activePreviewMode = 'html';
                        } else if (activeFile?.type === 'image') {
                            activePreviewMode = 'image';
                        } else if (activeFile?.type === 'pdf') {
                            activePreviewMode = 'pdf';
                        } else if (activeFile?.type === 'docx') {
                            activePreviewMode = 'docx';
                        } else if (activeFile?.type === 'text') {
                            activePreviewMode = 'text';
                        }

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
                await saveFileToCache(updated);
                set({ activeFile: updated });
                return updated;
            },

            setTabDirty: (fileId: string, value: boolean) => {
                set((s) => ({ dirtyMap: { ...s.dirtyMap, [fileId]: value } }));
            },

            isTabDirty: (fileId: string): boolean => {
                return !!get().dirtyMap[fileId];
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