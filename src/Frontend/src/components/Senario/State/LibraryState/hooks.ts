// LibraryState/hooks.ts
// Custom hooks for LibraryState functionality

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NotebookORM, FileORM, StorageManager, FileCache } from '@Storage/index';
import { useDebounce } from './utils';
import type { CachedNotebook, SortBy } from './types';
import { CONSTANTS } from './types';

/**
 * Hook for managing notebook data with proper storage integration
 */
export const useNotebooks = () => {
  const [notebooks, setNotebooks] = useState<CachedNotebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotebooks = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure storage system is initialized
      await StorageManager.initialize();
      
      // Try new storage system first
      let allNotebooks = [];
      try {
        allNotebooks = await NotebookORM.getNotebooks({
          orderBy: 'lastAccessedAt',
        });
        console.log(`Loaded ${allNotebooks.length} notebooks from new storage system`);
      } catch (error) {
        console.warn('New storage system failed, trying legacy system:', error);
        // Fallback to legacy system
        try {
          allNotebooks = await FileCache.getAllNotebooks();
          console.log(`Loaded ${allNotebooks.length} notebooks from legacy system`);
        } catch (legacyError) {
          console.error('Both storage systems failed:', legacyError);
          setNotebooks([]);
          return;
        }
      }

      if (allNotebooks.length === 0) {
        console.log('No notebooks found in storage');
        setNotebooks([]);
        return;
      }

      // Enrich notebooks with additional data
      const enrichedNotebooks = await Promise.all(
        allNotebooks.map(async (notebook) => {
          try {
            let lastOpenedFiles = [];
            
            // Try new storage system first for files
            try {
              const files = await FileORM.getFilesForNotebook(notebook.id, false);
              lastOpenedFiles = files
                .slice(0, CONSTANTS.MAX_VISIBLE_FILES)
                .map((f) => f.metadata.fileName);
            } catch (newFileError) {
              // Fallback to legacy system for files
              try {
                const files = await FileCache.getFilesForNotebook(notebook.id);
                lastOpenedFiles = files
                  .slice(0, CONSTANTS.MAX_VISIBLE_FILES)
                  .map((f: { name: string }) => f.name);
              } catch (legacyFileError) {
                console.warn(`Failed to load files for notebook ${notebook.id}:`, legacyFileError);
                lastOpenedFiles = [];
              }
            }

            return {
              ...notebook,
              lastOpenedFiles,
              isStarred: false, // TODO: Implement starring functionality
            } as CachedNotebook;
          } catch (err) {
            console.warn(`Failed to process notebook ${notebook.id}:`, err);
            return {
              ...notebook,
              lastOpenedFiles: [],
              isStarred: false,
            } as CachedNotebook;
          }
        })
      );

      setNotebooks(enrichedNotebooks);
      console.log(`Successfully loaded ${enrichedNotebooks.length} enriched notebooks`);
    } catch (error) {
      console.error('Failed to load notebooks:', error);
      setNotebooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNotebooks = useCallback(async () => {
    setRefreshing(true);
    await loadNotebooks();
    setRefreshing(false);
  }, [loadNotebooks]);

  const deleteNotebook = useCallback(async (notebookId: string) => {
    try {
      // Try new storage system first
      try {
        await NotebookORM.deleteNotebook(notebookId);
        setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
        return true;
      } catch (newSystemError) {
        console.warn('New storage system delete failed, trying legacy:', newSystemError);
        // Fallback to legacy system
        await FileCache.clearNotebookCache(notebookId);
        setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
        return true;
      }
    } catch (error) {
      console.error('Failed to delete notebook:', error);
      return false;
    }
  }, []);

  const toggleStar = useCallback((notebookId: string) => {
    setNotebooks((prev) =>
      prev.map((nb) => 
        nb.id === notebookId ? { ...nb, isStarred: !nb.isStarred } : nb
      )
    );
    // TODO: Persist starring to storage
  }, []);

  // Load notebooks on mount
  useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks]);

  return {
    notebooks,
    loading,
    refreshing,
    loadNotebooks,
    refreshNotebooks,
    deleteNotebook,
    toggleStar,
  };
};

/**
 * Hook for filtering and sorting notebooks
 */
export const useNotebookFiltering = (
  notebooks: CachedNotebook[],
  searchQuery: string,
  sortBy: SortBy
) => {
  const debouncedSearchQuery = useDebounce(searchQuery, CONSTANTS.DEBOUNCE_DELAY);

  return useMemo(() => {
    let filtered = notebooks;

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = notebooks.filter((nb) =>
        nb.name?.toLowerCase().includes(query) ||
        nb.description?.toLowerCase().includes(query) ||
        nb.lastOpenedFiles?.some(file => 
          file.toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'size':
          return (b.totalSize || 0) - (a.totalSize || 0);
        case 'files':
          return (b.fileCount || 0) - (a.fileCount || 0);
        case 'recent':
        default:
          return (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0);
      }
    });

    return sorted;
  }, [notebooks, debouncedSearchQuery, sortBy]);
};

/**
 * Hook for managing library state UI
 */
export const useLibraryState = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const openDeleteModal = useCallback((notebookId: string) => {
    setSelectedNotebook(notebookId);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setSelectedNotebook(null);
    setShowDeleteModal(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedNotebook,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
  };
};