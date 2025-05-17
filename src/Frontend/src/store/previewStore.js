import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notebookApiIntegration } from '../services/notebookServices';

// IndexedDB setup
const DB_NAME = 'easyremote-file-cache';
const DB_VERSION = 1.1;
const FILE_STORE = 'files';

// Initialize the IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(FILE_STORE)) {
                const store = db.createObjectStore(FILE_STORE, { keyPath: 'id' });
                store.createIndex('path', 'path', { unique: false });
                store.createIndex('notebookId', 'notebookId', { unique: false });
                store.createIndex('lastModified', 'lastModified', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Save file to IndexedDB
const saveFileToCache = async (file) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readwrite');
            const store = transaction.objectStore(FILE_STORE);
            const request = store.put(file);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error saving file to cache:', error);
        return false;
    }
};

// Get file from IndexedDB
const getFileFromCache = async (notebookId, filePath) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([FILE_STORE], 'readonly');
        const store = transaction.objectStore(FILE_STORE);
        const index = store.index('path');
        const request = index.getAll(filePath);

        request.onsuccess = () => {
            const files = request.result || [];
            const file = files.find(f => f.notebookId === notebookId);
            resolve(file || null);
        };
        request.onerror = () => reject(request.error);
    });
};

// Delete file from IndexedDB
const deleteFileFromCache = async (notebookId, filePath) => {
    try {
        const file = await getFileFromCache(notebookId, filePath);
        if (!file) return true;

        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readwrite');
            const store = transaction.objectStore(FILE_STORE);
            const request = store.delete(file.id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error deleting file from cache:', error);
        return false;
    }
};

// Get file list from IndexedDB by notebookId
const getFilesForNotebook = async (notebookId) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FILE_STORE], 'readonly');
            const store = transaction.objectStore(FILE_STORE);
            const index = store.index('notebookId');
            const request = index.getAll(notebookId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting files for notebook:', error);
        return [];
    }
};

// Clear all files for a notebook
const clearCacheForNotebook = async (notebookId) => {
    try {
        const files = await getFilesForNotebook(notebookId);
        const db = await initDB();
        const transaction = db.transaction([FILE_STORE], 'readwrite');
        const store = transaction.objectStore(FILE_STORE);

        for (const file of files) {
            store.delete(file.id);
        }

        return true;
    } catch (error) {
        console.error('Error clearing cache for notebook:', error);
        return false;
    }
};

// Determine file type from extension
const getFileType = (filePath) => {
    const fileExt = filePath.split('.').pop().toLowerCase();

    // Image files
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(`.${fileExt}`)) {
        return 'image';
    }

    // CSV files
    if (fileExt === 'csv') {
        return 'csv';
    }

    // Other text files
    if (['.txt', '.md', '.json', '.js', '.py', '.html', '.css'].includes(`.${fileExt}`)) {
        return 'text';
    }

    // Default
    return 'text';
};

