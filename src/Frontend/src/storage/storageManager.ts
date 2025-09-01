// storage/storageManager.ts
// Main storage manager with cleanup and maintenance functionality

import { IndexedDBManager, DB_CONFIG } from './database';
import { NotebookORM } from './notebookOrm';
import { FileORM } from './fileOrm';
import { StorageConfigEntity, DEFAULT_STORAGE_CONFIG, NotebookEntity } from './schema';
import { DataMigration } from './migration';

/**
 * Storage cleanup statistics
 */
export interface CleanupStats {
  notebooksDeleted: number;
  filesDeleted: number;
  bytesFreed: number;
  duration: number;
}

/**
 * Storage usage statistics
 */
export interface StorageStats {
  totalNotebooks: number;
  totalFiles: number;
  totalSize: number;
  largeFilesCount: number;
  oldestNotebook: number;
  newestNotebook: number;
  mostAccessedNotebook: string;
}

/**
 * Main storage manager with intelligent cleanup and maintenance
 */
export class StorageManager {
  private static cleanupInProgress = false;
  private static lastCleanup = 0;
  
  /**
   * Initialize storage system
   */
  static async initialize(): Promise<void> {
    try {
      console.log('Initializing storage system...');
      await IndexedDBManager.initialize();
      console.log('IndexedDB initialized successfully');
      
      // Wait a bit to ensure database is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await this.ensureConfig();
      console.log('Storage configuration initialized');
      
      // Check and perform data migration if needed
      await this.checkAndMigrate();
      
      // Schedule periodic cleanup
      this.scheduleCleanup();
      console.log('Storage system initialization completed');
    } catch (error) {
      console.error('Storage system initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Get storage configuration
   */
  static async getConfig(): Promise<StorageConfigEntity> {
    try {
      const db = await IndexedDBManager.getDB();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([DB_CONFIG.STORES.CONFIG], 'readonly');
          const store = transaction.objectStore(DB_CONFIG.STORES.CONFIG);
          
          const request = store.get('config');
          
          request.onsuccess = () => {
            const config = request.result as StorageConfigEntity | undefined;
            resolve(config || DEFAULT_STORAGE_CONFIG);
          };
          
          request.onerror = () => {
            console.warn('Failed to get config from database, using default');
            resolve(DEFAULT_STORAGE_CONFIG);
          };
          
          transaction.onerror = () => {
            console.warn('Config transaction failed, using default');
            resolve(DEFAULT_STORAGE_CONFIG);
          };
          
          // Timeout fallback
          setTimeout(() => {
            console.warn('Config get timeout, using default');
            resolve(DEFAULT_STORAGE_CONFIG);
          }, 3000);
        } catch (error) {
          console.warn('Config transaction creation failed, using default:', error);
          resolve(DEFAULT_STORAGE_CONFIG);
        }
      });
    } catch (error) {
      console.warn('Failed to get database for config, using default:', error);
      return DEFAULT_STORAGE_CONFIG;
    }
  }
  
  /**
   * Update storage configuration
   */
  static async updateConfig(config: Partial<StorageConfigEntity>): Promise<void> {
    try {
      const db = await IndexedDBManager.getDB();
      const currentConfig = await this.getConfig();
      
      const updatedConfig: StorageConfigEntity = {
        ...currentConfig,
        ...config
      };
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([DB_CONFIG.STORES.CONFIG], 'readwrite');
          const store = transaction.objectStore(DB_CONFIG.STORES.CONFIG);
          
          const request = store.put(updatedConfig);
          
          request.onsuccess = () => {
            console.log('Storage configuration updated successfully');
            resolve();
          };
          
          request.onerror = () => {
            console.error('Failed to update config:', request.error);
            reject(request.error);
          };
          
          transaction.onerror = () => {
            console.error('Config update transaction failed:', transaction.error);
            reject(transaction.error);
          };
          
          setTimeout(() => {
            console.warn('Config update timeout');
            reject(new Error('Update config timeout'));
          }, 5000);
        } catch (error) {
          console.error('Failed to create config update transaction:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Failed to get database for config update:', error);
      throw error;
    }
  }
  
