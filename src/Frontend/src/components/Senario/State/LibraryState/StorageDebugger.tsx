// LibraryState/StorageDebugger.tsx
// Debug component for storage system

import React, { useState, useCallback } from 'react';
import { Card, Button, Collapse, Tag, Space, Alert } from 'antd';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Upload,
  Bug,
  AlertTriangle
} from 'lucide-react';
import { 
  StorageManager, 
  NotebookORM, 
  DataMigration,
  type StorageStats,
  type MigrationStats 
} from '@Storage/index';

const { Panel } = Collapse;

interface StorageDebuggerProps {
  visible?: boolean;
}

const StorageDebugger: React.FC<StorageDebuggerProps> = ({ visible = false }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);

  const loadStorageStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading storage statistics...');
      const storageStats = await StorageManager.getStorageStats();
      setStats(storageStats);
      
      // Check available databases
      const dbNames = await getAvailableDatabases();
      setDatabases(dbNames);
      
      console.log('Storage stats loaded:', storageStats);
    } catch (err) {
      const errorMsg = `Failed to load storage stats: ${err}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMigration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Checking migration status...');
      const migrationNeeded = await DataMigration.isMigrationNeeded();
      
      if (migrationNeeded) {
        console.log('Migration needed, performing migration...');
        const migrationResult = await DataMigration.migrate();
        setMigrationStats(migrationResult);
        
        // Reload storage stats after migration
        await loadStorageStats();
      } else {
        console.log('No migration needed');
        setMigrationStats({
          notebooksFound: 0,
          notebooksMigrated: 0,
          filesFound: 0,
          filesMigrated: 0,
          errors: ['No migration needed'],
          duration: 0
        });
      }
    } catch (err) {
      const errorMsg = `Migration check failed: ${err}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadStorageStats]);

  const forceMigration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Forcing migration...');
      const migrationResult = await DataMigration.forceMigration();
      setMigrationStats(migrationResult);
      
      // Reload storage stats after migration
      await loadStorageStats();
    } catch (err) {
      const errorMsg = `Force migration failed: ${err}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadStorageStats]);

  const initializeStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Initializing storage system...');
      await StorageManager.initialize();
      await loadStorageStats();
      console.log('Storage system initialized successfully');
    } catch (err) {
      const errorMsg = `Storage initialization failed: ${err}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadStorageStats]);

  const getAvailableDatabases = async (): Promise<string[]> => {
    try {
      // This is a bit tricky since IndexedDB doesn't have a direct API to list databases
      const possibleDbs = [
        'easyremote-notebook-cache-v2',
        'easyremote-file-cache',
        'easyremote-file-cache-v2',
        'easyremote-file-cache-v3'
      ];
      
      const existing = [];
      for (const dbName of possibleDbs) {
        try {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(dbName);
            request.onsuccess = () => {
              request.result.close();
              existing.push(dbName);
              resolve();
            };
            request.onerror = () => resolve(); // DB doesn't exist
            request.onupgradeneeded = () => {
              request.result.close();
              resolve(); // DB exists but empty
            };
            setTimeout(() => resolve(), 1000); // Timeout
          });
        } catch {
          // Ignore errors
        }
      }
      
      return existing;
    } catch {
      return [];
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card
        title={
          <Space>
            <Database className="w-4 h-4" />
            存储调试器
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<RefreshCw className="w-3 h-3" />}
              onClick={loadStorageStats}
              loading={loading}
            />
          </Space>
        }
        size="small"
      >
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="mb-2"
          />
        )}

        <Collapse size="small">
          <Panel header="存储统计" key="stats">
            {stats ? (
              <div className="space-y-2">
                <div><strong>笔记本总数:</strong> {stats.totalNotebooks}</div>
                <div><strong>文件总数:</strong> {stats.totalFiles}</div>
                <div><strong>总大小:</strong> {(stats.totalSize / 1024 / 1024).toFixed(2)} MB</div>
                <div><strong>大文件数:</strong> {stats.largeFilesCount}</div>
                <div><strong>最活跃笔记本:</strong> {stats.mostAccessedNotebook || 'N/A'}</div>
              </div>
            ) : (
              <Button 
                size="small" 
                onClick={loadStorageStats} 
                loading={loading}
              >
                加载统计
              </Button>
            )}
          </Panel>

          <Panel header="数据库状态" key="databases">
            <div className="space-y-2">
              <div><strong>发现的数据库:</strong></div>
              {databases.length > 0 ? (
                databases.map(db => (
                  <Tag key={db} color={db.includes('v2') ? 'green' : 'orange'}>
                    {db}
                  </Tag>
                ))
              ) : (
                <Tag color="red">无数据库</Tag>
              )}
            </div>
          </Panel>

          <Panel header="迁移状态" key="migration">
            {migrationStats ? (
              <div className="space-y-2">
                <div><strong>发现笔记本:</strong> {migrationStats.notebooksFound}</div>
                <div><strong>迁移笔记本:</strong> {migrationStats.notebooksMigrated}</div>
                <div><strong>发现文件:</strong> {migrationStats.filesFound}</div>
                <div><strong>迁移文件:</strong> {migrationStats.filesMigrated}</div>
                <div><strong>耗时:</strong> {migrationStats.duration}ms</div>
                {migrationStats.errors.length > 0 && (
                  <div>
                    <strong>错误:</strong>
                    <div className="mt-1 space-y-1">
                      {migrationStats.errors.slice(0, 3).map((error, i) => (
                        <div key={i} className="text-xs text-red-600 break-words">
                          {error}
                        </div>
                      ))}
                      {migrationStats.errors.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{migrationStats.errors.length - 3} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Space>
                <Button 
                  size="small" 
                  icon={<Upload className="w-3 h-3" />}
                  onClick={checkMigration} 
                  loading={loading}
                >
                  检查迁移
                </Button>
                <Button 
                  size="small" 
                  icon={<AlertTriangle className="w-3 h-3" />}
                  onClick={forceMigration} 
                  loading={loading}
                  danger
                >
                  强制迁移
                </Button>
              </Space>
            )}
          </Panel>

          <Panel header="操作" key="actions">
            <Space direction="vertical" className="w-full">
              <Button 
                size="small" 
                icon={<Download className="w-3 h-3" />}
                onClick={initializeStorage}
                loading={loading}
                type="primary"
              >
                重新初始化存储
              </Button>
            </Space>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default StorageDebugger;