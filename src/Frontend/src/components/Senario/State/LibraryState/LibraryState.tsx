// LibraryState/LibraryState.tsx
// Main LibraryState component - redesigned with proper storage integration

import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'antd';
import useNotebookStore from '@Store/notebookStore';
import { NotebookORM } from '@Storage/index';
import LibraryHeader from './LibraryHeader';
import NotebookList from './NotebookList';
import SwipeIndicator from './SwipeIndicator';
import StorageDebugger from './StorageDebugger';
import StorageCleanupTool from './StorageCleanupTool';
import { useSwipeGesture } from './utils';
import { useNotebooks, useNotebookFiltering, useLibraryState } from './hooks';
import type { LibraryStateProps } from './types';

const LibraryState: React.FC<LibraryStateProps> = ({ onBack, onSelectNotebook }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDebugger, setShowDebugger] = useState(false);
  const [showCleanupTool, setShowCleanupTool] = useState(false);

  // State management
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    selectedNotebook,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
  } = useLibraryState();

  // Notebook data management
  const {
    notebooks,
    loading,
    refreshing,
    refreshNotebooks,
    deleteNotebook,
    toggleStar,
  } = useNotebooks();

  // Filtering and sorting
  const filteredNotebooks = useNotebookFiltering(notebooks, searchQuery, sortBy);

  // Swipe gesture for back navigation
  const { swipeDistance, handlers } = useSwipeGesture(() => onBack?.());

  // Event handlers
  const handleSelectNotebook = useCallback(
    async (notebookId: string) => {
      const notebook = notebooks.find((n) => n.id === notebookId);
      if (notebook) {
        try {
          console.log(`🔄 Loading notebook ${notebookId} from database...`);
          
          // Load notebook content from database
          const store = useNotebookStore.getState();
          const loaded = await store.loadFromDatabase(notebookId);
          
          if (loaded) {
            console.log(`✅ Successfully loaded notebook ${notebookId} from database`);
            
            // 🏷️ Load tabs for the notebook with proper isolation
            const { default: usePreviewStore } = await import('@Store/previewStore');
            const previewStore = usePreviewStore.getState();
            
            // Clear any existing tabs from other notebooks first
            console.log(`🧹 Clearing tabs before loading notebook ${notebookId}`);
            previewStore.set?.({ 
              currentPreviewFiles: [], 
              activeFile: null,
              activePreviewMode: null 
            });
            
            try {
              await previewStore.loadNotebookTabs(notebookId);
              console.log(`✅ Loaded tabs for notebook ${notebookId} (isolated mode)`);
            } catch (tabError) {
              console.warn(`Failed to load tabs for notebook ${notebookId}:`, tabError);
              // Don't fail the entire operation if tab loading fails
            }
          } else {
            console.log(`⚠️ Notebook ${notebookId} not found in database, creating new one`);
            // Fallback: Create new notebook with basic info
            store.setNotebookId(notebook.id);
            store.setNotebookTitle(notebook.name || `Notebook ${notebook.id.slice(0, 8)}`);
            store.clearCells(); // This will create a default title cell
          }
          
          // Update access statistics
          try {
            await NotebookORM.updateNotebookAccess(notebookId);
          } catch (error) {
            console.warn('Failed to update notebook access statistics:', error);
          }
          
          onSelectNotebook?.(notebookId);
        } catch (error) {
          console.error(`Failed to load notebook ${notebookId}:`, error);
          
          // Fallback: Create new notebook
          const store = useNotebookStore.getState();
          store.setNotebookId(notebook.id);
          store.setNotebookTitle(notebook.name || `Notebook ${notebook.id.slice(0, 8)}`);
          store.clearCells();
          
          onSelectNotebook?.(notebookId);
        }
      }
    },
    [notebooks, onSelectNotebook]
  );

  const handleToggleStar = useCallback((notebookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar(notebookId);
  }, [toggleStar]);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedNotebook) {
      const success = await deleteNotebook(selectedNotebook);
      if (success) {
        closeDeleteModal();
      }
    }
  }, [selectedNotebook, deleteNotebook, closeDeleteModal]);

  // Computed values
  const totalSize = useMemo(
    () => notebooks.reduce((sum, n) => sum + (n.totalSize || 0), 0),
    [notebooks]
  );

  const selectedNotebookData = useMemo(
    () => notebooks.find((n) => n.id === selectedNotebook),
    [notebooks, selectedNotebook]
  );

  // Add keyboard shortcuts for debugger and cleanup tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugger(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setShowCleanupTool(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full bg-gray-50 overflow-hidden relative"
      {...handlers}
      style={{
        transform: `translateX(${swipeDistance * 0.3}px)`,
        transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Swipe Indicator */}
      <SwipeIndicator swipeDistance={swipeDistance} visible={swipeDistance > 0} />

      {/* Header */}
      <LibraryHeader
        totalNotebooks={notebooks.length}
        totalSize={totalSize}
        searchQuery={searchQuery}
        viewMode={viewMode}
        refreshing={refreshing}
        onBack={onBack}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onRefresh={refreshNotebooks}
      />

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <NotebookList
          notebooks={filteredNotebooks}
          viewMode={viewMode}
          loading={loading}
          searchQuery={searchQuery}
          onSelectNotebook={handleSelectNotebook}
          onToggleStar={handleToggleStar}
          onDeleteNotebook={openDeleteModal}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        title="删除 Notebook"
        open={showDeleteModal}
        onOk={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除 Notebook <strong>"{selectedNotebookData?.name || selectedNotebook}"</strong> 吗？
          此操作会清空其本地缓存，且无法撤销。
        </p>
        {selectedNotebookData && (
          <div className="mt-3 text-sm text-gray-600">
            <p>包含 {selectedNotebookData.fileCount} 个文件</p>
            <p>总大小: {Math.round((selectedNotebookData.totalSize || 0) / 1024)} KB</p>
          </div>
        )}
      </Modal>

      {/* Storage Debugger - Toggle with Ctrl+Shift+D */}
      <StorageDebugger visible={showDebugger} />

      {/* Storage Cleanup Tool - Toggle with Ctrl+Shift+C */}
      <StorageCleanupTool visible={showCleanupTool} />
    </div>
  );
};

export default LibraryState;