// Create the store
const usePreviewStore = create(
    persist(
        (set, get) => ({
            previewMode: 'notebook',
            currentPreviewFiles: [], // List of files being previewed
            activeFile: null, // Currently active preview file
            isLoading: false,
            error: null,

            changePreviewMode: () => {
                console.log("[debug]change preview mode: ", get().previewMode)
                if (get().previewMode === 'notebook') {
                    set({ previewMode: 'file' });
                } else {
                    set({ previewMode: 'notebook' });
                }
            },

            // Initialize the store
            init: () => {
                initDB().catch(error => {
                    console.error('Failed to initialize IndexedDB:', error);
                    set({ error: 'Failed to initialize file cache database' });
                });
            },

            // Clear error
            clearError: () => set({ error: null }),

            // Set currently previewed files
            setCurrentPreviewFiles: (files) => set({ currentPreviewFiles: files }),

            // Set active file
            setActiveFile: (file) => set({ activeFile: file }),

            // Set active preview mode
            setActivePreviewMode: (mode) => set({ activePreviewMode: mode }),

            getCurrentPreviewFiles: () => get().currentPreviewFiles,

            // Fetch and preview a file
            previewFile: async (notebookId, filePath, fileMetadata = {}) => {
                console.log('previewFile', notebookId, filePath, fileMetadata);

                // Generate a unique ID for the file
                const fileId = `${notebookId}-${filePath}`;


                // Check if file exists in cache
                const cachedFile = await getFileFromCache(notebookId, filePath);
                const lastModifiedBackend = fileMetadata.lastModified || null;
                const file = fileMetadata.file;
                if (!file) {
                    set({ error: 'File not found' });
                    return;
                }
                console.log('file', file);

                // Determine if we need to fetch from backend
                const needsFetch = !cachedFile ||
                    (lastModifiedBackend && cachedFile.lastModified !== lastModifiedBackend);

                if (needsFetch) {
                    // Get file info from backend
                    const response = await notebookApiIntegration.getFile(notebookId, filePath);

                    if (!response || response.error) {
                        throw new Error(response?.error || 'Failed to fetch file');
                    }

                    // Determine the file content and type
                    let content = response.content;
                    const fileType = getFileType(filePath);

                    // Handle specific file types
                    if (fileType === 'image') {
                        // For images, content should be the data URL
                        if (typeof content === 'string' && content.startsWith('data:')) {
                            // Already in correct format
                        } else {
                            // Convert to data URL if needed
                            const fileExt = filePath.split('.').pop().toLowerCase();
                            content = response.dataUrl || `data:image/${fileExt};base64,${content}`;
                        }
                    }

                    // Create file object
                    const fileObject = {
                        id: fileId,
                        notebookId,
                        path: filePath,
                        name: file.name,
                        content,
                        type: fileType,
                        lastModified: lastModifiedBackend || new Date().toISOString(),
                        size: response.size || 0
                    };

                    // Save to IndexedDB
                    await saveFileToCache(fileObject);

                    console.log('fileObject', fileObject);

                    // Set as active file
                    set({
                        activeFile: fileObject,
                        isLoading: false
                    });

                    // Update current preview files list
                    const { currentPreviewFiles } = get();
                    if (!currentPreviewFiles.some(f => f.id === fileId)) {
                        set({
                            currentPreviewFiles: [...currentPreviewFiles, {
                                id: fileId,
                                path: filePath,
                                name: file.name,
                                type: fileType
                            }]
                        });
                    }
                    console.log('fileObject', fileObject);

                    get().currentPreviewFiles.pop();
                    get().currentPreviewFiles.push(fileObject);
                    return fileObject;
                } else {
                    console.log('cachedFile', cachedFile);
                    set({
                        activeFile: cachedFile,
                        isLoading: false
                    });

                    // Update current preview files list
                    const { currentPreviewFiles } = get();
                    if (!currentPreviewFiles.some(f => f.id === fileId)) {
                        set({
                            currentPreviewFiles: [...currentPreviewFiles, {
                                id: fileId,
                                path: filePath,
                                name: file.name,
                                type: cachedFile.type
                            }]
                        });
                    }
                    get().currentPreviewFiles.pop();
                    get().currentPreviewFiles.push(cachedFile);
                    return cachedFile;
                }
            },

            getActiveFile: () => get().activeFile,

            // Close a preview file
            closePreviewFile: (fileId) => {
                const { currentPreviewFiles, activeFile } = get();

                // Remove from preview files list
                const updatedFiles = currentPreviewFiles.filter(f => f.id !== fileId);
                set({ currentPreviewFiles: updatedFiles });

                // If it was the active file, set a new active file or null
                if (activeFile && activeFile.id === fileId) {
                    const newActiveFile = updatedFiles.length > 0 ?
                        updatedFiles[updatedFiles.length - 1] : null;

                    if (newActiveFile) {
                        // Load the full file data for the new active file
                        get().loadFileById(newActiveFile.id);
                    } else {
                        set({ activeFile: null, activePreviewMode: null });
                    }
                }
            },

            // Load a file by its ID
            loadFileById: async (fileId) => {
                try {
                    const [notebookId, ...pathParts] = fileId.split('-');
                    const filePath = pathParts.join('-');

                    const cachedFile = await getFileFromCache(notebookId, filePath);
                    if (cachedFile) {
                        // Set active preview mode based on file type
                        let previewMode = 'default';
                        if (cachedFile.type === 'csv') {
                            previewMode = 'csv';
                        }

                        set({
                            activeFile: cachedFile,
                            activePreviewMode: previewMode
                        });
                        return cachedFile;
                    }

                    return null;
                } catch (error) {
                    console.error('Error loading file by ID:', error);
                    return null;
                }
            },

            // Delete a file from cache
            deleteFileFromCache: async (notebookId, filePath) => {
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
            clearCacheForNotebook: async (notebookId) => {
                try {
                    await clearCacheForNotebook(notebookId);

                    // Update state
                    const { currentPreviewFiles } = get();
                    const updatedFiles = currentPreviewFiles.filter(
                        f => !f.id.startsWith(`${notebookId}-`)
                    );

                    set({
                        currentPreviewFiles: updatedFiles,
                        activeFile: updatedFiles.length > 0 ?
                            await get().loadFileById(updatedFiles[0].id) : null,
                        activePreviewMode: updatedFiles.length > 0 ?
                            (await get().loadFileById(updatedFiles[0].id))?.type === 'csv' ? 'csv' : 'default' : null
                    });

                    return true;
                } catch (error) {
                    console.error('Error clearing notebook cache:', error);
                    set({ error: 'Failed to clear notebook cache' });
                    return false;
                }
            },

            // Get CSV data for CSVPreviewApp
            getCSVData: () => {
                const { activeFile } = get();
                if (!activeFile || activeFile.type !== 'csv') return null;

                try {
                    // For CSV files, return the content as string
                    if (typeof activeFile.content === 'string') {
                        return activeFile.content;
                    }
                    return null;
                } catch (error) {
                    console.error('Error getting CSV data:', error);
                    return null;
                }
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