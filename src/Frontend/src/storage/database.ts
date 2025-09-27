// storage/database.ts
// IndexedDB database connection and management

import { DB_STORES, DB_INDEXES } from './schema';

// Database configuration
export const DB_CONFIG = {
  NAME: 'easyremote-notebook-cache-v2', // Changed name to avoid conflicts
  VERSION: 2, // Incremented to ensure TAB_STATES store is created
  STORES: DB_STORES
} as const;

/**
 * IndexedDB connection pool for optimized database access
 */
export class IndexedDBManager {
  private static instance: IDBDatabase | null = null;
  private static initPromise: Promise<IDBDatabase> | null = null;
  
  /**
   * Get database connection with pooling
   */
  static async getDB(): Promise<IDBDatabase> {
    if (this.instance && this.instance.version === DB_CONFIG.VERSION) {
      return this.instance;
    }
    
    if (!this.initPromise) {
      this.initPromise = this.initializeDB();
    }
    
    return this.initPromise;
  }
  
  /**
   * Initialize IndexedDB database
   */
  private static async initializeDB(): Promise<IDBDatabase> {
    console.log('[DEBUG] IndexedDBManager - Starting database initialization');
    console.log('[DEBUG] IndexedDBManager - DB Name:', DB_CONFIG.NAME, 'Version:', DB_CONFIG.VERSION);
    
    return new Promise((resolve, reject) => {
      console.log('[DEBUG] IndexedDBManager - Opening IndexedDB connection');
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);
      
      // Setup timeout for initialization - increased for database upgrade
      const timeout = setTimeout(() => {
        console.error('[DEBUG] IndexedDBManager - Database initialization timeout (20s)');
        reject(new Error('IndexedDB initialization timeout'));
      }, 20000); // Increased to 20 seconds for upgrade operations
      
      request.onupgradeneeded = (event) => {
        console.log('[DEBUG] IndexedDBManager - onupgradeneeded event fired');
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        
        console.log(`[DEBUG] IndexedDBManager - Upgrading database from version ${event.oldVersion} to ${event.newVersion}`);
        
        // Only clear stores if they exist (for cleaner upgrades)
        const existingStores = Array.from(db.objectStoreNames);
        console.log('[DEBUG] IndexedDBManager - Existing stores:', existingStores);
        if (existingStores.length > 0) {
          console.log(`[DEBUG] IndexedDBManager - Removing ${existingStores.length} existing stores for clean upgrade`);
          existingStores.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              db.deleteObjectStore(storeName);
              console.log(`[DEBUG] IndexedDBManager - Deleted existing store: ${storeName}`);
            }
          });
        }
        
        // Create notebooks store
        console.log('[DEBUG] IndexedDBManager - Creating notebooks store');
        const notebooksStore = db.createObjectStore(DB_CONFIG.STORES.NOTEBOOKS, { keyPath: 'id' });
        notebooksStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        notebooksStore.createIndex('accessCount', 'accessCount', { unique: false });
        notebooksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log(`[DEBUG] IndexedDBManager - Created store: ${DB_CONFIG.STORES.NOTEBOOKS}`);
        
        // Create files metadata store
        console.log('[DEBUG] IndexedDBManager - Creating files metadata store');
        const filesMetaStore = db.createObjectStore(DB_CONFIG.STORES.FILES_METADATA, { keyPath: 'id' });
        filesMetaStore.createIndex('notebookId', 'notebookId', { unique: false });
        filesMetaStore.createIndex('notebookPath', ['notebookId', 'filePath'], { unique: true });
        filesMetaStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        filesMetaStore.createIndex('storageType', 'storageType', { unique: false });
        filesMetaStore.createIndex('isLargeFile', 'isLargeFile', { unique: false });
        filesMetaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        console.log(`[DEBUG] IndexedDBManager - Created store: ${DB_CONFIG.STORES.FILES_METADATA}`);
        
        // Create files content store
        console.log('[DEBUG] IndexedDBManager - Creating files content store');
        const filesContentStore = db.createObjectStore(DB_CONFIG.STORES.FILES_CONTENT, { keyPath: 'fileId' });
        console.log(`[DEBUG] IndexedDBManager - Created store: ${DB_CONFIG.STORES.FILES_CONTENT}`);
        
