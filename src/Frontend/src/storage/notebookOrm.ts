// storage/notebookOrm.ts
// Notebook ORM for managing notebook entities and relationships

import { IndexedDBManager, DB_CONFIG } from './database';
import { 
  NotebookEntity, 
  FileMetadataEntity, 
  NotebookActivityEntity,
  StorageConfigEntity,
  DEFAULT_STORAGE_CONFIG
} from './schema';

/**
 * Notebook ORM for CRUD operations and relationship management
 */
export class NotebookORM {
  /**
   * Create or update a notebook entity
   */
  static async saveNotebook(notebookData: Omit<NotebookEntity, 'createdAt' | 'updatedAt'>): Promise<NotebookEntity> {
    const db = await IndexedDBManager.getDB();
    
    const now = Date.now();
    const notebook: NotebookEntity = {
      ...notebookData,
      createdAt: notebookData.createdAt ?? now,
      updatedAt: now
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.NOTEBOOKS], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.STORES.NOTEBOOKS);
      
      const request = store.put(notebook);
      
      request.onsuccess = () => {
        // Log activity
        this.logActivity(notebook.id, 'open').catch(console.error);
        resolve(notebook);
      };
      
      request.onerror = () => reject(request.error);
      
      setTimeout(() => reject(new Error('Save notebook timeout')), 5000);
    });
  }
  
  /**
   * Get notebook by ID
   */
  static async getNotebook(notebookId: string): Promise<NotebookEntity | null> {
    const db = await IndexedDBManager.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.NOTEBOOKS], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.STORES.NOTEBOOKS);
      
      const request = store.get(notebookId);
      
      request.onsuccess = () => {
        const notebook = request.result as NotebookEntity | undefined;
        if (notebook) {
          // Update last accessed time
          this.updateNotebookAccess(notebookId).catch(console.error);
        }
        resolve(notebook || null);
      };
      
      request.onerror = () => reject(request.error);
      
      setTimeout(() => reject(new Error('Get notebook timeout')), 3000);
    });
  }
  
  /**
   * Get all notebooks with optional filtering and sorting
   */
  static async getNotebooks(options: {
    orderBy?: 'lastAccessedAt' | 'updatedAt' | 'accessCount';
    limit?: number;
    offset?: number;
  } = {}): Promise<NotebookEntity[]> {
    const db = await IndexedDBManager.getDB();
    const { orderBy = 'lastAccessedAt', limit, offset = 0 } = options;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.NOTEBOOKS], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.STORES.NOTEBOOKS);
      
      let request: IDBRequest;
      
      if (orderBy === 'lastAccessedAt' || orderBy === 'updatedAt' || orderBy === 'accessCount') {
        const index = store.index(orderBy);
        request = index.openCursor(null, 'prev'); // Descending order
      } else {
        request = store.openCursor();
      }
      
      const notebooks: NotebookEntity[] = [];
      let currentOffset = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (currentOffset >= offset) {
            notebooks.push(cursor.value as NotebookEntity);
            if (limit && notebooks.length >= limit) {
              resolve(notebooks);
              return;
            }
          }
          currentOffset++;
          cursor.continue();
        } else {
          resolve(notebooks);
        }
      };
      
      request.onerror = () => reject(request.error);
      
      setTimeout(() => reject(new Error('Get notebooks timeout')), 5000);
    });
  }
  
  /**
   * Update notebook access statistics
   */
  static async updateNotebookAccess(notebookId: string): Promise<void> {
    const db = await IndexedDBManager.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.NOTEBOOKS], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.STORES.NOTEBOOKS);
      
      const getRequest = store.get(notebookId);
      
      getRequest.onsuccess = () => {
        const notebook = getRequest.result as NotebookEntity | undefined;
        if (notebook) {
          const updatedNotebook: NotebookEntity = {
            ...notebook,
            lastAccessedAt: Date.now(),
            accessCount: notebook.accessCount + 1
          };
          
          const putRequest = store.put(updatedNotebook);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Notebook doesn't exist, ignore
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
      
      setTimeout(() => reject(new Error('Update access timeout')), 3000);
    });
  }
  
  /**
   * Delete notebook and all associated data
   */
  static async deleteNotebook(notebookId: string): Promise<boolean> {
    const db = await IndexedDBManager.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        DB_CONFIG.STORES.NOTEBOOKS,
        DB_CONFIG.STORES.FILES_METADATA,
        DB_CONFIG.STORES.FILES_CONTENT,
        DB_CONFIG.STORES.ACTIVITIES
      ], 'readwrite');
      
      let operationsCompleted = 0;
      const totalOperations = 4;
      
      const checkCompletion = () => {
        operationsCompleted++;
        if (operationsCompleted === totalOperations) {
          resolve(true);
        }
      };
      
      // Delete notebook
      const notebooksStore = transaction.objectStore(DB_CONFIG.STORES.NOTEBOOKS);
      const deleteNotebookReq = notebooksStore.delete(notebookId);
      deleteNotebookReq.onsuccess = checkCompletion;
      deleteNotebookReq.onerror = () => reject(deleteNotebookReq.error);
      
      // Delete file metadata
      const filesMetaStore = transaction.objectStore(DB_CONFIG.STORES.FILES_METADATA);
      const metaIndex = filesMetaStore.index('notebookId');
      const deleteMetaReq = metaIndex.openCursor(notebookId);
      deleteMetaReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          checkCompletion();
        }
      };
      deleteMetaReq.onerror = () => reject(deleteMetaReq.error);
      
      // Delete file content (need to get file IDs first)
      const getFileIdsReq = metaIndex.openCursor(notebookId);
      const fileIds: string[] = [];
      getFileIdsReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          fileIds.push((cursor.value as FileMetadataEntity).id);
          cursor.continue();
        } else {
          // Delete content for all file IDs
          const contentStore = transaction.objectStore(DB_CONFIG.STORES.FILES_CONTENT);
          let deletedCount = 0;
          if (fileIds.length === 0) {
            checkCompletion();
            return;
          }
          
          fileIds.forEach(fileId => {
            const deleteContentReq = contentStore.delete(fileId);
            deleteContentReq.onsuccess = () => {
              deletedCount++;
              if (deletedCount === fileIds.length) {
                checkCompletion();
              }
            };
            deleteContentReq.onerror = () => reject(deleteContentReq.error);
          });
        }
      };
      getFileIdsReq.onerror = () => reject(getFileIdsReq.error);
      
      // Delete activities
      const activitiesStore = transaction.objectStore(DB_CONFIG.STORES.ACTIVITIES);
      const activitiesIndex = activitiesStore.index('notebookId');
      const deleteActivitiesReq = activitiesIndex.openCursor(notebookId);
      deleteActivitiesReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          checkCompletion();
        }
      };
      deleteActivitiesReq.onerror = () => reject(deleteActivitiesReq.error);
      
      transaction.onerror = () => reject(transaction.error);
      
      setTimeout(() => reject(new Error('Delete notebook timeout')), 10000);
    });
  }
  
  /**
   * Get notebook statistics including file count and total size
   */
  static async getNotebookStats(notebookId: string): Promise<{
    fileCount: number;
    totalSize: number;
    lastActivity: number;
    activities: NotebookActivityEntity[];
  }> {
    const db = await IndexedDBManager.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        DB_CONFIG.STORES.FILES_METADATA,
        DB_CONFIG.STORES.ACTIVITIES
      ], 'readonly');
      
      let fileCount = 0;
      let totalSize = 0;
      let lastActivity = 0;
      const activities: NotebookActivityEntity[] = [];
      
      // Get file statistics
      const filesMetaStore = transaction.objectStore(DB_CONFIG.STORES.FILES_METADATA);
      const metaIndex = filesMetaStore.index('notebookId');
      const filesReq = metaIndex.openCursor(notebookId);
      
      filesReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const fileMetadata = cursor.value as FileMetadataEntity;
          fileCount++;
          totalSize += fileMetadata.size;
          cursor.continue();
        } else {
          // Get activities
          const activitiesStore = transaction.objectStore(DB_CONFIG.STORES.ACTIVITIES);
          const activitiesIndex = activitiesStore.index('notebookId');
          const activitiesReq = activitiesIndex.openCursor(notebookId);
          
          activitiesReq.onsuccess = (actEvent) => {
            const actCursor = (actEvent.target as IDBRequest).result;
            if (actCursor) {
              const activity = actCursor.value as NotebookActivityEntity;
              activities.push(activity);
              lastActivity = Math.max(lastActivity, activity.timestamp);
              actCursor.continue();
            } else {
              resolve({
                fileCount,
                totalSize,
                lastActivity,
                activities: activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50) // Last 50 activities
              });
            }
          };
          
          activitiesReq.onerror = () => reject(activitiesReq.error);
        }
      };
      
      filesReq.onerror = () => reject(filesReq.error);
      
      setTimeout(() => reject(new Error('Get notebook stats timeout')), 5000);
    });
  }
  
  /**
   * Log notebook activity
   */
  static async logActivity(
    notebookId: string, 
    activityType: 'open' | 'close' | 'file_access' | 'file_create' | 'file_delete',
    filePath?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const db = await IndexedDBManager.getDB();
    const timestamp = Date.now();
    
    const activity: NotebookActivityEntity = {
      id: `${notebookId}::${timestamp}`,
      notebookId,
      activityType,
      filePath,
      timestamp,
      metadata
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.ACTIVITIES], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.STORES.ACTIVITIES);
      
      const request = store.put(activity);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      
      setTimeout(() => resolve(), 1000); // Don't block on activity logging
    });
  }
  
  /**
   * Get inactive notebooks for cleanup
   */
  static async getInactiveNotebooks(retentionPeriod: number): Promise<NotebookEntity[]> {
    const db = await IndexedDBManager.getDB();
    const cutoffTime = Date.now() - retentionPeriod;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.NOTEBOOKS], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.STORES.NOTEBOOKS);
      const index = store.index('lastAccessedAt');
      
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      
      const inactiveNotebooks: NotebookEntity[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          inactiveNotebooks.push(cursor.value as NotebookEntity);
          cursor.continue();
        } else {
          resolve(inactiveNotebooks);
        }
      };
      
      request.onerror = () => reject(request.error);
      
      setTimeout(() => reject(new Error('Get inactive notebooks timeout')), 5000);
    });
  }
}