// services/notebookAutoSave.ts
// Auto-save service for real-time notebook content synchronization

import { debounce } from 'lodash-es';
import { NotebookORM, FileORM, StorageManager } from '@Storage/index';
import type { Cell, Task } from '@Store/notebookStore';

interface NotebookSnapshot {
  notebookId: string;
  notebookTitle: string;
  cells: Cell[];
  tasks: Task[];
  timestamp: number;
}

/**
 * Auto-save service for notebook content
 */
export class NotebookAutoSave {
  private static instance: NotebookAutoSave | null = null;
  private saveQueue = new Map<string, NotebookSnapshot>();
  private isInitialized = false;
  private saveInProgress = false;

  // Debounced save function with 25ms delay
  private debouncedSave = debounce(async () => {
    await this.processSaveQueue();
  }, 25);

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NotebookAutoSave {
    if (!this.instance) {
      this.instance = new NotebookAutoSave();
    }
    return this.instance;
  }

  /**
   * Initialize auto-save service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing notebook auto-save service...');
      
      // Ensure storage is initialized
      await StorageManager.initialize();
      
      this.isInitialized = true;
      console.log('Notebook auto-save service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notebook auto-save service:', error);
      throw error;
    }
  }

  /**
   * Queue a notebook for saving
   */
  queueSave(snapshot: NotebookSnapshot): void {
    if (!this.isInitialized) {
      console.warn('Auto-save service not initialized, skipping save queue');
      return;
    }

    // 🔍 调试：记录每次保存请求的详情
    console.log('🔄 QUEUE SAVE REQUEST:', {
      notebookId: snapshot.notebookId,
      title: snapshot.notebookTitle,
      cellsCount: snapshot.cells?.length || 0,
      tasksCount: snapshot.tasks?.length || 0,
      timestamp: snapshot.timestamp,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n') // 获取调用栈
    });

    // 🛡️ 安全检查：如果cells为空且这不是初始化，跳过保存
    if ((!snapshot.cells || snapshot.cells.length === 0) && snapshot.notebookTitle !== 'Untitled') {
      console.warn('🛡️ SKIPPING EMPTY CELLS SAVE to prevent data loss:', {
        notebookId: snapshot.notebookId,
        cellsCount: snapshot.cells?.length || 0,
        title: snapshot.notebookTitle
      });
      return;
    }

    // Update the queue with latest snapshot
    this.saveQueue.set(snapshot.notebookId, {
      ...snapshot,
      timestamp: Date.now()
    });

    // Trigger debounced save
    this.debouncedSave();
  }

