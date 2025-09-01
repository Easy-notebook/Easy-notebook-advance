// storage/database.ts
// IndexedDB database connection and management

import { DB_STORES, DB_INDEXES } from './schema';

// Database configuration
export const DB_CONFIG = {
  NAME: 'easyremote-notebook-cache-v2', // Changed name to avoid conflicts
  VERSION: 1,
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
    // Clean up old database versions
    await this.cleanupOldDatabases();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);
      
      // Setup timeout for initialization
      const timeout = setTimeout(() => {
        reject(new Error('IndexedDB initialization timeout'));
      }, 10000);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        
        console.log(`Upgrading database from version ${event.oldVersion} to ${event.newVersion}`);
        
        // Clear all existing stores to ensure clean upgrade
        const existingStores = Array.from(db.objectStoreNames);
        existingStores.forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
            console.log(`Deleted existing store: ${storeName}`);
          }
        });
        
        // Create notebooks store
        const notebooksStore = db.createObjectStore(DB_CONFIG.STORES.NOTEBOOKS, { keyPath: 'id' });
        notebooksStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        notebooksStore.createIndex('accessCount', 'accessCount', { unique: false });
        notebooksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log(`Created store: ${DB_CONFIG.STORES.NOTEBOOKS}`);
        
        // Create files metadata store
        const filesMetaStore = db.createObjectStore(DB_CONFIG.STORES.FILES_METADATA, { keyPath: 'id' });
        filesMetaStore.createIndex('notebookId', 'notebookId', { unique: false });
        filesMetaStore.createIndex('notebookPath', ['notebookId', 'filePath'], { unique: true });
        filesMetaStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        filesMetaStore.createIndex('storageType', 'storageType', { unique: false });
        filesMetaStore.createIndex('isLargeFile', 'isLargeFile', { unique: false });
        filesMetaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        console.log(`Created store: ${DB_CONFIG.STORES.FILES_METADATA}`);
        
        // Create files content store
        const filesContentStore = db.createObjectStore(DB_CONFIG.STORES.FILES_CONTENT, { keyPath: 'fileId' });
        console.log(`Created store: ${DB_CONFIG.STORES.FILES_CONTENT}`);
        
        // Create activities store
        const activitiesStore = db.createObjectStore(DB_CONFIG.STORES.ACTIVITIES, { keyPath: 'id' });
        activitiesStore.createIndex('notebookId', 'notebookId', { unique: false });
        activitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
        activitiesStore.createIndex('notebookTimestamp', ['notebookId', 'timestamp'], { unique: false });
        activitiesStore.createIndex('activityType', 'activityType', { unique: false });
        console.log(`Created store: ${DB_CONFIG.STORES.ACTIVITIES}`);
        
        // Create config store
        const configStore = db.createObjectStore(DB_CONFIG.STORES.CONFIG, { keyPath: 'id' });
        console.log(`Created store: ${DB_CONFIG.STORES.CONFIG}`);
        
        console.log('Database upgrade completed successfully');
      };
      
      request.onsuccess = () => {
        clearTimeout(timeout);
        this.instance = request.result;
        
        // Handle database close events
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
  
  /**
   * Clean up old database versions
   */
  private static async cleanupOldDatabases(): Promise<void> {
    try {
      const oldDBNames = [
        'easyremote-file-cache', 
        'easyremote-file-cache-v2',
        'easyremote-file-cache-v3'
      ];
      
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
    try {
      await this.getDB();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error('Failed to initialize file cache database');
    }
  }
}