  /**
   * Get comprehensive storage statistics
   */
  static async getStorageStats(): Promise<StorageStats> {
    const notebooks = await NotebookORM.getNotebooks();
    
    let totalFiles = 0;
    let totalSize = 0;
    let largeFilesCount = 0;
    let oldestNotebook = Date.now();
    let newestNotebook = 0;
    let mostAccessedNotebook = '';
    let maxAccess = 0;
    
    for (const notebook of notebooks) {
      const stats = await NotebookORM.getNotebookStats(notebook.id);
      totalFiles += stats.fileCount;
      totalSize += stats.totalSize;
      
      // Get large files count for this notebook
      const largeFiles = await FileORM.getLargeFiles(notebook.id);
      largeFilesCount += largeFiles.length;
      
      // Track oldest/newest
      oldestNotebook = Math.min(oldestNotebook, notebook.createdAt);
      newestNotebook = Math.max(newestNotebook, notebook.createdAt);
      
      // Track most accessed
      if (notebook.accessCount > maxAccess) {
        maxAccess = notebook.accessCount;
        mostAccessedNotebook = notebook.id;
      }
    }
    
    return {
      totalNotebooks: notebooks.length,
      totalFiles,
      totalSize,
      largeFilesCount,
      oldestNotebook,
      newestNotebook,
      mostAccessedNotebook
    };
  }
  
  /**
   * Clean up old and unused notebooks and files
   */
  static async cleanupStorage(force: boolean = false): Promise<CleanupStats> {
    if (this.cleanupInProgress && !force) {
      throw new Error('Cleanup already in progress');
    }
    
    this.cleanupInProgress = true;
    const startTime = Date.now();
    
    try {
      const config = await this.getConfig();
      const stats: CleanupStats = {
        notebooksDeleted: 0,
        filesDeleted: 0,
        bytesFreed: 0,
        duration: 0
      };
      
      // 1. Clean up inactive notebooks
      const inactiveNotebooks = await NotebookORM.getInactiveNotebooks(config.retentionPeriod);
      
      for (const notebook of inactiveNotebooks) {
        // Get files for size calculation
        const files = await FileORM.getFilesForNotebook(notebook.id);
        const notebookSize = files.reduce((sum, file) => sum + file.metadata.size, 0);
        
        // Delete notebook and all associated data
        const deleted = await NotebookORM.deleteNotebook(notebook.id);
        if (deleted) {
          stats.notebooksDeleted++;
          stats.filesDeleted += files.length;
          stats.bytesFreed += notebookSize;
        }
      }
      
      // 2. Enforce maximum notebook limit
      const allNotebooks = await NotebookORM.getNotebooks({
        orderBy: 'lastAccessedAt',
        limit: config.maxNotebooks + 50 // Get more than limit to find candidates for deletion
      });
      
      if (allNotebooks.length > config.maxNotebooks) {
        const excessNotebooks = allNotebooks.slice(config.maxNotebooks);
        
        for (const notebook of excessNotebooks) {
          const files = await FileORM.getFilesForNotebook(notebook.id);
          const notebookSize = files.reduce((sum, file) => sum + file.metadata.size, 0);
          
          const deleted = await NotebookORM.deleteNotebook(notebook.id);
          if (deleted) {
            stats.notebooksDeleted++;
            stats.filesDeleted += files.length;
            stats.bytesFreed += notebookSize;
          }
        }
      }
      
      // 3. Clean up orphaned activities (older than retention period)
      await this.cleanupOldActivities(config.retentionPeriod);
      
      // 4. Update config with last cleanup time
      await this.updateConfig({ lastCleanup: Date.now() });
      
      stats.duration = Date.now() - startTime;
      this.lastCleanup = Date.now();
      
      return stats;
    } finally {
      this.cleanupInProgress = false;
    }
  }
  
  /**
   * Clean up specific notebook and all its data
   */
  static async cleanupNotebook(notebookId: string): Promise<boolean> {
    try {
      // Get files for size calculation
      const files = await FileORM.getFilesForNotebook(notebookId);
      const totalSize = files.reduce((sum, file) => sum + file.metadata.size, 0);
      
      // Delete notebook and all associated data
      const deleted = await NotebookORM.deleteNotebook(notebookId);
      
      if (deleted) {
        console.log(`Cleaned up notebook ${notebookId}: ${files.length} files, ${totalSize} bytes`);
      }
      
      return deleted;
    } catch (error) {
      console.error(`Failed to cleanup notebook ${notebookId}:`, error);
      return false;
    }
  }
  
  /**
   * Get notebooks ready for cleanup (inactive or exceeding limits)
   */
  static async getCleanupCandidates(): Promise<{
    inactive: NotebookEntity[];
    excess: NotebookEntity[];
    totalBytesToFree: number;
  }> {
    const config = await this.getConfig();
    
    // Get inactive notebooks
    const inactive = await NotebookORM.getInactiveNotebooks(config.retentionPeriod);
    
    // Get excess notebooks (over the limit)
    const allNotebooks = await NotebookORM.getNotebooks({
      orderBy: 'lastAccessedAt'
    });
    
    const excess = allNotebooks.length > config.maxNotebooks 
      ? allNotebooks.slice(config.maxNotebooks)
      : [];
    
    // Calculate total bytes to free
    let totalBytesToFree = 0;
    
    for (const notebook of [...inactive, ...excess]) {
      const stats = await NotebookORM.getNotebookStats(notebook.id);
      totalBytesToFree += stats.totalSize;
    }
    
    return {
      inactive,
      excess,
      totalBytesToFree
    };
  }
  