  /**
   * Process the save queue
   */
  private async processSaveQueue(): Promise<void> {
    if (this.saveInProgress || this.saveQueue.size === 0) {
      return;
    }

    this.saveInProgress = true;
    
    try {
      const snapshots = Array.from(this.saveQueue.values());
      this.saveQueue.clear();

      console.log(`Processing ${snapshots.length} notebook save(s)...`);

      for (const snapshot of snapshots) {
        try {
          await this.saveNotebook(snapshot);
        } catch (error) {
          console.error(`Failed to save notebook ${snapshot.notebookId}:`, error);
          // Continue with other notebooks even if one fails
        }
      }
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Save notebook snapshot to database
   */
  private async saveNotebook(snapshot: NotebookSnapshot): Promise<void> {
    const { notebookId, notebookTitle, cells, tasks, timestamp } = snapshot;

    try {
      // 1. Update notebook metadata
      await NotebookORM.saveNotebook({
        id: notebookId,
        name: notebookTitle || `Notebook ${notebookId.slice(0, 8)}`,
        description: `Auto-saved notebook with ${cells.length} cells`,
        lastAccessedAt: timestamp,
        accessCount: 1, // Will be incremented by ORM if notebook exists
        fileCount: cells.length,
        totalSize: this.calculateContentSize(cells),
        cacheEnabled: true
      });

      // 2. Save notebook content as a single main file (no individual cell files)
      const notebookContent = JSON.stringify({
        notebook_id: notebookId,
        title: notebookTitle,
        cells,
        tasks,
        saved_at: timestamp,
        version: '2.0'
      }, null, 2);

      console.log('💾 AUTO-SAVE JSON CONTENT:', notebookContent);
      console.log('💾 CELLS DATA:', JSON.stringify(cells, null, 2));
      console.log('💾 TASKS DATA:', JSON.stringify(tasks, null, 2));

      await FileORM.saveFile({
        notebookId,
        filePath: `notebook_${notebookId}.json`,
        fileName: `${notebookTitle || 'Untitled'}.easynb`,  // Use .easynb extension
        content: notebookContent,
        lastModified: new Date(timestamp).toISOString(),
        size: new Blob([notebookContent]).size,
        remoteUrl: undefined
      });

      // Note: We no longer save individual cell files to avoid creating multiple tabs
      // All notebook content is stored in the single .easynb file

      console.log(`✅ Notebook ${notebookId} auto-saved successfully (${cells.length} cells)`);
    } catch (error) {
      console.error(`❌ Failed to auto-save notebook ${notebookId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate total content size
   */
  private calculateContentSize(cells: Cell[]): number {
    let totalSize = 0;
    for (const cell of cells) {
      totalSize += new Blob([cell.content || '']).size;
      if (cell.outputs?.length) {
        totalSize += new Blob([JSON.stringify(cell.outputs)]).size;
      }
    }
    return totalSize;
  }

  /**
   * Generate appropriate file name for cell
   */
  private generateCellFileName(cell: Cell, index: number): string {
    const extensions = {
      code: 'py',
      markdown: 'md',
      hybrid: 'md',
      raw: 'txt',
      image: 'md',
      thinking: 'md',
      link: 'md'
    };

    const ext = extensions[cell.type] || 'txt';
    
    // Extract meaningful name from content
    let name = '';
    if (cell.type === 'markdown' && cell.content.includes('#')) {
      // Extract heading for markdown cells
      const headingMatch = cell.content.match(/^#+\s+(.+)/m);
      if (headingMatch) {
        name = headingMatch[1].trim().substring(0, 30);
      }
    } else if (cell.type === 'code') {
      // Extract function/class name for code cells
      const funcMatch = cell.content.match(/(?:def|class)\s+(\w+)/);
      if (funcMatch) {
        name = funcMatch[1];
      }
    }

    if (!name) {
      name = `cell_${index + 1}`;
    }

    // Clean name for file system
    name = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    
    return `${String(index + 1).padStart(3, '0')}_${name}.${ext}`;
  }

  /**
   * Format cell content for saving
   */
  private formatCellContent(cell: Cell): string {
    let content = cell.content || '';

    // Add metadata header
    const metadata = [
      `<!-- Cell Type: ${cell.type} -->`,
      `<!-- Cell ID: ${cell.id} -->`,
    ];

    if (cell.phaseId) {
      metadata.push(`<!-- Phase ID: ${cell.phaseId} -->`);
    }

    if (cell.description) {
      metadata.push(`<!-- Description: ${cell.description} -->`);
    }

    // Add outputs if present
    if (cell.outputs?.length) {
      content += '\n\n<!-- Outputs -->\n```json\n';
      content += JSON.stringify(cell.outputs, null, 2);
      content += '\n```';
    }

    return metadata.join('\n') + '\n\n' + content;
  }

  /**
   * Load notebook from database (static method)
   */
  static async loadNotebook(notebookId: string): Promise<{
    notebookTitle: string;
    cells: Cell[];
    tasks: Task[];
  } | null> {
    try {
      console.log(`📖 Loading notebook ${notebookId} from database...`);

      // Try to load main notebook file first
      const expectedFilePath = `notebook_${notebookId}.json`;
      console.log(`🔍 Searching for file: ${expectedFilePath}`);
      
      const mainFile = await FileORM.getFile(notebookId, expectedFilePath);
      console.log(`📄 Main file result:`, mainFile ? 'Found' : 'Not found');
      
      if (mainFile?.content) {
        console.log(`📝 File content length: ${mainFile.content.length} characters`);
        console.log('📄 RAW LOADED JSON CONTENT:', mainFile.content);
        try {
          const data = JSON.parse(mainFile.content);
          console.log('📄 PARSED LOADED DATA:', JSON.stringify(data, null, 2));
          console.log(`✅ Successfully parsed notebook data:`, {
            title: data.title || data.notebookTitle || 'Untitled',
            cellsCount: (data.cells || []).length,
            tasksCount: (data.tasks || []).length
          });
          console.log('📄 LOADED CELLS:', JSON.stringify(data.cells || [], null, 2));
          console.log('📄 LOADED TASKS:', JSON.stringify(data.tasks || [], null, 2));
          
          return {
            notebookTitle: data.title || data.notebookTitle || 'Untitled',
            cells: data.cells || [],
            tasks: data.tasks || []
          };
        } catch (parseError) {
          console.warn('❌ Failed to parse main notebook file:', parseError);
          console.warn('📄 Raw content preview:', mainFile.content.substring(0, 200));
        }
      } else {
        console.log(`🔍 Main file not found, trying to list all files for notebook ${notebookId}...`);
        
        // Debug: List all files for this notebook
        try {
          const allFiles = await FileORM.getFilesForNotebook(notebookId, false);
          console.log(`📁 Found ${allFiles.length} files for notebook:`, 
            allFiles.map(f => ({ path: f.filePath, name: f.fileName })));
        } catch (error) {
          console.warn('❌ Failed to list files:', error);
        }
      }

      // Fallback: try to load from notebook metadata
      console.log(`🔄 Trying fallback: loading notebook metadata...`);
      const notebook = await NotebookORM.getNotebook(notebookId);
      
      if (!notebook) {
        console.log(`❌ Notebook ${notebookId} not found in database`);
        return null;
      }

      console.log(`⚠️ Loaded notebook ${notebookId} metadata only:`, {
        name: notebook.name,
        description: notebook.description,
        fileCount: notebook.fileCount,
        note: 'cells will be empty'
      });

      return {
        notebookTitle: notebook.name,
        cells: [], // No cells since we don't save individual cell files anymore
        tasks: []
      };
    } catch (error) {
      console.error(`❌ Failed to load notebook ${notebookId}:`, error);
      return null;
    }
  }

  /**
   * Parse cell content from saved file
   */
  private static parseCellFile(content: string): Cell | null {
    try {
      const lines = content.split('\n');
      let cellType: string = 'markdown';
      let cellId: string = '';
      let phaseId: string | null = null;
      let description: string | null = null;
      let actualContent = '';

      let contentStartIndex = 0;

      // Parse metadata headers
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('<!-- Cell Type:')) {
          cellType = line.match(/Cell Type: (\w+)/)?.[1] || 'markdown';
        } else if (line.startsWith('<!-- Cell ID:')) {
          cellId = line.match(/Cell ID: ([^-]+)/)?.[1]?.trim() || '';
        } else if (line.startsWith('<!-- Phase ID:')) {
          phaseId = line.match(/Phase ID: ([^-]+)/)?.[1]?.trim() || null;
        } else if (line.startsWith('<!-- Description:')) {
          description = line.match(/Description: ([^-]+)/)?.[1]?.trim() || null;
        } else if (!line.startsWith('<!--') && line.length > 0) {
          contentStartIndex = i;
          break;
        }
      }

      // Extract actual content (skip metadata and outputs)
      let endIndex = lines.length;
      for (let i = contentStartIndex; i < lines.length; i++) {
        if (lines[i].trim() === '<!-- Outputs -->') {
          endIndex = i;
          break;
        }
      }

      actualContent = lines.slice(contentStartIndex, endIndex).join('\n').trim();

      if (!cellId) {
        console.warn('Cell file missing ID, skipping');
        return null;
      }

      return {
        id: cellId,
        type: cellType as any,
        content: actualContent,
        outputs: [],
        enableEdit: true,
        phaseId,
        description,
        metadata: {}
      };
    } catch (error) {
      console.error('Failed to parse cell file:', error);
      return null;
    }
  }

  /**
   * Immediate save (bypass debouncing)
   */
  async saveNow(snapshot: NotebookSnapshot): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.saveNotebook(snapshot);
  }

  /**
   * Clear pending saves for a notebook
   */
  clearPendingSave(notebookId: string): void {
    this.saveQueue.delete(notebookId);
  }

  /**
   * Get pending save count
   */
  getPendingSaveCount(): number {
    return this.saveQueue.size;
  }
}

// Export singleton instance
export default NotebookAutoSave.getInstance();