        // Create activities store
        console.log('[DEBUG] IndexedDBManager - Creating activities store');
        const activitiesStore = db.createObjectStore(DB_CONFIG.STORES.ACTIVITIES, { keyPath: 'id' });
        activitiesStore.createIndex('notebookId', 'notebookId', { unique: false });
        activitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
        activitiesStore.createIndex('notebookTimestamp', ['notebookId', 'timestamp'], { unique: false });
        activitiesStore.createIndex('activityType', 'activityType', { unique: false });
        console.log(`[DEBUG] IndexedDBManager - Created store: ${DB_CONFIG.STORES.ACTIVITIES}`);
        
        // Create config store
        console.log('[DEBUG] IndexedDBManager - Creating config store');
        const configStore = db.createObjectStore(DB_CONFIG.STORES.CONFIG, { keyPath: 'id' });
        console.log(`[DEBUG] IndexedDBManager - Created store: ${DB_CONFIG.STORES.CONFIG}`);
        
        // Create tab states store
        console.log('[DEBUG] IndexedDBManager - Creating tab states store');
        const tabStatesStore = db.createObjectStore(DB_CONFIG.STORES.TAB_STATES, { keyPath: 'notebookId' });
        tabStatesStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        console.log(`[DEBUG] IndexedDBManager - Created store: ${DB_CONFIG.STORES.TAB_STATES}`);
        
        console.log('[DEBUG] IndexedDBManager - Database upgrade completed successfully');
      };
      
      request.onsuccess = () => {
        console.log('[DEBUG] IndexedDBManager - onsuccess event fired');
        clearTimeout(timeout);
        this.instance = request.result;
        console.log('[DEBUG] IndexedDBManager - Database instance set, version:', this.instance.version);
        
        // Handle database close events
        this.instance.onclose = () => {
          console.log('[DEBUG] IndexedDBManager - Database connection closed');
          this.instance = null;
          this.initPromise = null;
        };
        
        // Start cleanup in background after successful initialization
        console.log('[DEBUG] IndexedDBManager - Starting background cleanup');
        this.cleanupOldDatabases().catch(e => 
          console.warn('[DEBUG] IndexedDBManager - Background cleanup failed:', e)
        );
        
        console.log('[DEBUG] IndexedDBManager - Database initialization completed successfully');
        resolve(this.instance);
      };
      
      request.onerror = () => {
        console.error('[DEBUG] IndexedDBManager - onerror event fired:', request.error);
        clearTimeout(timeout);
        this.initPromise = null;
        reject(request.error);
      };
      
      request.onblocked = () => {
        console.warn('[DEBUG] IndexedDBManager - onblocked event fired - database upgrade blocked');
      };
    });
  }
  
  /**
   * Clean up old database versions in background
   */
  private static async cleanupOldDatabases(): Promise<void> {
    try {
      const oldDBNames = [
        'easyremote-file-cache', 
        'easyremote-file-cache-v2',
        'easyremote-file-cache-v3'
      ];
      
      // Process deletions in parallel with shorter timeouts
      const deletePromises = oldDBNames.map(oldName => 
        new Promise<void>((resolve) => {
          try {
            const deleteReq = indexedDB.deleteDatabase(oldName);
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => resolve(); // Continue even if delete fails
            deleteReq.onblocked = () => resolve();
            // Shorter timeout for individual operations
            setTimeout(() => resolve(), 500);
          } catch (e) {
            resolve(); // Continue even if delete fails
          }
        })
      );
      
      await Promise.allSettled(deletePromises);
      console.log('Background database cleanup completed');
    } catch (e) {
      console.warn('Background cleanup failed:', e);
    }
  }
  
  /**
   * Close database connection
   */
  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      this.initPromise = null;
    }
  }
  
  /**
   * Initialize database connection
   */
  static async initialize(): Promise<void> {
    console.log('[DEBUG] IndexedDBManager - Initialize method called');
    try {
      console.log('[DEBUG] IndexedDBManager - Calling getDB()');
      await this.getDB();
      console.log('[DEBUG] IndexedDBManager - Database initialization successful');
    } catch (error) {
      console.error('[DEBUG] IndexedDBManager - Failed to initialize IndexedDB:', error);
      console.error('[DEBUG] IndexedDBManager - Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error('Failed to initialize file cache database');
    }
  }
}