  /**
   * Emergency cleanup when storage is full
   */
  static async emergencyCleanup(): Promise<CleanupStats> {
    console.warn('Performing emergency storage cleanup');
    
    const config = await this.getConfig();
    const stats: CleanupStats = {
      notebooksDeleted: 0,
      filesDeleted: 0,
      bytesFreed: 0,
      duration: Date.now()
    };
    
    // Get all notebooks ordered by last access (oldest first)
    const notebooks = await NotebookORM.getNotebooks({
      orderBy: 'lastAccessedAt'
    });
    
    // Delete oldest notebooks until we're under limits
    const targetNotebooks = Math.floor(config.maxNotebooks * 0.7); // Keep only 70%
    
    if (notebooks.length > targetNotebooks) {
      const notebooksToDelete = notebooks.slice(0, notebooks.length - targetNotebooks);
      
      for (const notebook of notebooksToDelete) {
        const files = await FileORM.getFilesForNotebook(notebook.id);
        const notebookSize = files.reduce((sum, file) => sum + file.metadata.size, 0);
        
        const deleted = await NotebookORM.deleteNotebook(notebook.id);
        if (deleted) {
          stats.notebooksDeleted++;
          stats.filesDeleted += files.length;
          stats.bytesFreed += notebookSize;
        }
      }
    }
    
    stats.duration = Date.now() - stats.duration;
    
    return stats;
  }
  
  /**
   * Schedule periodic cleanup
   */
  private static scheduleCleanup(): void {
    const checkInterval = 60 * 60 * 1000; // Check every hour
    
    setInterval(async () => {
      try {
        const config = await this.getConfig();
        const timeSinceLastCleanup = Date.now() - (config.lastCleanup || 0);
        
        if (timeSinceLastCleanup >= config.cleanupInterval) {
          console.log('Performing scheduled storage cleanup');
          const stats = await this.cleanupStorage();
          console.log('Cleanup completed:', stats);
        }
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, checkInterval);
  }
  
  /**
   * Ensure config exists in database
   */
  private static async ensureConfig(): Promise<void> {
    try {
      console.log('Checking storage configuration...');
      const config = await this.getConfig();
      
      // If config doesn't exist or is default, create it
      if (!config || config === DEFAULT_STORAGE_CONFIG) {
        console.log('Creating default storage configuration...');
        await this.updateConfig(DEFAULT_STORAGE_CONFIG);
        console.log('Default storage configuration created');
      } else {
        console.log('Storage configuration already exists');
      }
    } catch (error) {
      console.warn('Failed to ensure config, using defaults:', error);
      // Don't throw - we can continue with default config in memory
    }
  }
  
  /**
   * Clean up old activity records
   */
  private static async cleanupOldActivities(retentionPeriod: number): Promise<void> {
    const db = await IndexedDBManager.getDB();
    const cutoffTime = Date.now() - retentionPeriod;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.ACTIVITIES], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.STORES.ACTIVITIES);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
      
      setTimeout(() => resolve(), 10000); // Don't block too long on cleanup
    });
  }
  
  /**
   * Check and perform data migration if needed
   */
  private static async checkAndMigrate(): Promise<void> {
    try {
      console.log('Checking if data migration is needed...');
      const migrationNeeded = await DataMigration.isMigrationNeeded();
      
      if (migrationNeeded) {
        console.log('Data migration required, starting migration...');
        const stats = await DataMigration.migrate();
        
        if (stats.notebooksMigrated > 0 || stats.filesMigrated > 0) {
          console.log('Data migration completed successfully:', {
            notebooks: stats.notebooksMigrated,
            files: stats.filesMigrated,
            duration: `${stats.duration}ms`
          });
        }
        
        if (stats.errors.length > 0) {
          console.warn('Migration completed with errors:', stats.errors);
        }
      } else {
        console.log('No data migration needed');
      }
    } catch (error) {
      console.error('Data migration failed:', error);
      // Don't throw - we can continue without migration
    }
  }

  /**
   * Force data migration (useful for debugging)
   */
  static async forceMigration(): Promise<void> {
    try {
      console.log('Forcing data migration...');
      const stats = await DataMigration.forceMigration();
      console.log('Force migration completed:', stats);
    } catch (error) {
      console.error('Force migration failed:', error);
      throw error;
    }
  }

  /**
   * Close storage system
   */
  static close(): void {
    IndexedDBManager.close();
  }
}