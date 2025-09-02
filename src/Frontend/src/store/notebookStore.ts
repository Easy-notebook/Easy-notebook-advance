// store/notebookStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { parseMarkdownCells, findCellsByPhase, findCellsByStep, updateCellsPhaseId } from '../utils/markdownParser';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '../components/UI/Toast';
import { produce } from 'immer';
import notebookAutoSaveInstance, { NotebookAutoSave } from '../services/notebookAutoSave';
import { notebookLog, storeLog } from '../utils/logger';

import useCodeStore from './codeStore';

/**
 * 单元格类型
 */
export type CellType = 'code' | 'markdown' | 'raw' | 'hybrid' | 'image' | 'thinking' | 'link';

/**
 * 视图模式类型
 */
export type ViewMode = 'step' | 'demo' | 'create';

/**
 * 上传模式类型
 */
export type UploadMode = 'unrestricted' | 'restricted';

/**
 * 输出项接口
 */
export interface OutputItem {
    type: string;
    content: any;
    timestamp?: string;
}

/**
 * 单元格接口
 */
export interface Cell {
    id: string;
    type: CellType;
    content: string;
    outputs?: OutputItem[];
    enableEdit?: boolean;
    phaseId?: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
}

/**
 * 步骤接口
 */
export interface Step {
    id: string;
    title: string;
    status?: 'pending' | 'running' | 'completed' | 'error';
    startIndex?: number | null;
    endIndex?: number | null;
    content?: Cell[];
    cellIds?: string[];
}

/**
 * 阶段接口
 */
export interface Phase {
    id: string;
    title: string;
    steps: Step[];
    icon?: any;
    status?: 'pending' | 'running' | 'completed' | 'error';
    intro?: Cell[];
}

/**
 * 任务接口
 */
export interface Task {
    id: string;
    title: string;
    phases: Phase[];
}

/**
 * 运行结果接口
 */
export interface RunResult {
    success: boolean;
    error?: string;
}

/**
 * Toast 消息接口
 */
export interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Notebook Store 状态接口
 */
export interface NotebookStoreState {
    notebookId: string | null;
    notebookTitle: string; // 默认标题
    cells: Cell[];
    tasks: Task[];
    currentPhaseId: string | null;
    currentStepIndex: number;
    viewMode: ViewMode;
    currentCellId: string | null;
    isExecuting: boolean;
    currentRunningPhaseId: string | null;
    allowPagination: boolean;
    lastAddedCellId: string | null;

    error: string | null;
    isCollapsed: boolean;
    uploadMode: UploadMode;
    allowedTypes: string[];
    maxFiles: number | null;
    isRightSidebarCollapsed: boolean;
    editingCellId: string | null;

    whatPurposeOfThisNotebook: string | null;
    whatHaveWeDone: string | null;
    whatIsOurCurrentWork: string | null;

    // 新增 showButtons 状态
    showButtons: Record<string, boolean>;
    
    // 独立窗口状态
    detachedCellId: string | null;
    isDetachedCellFullscreen: boolean;
    
    // 初始化状态
    isInitialized: boolean;
}

/**
 * Notebook Store Actions 接口
 */
export interface NotebookStoreActions {
    // 基础获取器
    getCurrentCellId: () => string | null;
    getCurrentCell: () => Cell | undefined;

    // 编辑状态管理
    setEditingCellId: (id: string | null) => void;
    setEditingCellId2NULL: () => void;

    // 基础状态设置
    setError: (error: string | null) => void;
    setIsCollapsed: (isCollapsed: boolean) => void;
    setLastAddedCellId: (id: string | null) => void;
    setUploadMode: (uploadMode: UploadMode) => void;
    setAllowedTypes: (allowedTypes: string[]) => void;
    setMaxFiles: (maxFiles: number | null) => void;
    setIsRightSidebarCollapsed: (isRightSidebarCollapsed: boolean) => void;
    setNotebookId: (id: string | null) => void;
    setNotebookTitle: (title: string) => void;
    setCurrentPhase: (phaseId: string | null) => void;
    setCurrentStepIndex: (index: number) => void;
    setCurrentCell: (cellId: string | null) => void;
    setCurrentRunningPhaseId: (phaseId: string | null) => void;
    setAllowPagination: (allow: boolean) => void;
    setShowButtons: (cellId: string, value: boolean) => void;

    // 单元格管理
    clearCells: () => void;
    clearAllOutputs: () => void;
    clearCellOutputs: (cellId: string) => void;
    setCells: (cells: Cell[]) => void;
    updateCurrentCellWithContent: (content: string) => void;
    addCell: (newCell: Partial<Cell>, index?: number) => void;
    updateTitle: (title: string) => void;
    updateCurrentCellDescription: (description: string) => void;
    addNewContent2CurrentCellDescription: (content: string) => void;
    deleteCell: (cellId: string) => void;
    updateCell: (cellId: string, newContent: string) => void;
    updateCellOutputs: (cellId: string, outputs: OutputItem[]) => void;
    moveCellToIndex: (fromIndex: number, toIndex: number) => void;

    // 视图模式管理
    setViewMode: (mode: ViewMode) => void;
    toggleViewMode: () => void;

    // 代码执行
    runSingleCell: (cellId: string) => Promise<RunResult>;
    runAllCells: () => Promise<void>;
    runCurrentCodeCell: () => Promise<void>;

    // 单元格创建
    addNewCell2End: (type: CellType, description?: string, enableEdit?: boolean) => string;
    addNewCellWithUniqueIdentifier: (type: CellType, description?: string, enableEdit?: boolean, uniqueIdentifier?: string, prompt?: string) => string;
    updateCellByUniqueIdentifier: (uniqueIdentifier: string, updates: Partial<Cell>) => boolean;
    addNewCell2Next: (type: CellType, description?: string, enableEdit?: boolean) => void;
    addNewContent2CurrentCell: (content: string) => void;

    // 单元格类型获取
    getCurrentCellType: () => CellType;

    // 输出检查
    checkOutputsIsError: (outputs: OutputItem[]) => boolean;
    checkCurrentCodeCellOutputsIsError: () => boolean;

    // 单元格元数据管理
    updateCellCanEdit: (cellId: string, isEditable: boolean) => void;
    updateCellMetadata: (cellId: string, metadata: Record<string, any>) => void;

    // 单元格类型转换
    convertCurrentCodeCellToHybridCell: () => void;
    convertToCodeCell: (cellId: string) => void;
    updateCellType: (cellId: string, newType: CellType) => void;

    // 历史代码获取
    getHistoryCode: () => string;
    getPhaseHistoryCode: (phaseId: string) => string;

    // 阶段和任务管理
    getPhaseById: (phaseId: string) => Phase | null;
    getTaskByPhaseId: (phaseId: string) => Task | null;

    // 视图相关
    getCurrentViewCells: () => Cell[];
    getCurrentStepCellsIDs: () => string[];
    getAllCellsBeforeCurrent: () => Cell[];
    getTotalSteps: () => number;

    // 独立窗口管理
    setDetachedCellId: (cellId: string | null) => void;
    getDetachedCell: () => Cell | null;
    toggleDetachedCellFullscreen: () => void;

    // 自动保存管理
    triggerAutoSave: () => void;
    loadFromDatabase: (notebookId: string) => Promise<boolean>;
    saveNow: () => Promise<void>;
}

/**
 * 完整的 Notebook Store 类型
 */
export type NotebookStore = NotebookStoreState & NotebookStoreActions;

// 序列化工具
const serializeOutput = (output: any): any => {
  if (!output) return null;

  if (Array.isArray(output)) {
    return output.map(serializeOutput);
  }

  const serialized = { ...output };

  if (typeof serialized.content === 'object' && serialized.content !== null) {
    try {
      serialized.content = JSON.stringify(serialized.content);
    } catch {
      serialized.content = String(serialized.content);
    }
  }

  return serialized;
};

// 反序列化工具
const deserializeOutput = (output: any): any => {
  if (!output) return null;

  if (Array.isArray(output)) {
    return output.map(deserializeOutput);
  }

  if (output.content && typeof output.content === 'string') {
    try {
      const parsed = JSON.parse(output.content);
      if (typeof parsed === 'object') {
        return { ...output, content: parsed };
      }
    } catch {
      // 保持为字符串
    }
  }

  return output;
};

// 辅助函数：更新单个单元格的输出
const updateCellOutputs = (set: any, cellId: string, outputs: OutputItem[]) => {
  const serializedOutputs = serializeOutput(outputs);

  set(
    produce((state: NotebookStoreState) => {
      const cell = state.cells.find((c) => c.id === cellId);
      if (cell) {
        if (serializedOutputs.length > 0) {
          if ((state as any).checkOutputsIsError(serializedOutputs)) {
            cell.outputs = [{
              content: "[error-message-for-debug]",
              timestamp: "",
              type: "text"
            }, ...serializedOutputs];
          }
          else {
            cell.outputs = [...serializedOutputs];
          }
        }
        else {
          cell.outputs = [{
            content: "[without-output]",
            timestamp: "",
            type: "text"
          }, ...serializedOutputs];
        }
      }
    })
  );
};

const useStore = create(
  subscribeWithSelector<NotebookStore>((set, get) => ({
    // ================= 原有状态(不变) =================
    notebookId: null,
    notebookTitle: '', // 默认标题
    cells: [
    ],
    tasks: [],
    currentPhaseId: null,
    currentStepIndex: 0,
    viewMode: 'create',
    currentCellId: null,
    isExecuting: false,
    currentRunningPhaseId: null,
    allowPagination: true,
    lastAddedCellId: null,

    error: null,
    isCollapsed: true,
    uploadMode: 'unrestricted',
    allowedTypes: [],
    maxFiles: null,
    isRightSidebarCollapsed: false,
    editingCellId: null,

    whatPurposeOfThisNotebook: null,
    whatHaveWeDone: null,
    whatIsOurCurrentWork: null,

    // 新增 showButtons 状态
    showButtons: {},
    
    // 独立窗口状态
    detachedCellId: null,
    isDetachedCellFullscreen: false,
    
    // 初始化状态
    isInitialized: false,

    getCurrentCellId: () => get().currentCellId,
    getCurrentCell: () => {
      const state = get();
      return state.cells.find((c) => c.id === state.currentCellId);
    },

    // 新增蛇设置所有的markdown cell为预览
    setEditingCellId2NULL: () => {set({editingCellId:null})},

    // ================ 原有 Actions (不变) ================
    setEditingCellId: (id: string | null) => set({ editingCellId: id }),
    setError: (error: string | null) => set({ error }),
    setIsCollapsed: (isCollapsed: boolean) => set({ isCollapsed }),
    setLastAddedCellId: (id: string | null) => set({ lastAddedCellId: id }),
    setUploadMode: (uploadMode: UploadMode) => set({ uploadMode }),
    setAllowedTypes: (allowedTypes: string[]) => set({ allowedTypes }),
    setMaxFiles: (maxFiles: number | null) => set({ maxFiles }),
    setIsRightSidebarCollapsed: (isRightSidebarCollapsed: boolean) =>
      set({ isRightSidebarCollapsed }),
    setNotebookId: (id: string | null) => set({ notebookId: id }),
    setNotebookTitle: (title: string) => set((state) => ({
      notebookTitle: title,
      cells: state.cells.map((cell, index) => 
        index === 0 && cell.metadata?.isDefaultTitle 
          ? { ...cell, content: `# ${title}` }
          : cell
      )
    })),
    setCurrentPhase: (phaseId: string | null) =>
      set({ currentPhaseId: phaseId, currentStepIndex: 0 }),
    setCurrentStepIndex: (index: number) => set({ currentStepIndex: index }),
    setCurrentCell: (cellId: string | null) => set({ currentCellId: cellId }),
    setCurrentRunningPhaseId: (phaseId: string | null) => set({ currentRunningPhaseId: phaseId }),
    setAllowPagination: (allow: boolean) => set({ allowPagination: allow }),
    setShowButtons: (cellId: string, value: boolean) =>
      set(
        produce((state: NotebookStoreState) => {
          state.showButtons[cellId] = value;
        })
      ),

    clearCells: () => {
      const titleCell: Cell = {
        id: uuidv4(),
        type: 'markdown',
        content: '# Untitled',
        outputs: [],
        enableEdit: true,
        phaseId: null,
        description: null,
        metadata: { isDefaultTitle: true }
      };
      const tasks = parseMarkdownCells([titleCell] as any);
      updateCellsPhaseId([titleCell] as any, tasks);
      set({ cells: [titleCell], tasks, currentRunningPhaseId: null });
    },
    clearAllOutputs: () =>
      set(
        produce((state: NotebookStoreState) => {
          state.cells.forEach((cell) => {
            cell.outputs = [];
          });
        })
      ),
    clearCellOutputs: (cellId: string) =>
      set(
        produce((state: NotebookStoreState) => {
          const cell = state.cells.find((c) => c.id === cellId);
          if (cell) {
            cell.outputs = [];
          }
        })
      ),

    setCells: (cells: Cell[]) => {
      notebookLog.cellOperation('setCells', 'batch', {
        cellsCount: cells.length,
        cellTypes: cells.map(c => ({ id: c.id, type: c.type, contentLength: c.content?.length || 0 })),
        stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
      });
      
      let processedCells = cells.map((cell) => ({
        ...cell,
        content: typeof cell.content === 'string' ? cell.content : String(cell.content || ''),
        outputs: serializeOutput(cell.outputs || []),
      }));
      
      notebookLog.info('Processed cells', {
        originalCount: cells.length,
        processedCount: processedCells.length,
        processedTypes: processedCells.map(c => ({ id: c.id, type: c.type, contentLength: c.content?.length || 0 }))
      });
      
      // 只有在完全没有cells时才添加默认标题
      if (processedCells.length === 0) {
        notebookLog.cellOperation('create', 'title', { reason: 'empty cells array' });
        const titleCell: Cell = {
          id: uuidv4(),
          type: 'markdown',
          content: '# Untitled',
          outputs: [],
          enableEdit: true,
          phaseId: null,
          description: null,
          metadata: { isDefaultTitle: true }
        };
        processedCells.unshift(titleCell as any);
        notebookLog.cellOperation('create', titleCell.id, { type: 'title', content: titleCell.content });
      } else {
        notebookLog.debug('Cells not empty - keeping existing cells');
      }
      
      const tasks = parseMarkdownCells(processedCells as any);
      updateCellsPhaseId(processedCells as any, tasks);
      
      notebookLog.info('setCells final update', {
        finalCellsCount: processedCells.length,
        finalTasksCount: tasks.length,
        finalCells: processedCells.map(c => ({ id: c.id, type: c.type, content: c.content?.substring(0, 50) + '...' }))
      });
      
      set({ cells: processedCells, tasks, isInitialized: true });
    },

    updateCurrentCellWithContent: (content: string) => {
      const currentCellId = get().currentCellId;
      if (!currentCellId) {
        notebookLog.error('No selected cell available');
        return;
      }
      get().updateCell(currentCellId, content);
    },

    addCell: (newCell: Partial<Cell>, index?: number) =>
      set(
        produce((state: NotebookStoreState) => {
          // 更精确的标题检查 - 只在完全空白的notebook中添加默认标题
          const hasAnyTitleCell = state.cells.some(cell => 
            cell.type === 'markdown' && 
            cell.content.trim().startsWith('#') &&
            cell.content.trim().length > 1 // 确保不只是一个#
          );
          
          notebookLog.debug('addCell title check', {
            cellsLength: state.cells.length,
            hasAnyTitleCell,
            newCellType: newCell.type,
            newCellContent: newCell.content?.substring(0, 30)
          });
          
          // 如果 notebook 为空且即将插入的并非 H1 标题，则先插入默认标题
          const isNotebookEmpty = state.cells.length === 0;
          const firstCellIsTitle = newCell.type === 'markdown' && typeof newCell.content === 'string' && newCell.content.trim().startsWith('#');
          if (isNotebookEmpty && !firstCellIsTitle) {
            notebookLog.cellOperation('create', 'title', { reason: 'notebook empty, no title cell' });
            const titleCell: Cell = {
              id: uuidv4(),
              type: 'markdown',
              content: '# Untitled',
              outputs: [],
              enableEdit: true,
              phaseId: null,
              description: null,
              metadata: { isDefaultTitle: true }
            };
            state.cells.unshift(titleCell);
          }
          
          // 计算插入位置 - 简化逻辑
          const hasDefaultTitle = state.cells[0]?.metadata?.isDefaultTitle === true;
          let targetIndex: number;
          
          if (index === undefined) {
            // 未指定 index -> 追加到末尾
            targetIndex = state.cells.length;
          } else {
            // 指定了 index -> 若有默认标题，至少从 1 开始，避免插到标题前面
            targetIndex = hasDefaultTitle ? Math.max(1, index) : index;
          }
          // 防止越界
          targetIndex = Math.min(targetIndex, state.cells.length);
          const cell: Cell = {
            id: newCell.id || uuidv4(),
            type: newCell.type || 'markdown',
            content:
              typeof newCell.content === 'string'
                ? newCell.content
                : String(newCell.content || ''),
            outputs: serializeOutput(newCell.outputs || []),
            enableEdit: newCell.enableEdit ?? true,
            phaseId: newCell.phaseId || null,
            description: newCell.description || null,
            metadata: newCell.metadata || null,
          };
          const isNewCellTitle = cell.type === 'markdown' && cell.content.trim().startsWith('#');
          if (hasDefaultTitle && targetIndex <= 1 && isNewCellTitle) {
            const defaultCell = state.cells[0];
            state.cells[0] = {
              ...defaultCell,
              ...cell,
              metadata: { ...(cell.metadata || {}), isDefaultTitle: false },
              id: defaultCell.id, // 保持原 id，便于引用
            } as Cell;
          } else {
            state.cells.splice(targetIndex, 0, cell);
          }
          

          const needsReparse = cell.type === 'markdown' && 
            (cell.content.includes('#') || state.tasks.length === 0);
            
          if (needsReparse) {
            const updatedTasks = parseMarkdownCells(state.cells as any) as any;
            updateCellsPhaseId(state.cells as any, updatedTasks);
            state.tasks = updatedTasks;
          } else {
            notebookLog.debug('Skipping tasks re-parsing for non-title cell');
          }
          
          state.currentCellId = cell.id;

          if (!state.currentPhaseId) {
            const firstPhase = state.tasks[0]?.phases[0];
            if (firstPhase) {
              state.currentPhaseId = firstPhase.id;
              state.currentStepIndex = 0;
            }
          } else {
            const currentPhase = state.tasks
              .flatMap((task) => task.phases)
              .find((p) => p.id === state.currentPhaseId);
            if (!currentPhase) {
              const firstPhase = state.tasks[0]?.phases[0];
              if (firstPhase) {
                state.currentPhaseId = firstPhase.id;
                state.currentStepIndex = 0;
              }
            }
          }

          const currentPhase = state.tasks
            .flatMap((task) => task.phases)
            .find((p) => p.id === state.currentPhaseId);
          if (currentPhase) {
            if (state.currentStepIndex >= currentPhase.steps.length) {
              state.currentStepIndex = currentPhase.steps.length - 1;
            }
          }
        })
      ),

    updateTitle: (title: string) => set(
      // 判断cell列表是否为空
      produce((state: NotebookStoreState) => {
        if (!title) {
          notebookLog.warn('Notebook title cannot be empty');
          return;
        }

        if (state.cells.length == 0) {
          state.cells.push({ 
            id: uuidv4(), 
            type: 'markdown', 
            content: `# ${title}`,
            outputs: [],
            enableEdit: true,
            phaseId: null
          });
        }
        else {
          // 找到第一个markdown cell
          const cell = state.cells.find((c) => c.type == 'markdown');
          if (cell) {
            cell.content = `# ${title}`;
          } 
        }
      })
    ),

    updateCurrentCellDescription: (description: string) =>
      set(
        produce((state: NotebookStoreState) => {
          const cell = state.cells.find((c) => c.id === state.currentCellId);
          if (cell) {
            cell.description = description;
          }
        })
      ),

    addNewContent2CurrentCellDescription: (content: string) => {
      const currentCellId = get().currentCellId;
      if (!currentCellId) {
        return;
      }
      const currentCell = get().cells.find((c) => c.id === currentCellId);
      if (!currentCell) {
        return;
      }
      const updatedDescription = `${currentCell.description || ''}${content}`;
      get().updateCurrentCellDescription(updatedDescription);
      showToast({
        message: `内容已添加到单元格 ${currentCellId} 的描述`,
        type: 'success',
      });
    },

    deleteCell: (cellId: string) =>
      set(
        produce((state: NotebookStoreState) => {
          const cellToDelete = state.cells.find((c) => c.id === cellId);
          
          // 防止删除默认标题cell
          if (cellToDelete?.metadata?.isDefaultTitle) {
            return; // 直接返回，不删除
          }
          
          state.cells = state.cells.filter((cell) => cell.id !== cellId);
          const updatedTasks = parseMarkdownCells(state.cells as any) as any;
          updateCellsPhaseId(state.cells as any, updatedTasks);
          state.tasks = updatedTasks;

          if (cellToDelete && cellToDelete.phaseId === state.currentPhaseId) {
            const phaseCellsResult = findCellsByPhase(
              state.tasks as any,
              state.currentPhaseId!
            );
            const hasCells = phaseCellsResult.intro.length > 0 || phaseCellsResult.steps.length > 0;
            if (!hasCells) {
              state.currentPhaseId = null;
              state.currentStepIndex = 0;

              const firstPhase = state.tasks[0]?.phases[0];
              if (firstPhase) {
                state.currentPhaseId = firstPhase.id;
                state.currentStepIndex = 0;
              }
            } else {
              const currentPhase = state.tasks
                .flatMap((task) => task.phases)
                .find((p) => p.id === state.currentPhaseId);
              if (currentPhase) {
                if (state.currentStepIndex >= currentPhase.steps.length) {
                  state.currentStepIndex = currentPhase.steps.length - 1;
                }
              }
            }
          }

          if (state.currentCellId === cellId) {
            state.currentCellId = null;
          }

          delete state.showButtons[cellId];
        })
      ),

    updateCell: (cellId: string, newContent: string) =>
      set(
        produce((state: NotebookStoreState) => {
          const cell = state.cells.find((c) => c.id === cellId);
          if (cell) {
            const content = typeof newContent === 'string' ? newContent : String(newContent || '');
            cell.content = content;
            
            // 如果是默认标题cell，同步更新notebookTitle
            if (cell.metadata?.isDefaultTitle) {
              // 提取H1标题文本，去掉"# "前缀
              const titleMatch = content.match(/^#\s*(.*)$/);
              const title = titleMatch ? titleMatch[1].trim() : content.replace(/^#\s*/, '').trim();
              state.notebookTitle = title || 'Untitled';
            }
          }
          // 重新解析 markdown cells 并更新 tasks，同时确保 phaseId 被正确设置
          const updatedTasks = parseMarkdownCells(state.cells as any) as any;
          state.tasks = updatedTasks;
          // 更新 cells 的 phaseId 以确保与 tasks 中的 phase ID 一致
          updateCellsPhaseId(state.cells as any, updatedTasks);
        })
      ),

    updateCellOutputs: (cellId: string, outputs: OutputItem[]) => {
      updateCellOutputs(set, cellId, outputs);
    },

    moveCellToIndex: (fromIndex: number, toIndex: number) => {
      set(
        produce((state: NotebookStoreState) => {
          if (fromIndex < 0 || toIndex < 0 || 
              fromIndex >= state.cells.length || toIndex >= state.cells.length ||
              fromIndex === toIndex) {
            return;
          }
          
          // 移动cell
          const [movedCell] = state.cells.splice(fromIndex, 1);
          state.cells.splice(toIndex, 0, movedCell);
          
          notebookLog.cellOperation('move', 'batch', {
            from: fromIndex,
            to: toIndex,
            cellId: movedCell.id,
            totalCells: state.cells.length
          });
        }),
        false,
      );
    },

    setViewMode: (mode: ViewMode) =>
      set(
        produce((state: NotebookStoreState) => {
          state.viewMode = mode;
          // 当进入分步或演示模式时，如果当前step为空/无效，默认跳到第一个step
          if ((mode === 'step' || mode === 'demo') && state.tasks.length > 0) {
            // 若没有选中的phase，默认选择第一个phase
            if (!state.currentPhaseId) {
              const firstTask = state.tasks[0];
              if (firstTask && firstTask.phases.length > 0) {
                state.currentPhaseId = firstTask.phases[0].id;
                state.currentStepIndex = 0;
              }
            } else {
              // 如果已有phase但当前step越界或为空，则重置到该phase的第一个step
              const phase = (state.tasks as any)
                .flatMap((t: any) => t.phases)
                .find((p: any) => p.id === state.currentPhaseId);
              const stepsLen = phase?.steps?.length || 0;
              if (stepsLen === 0 || state.currentStepIndex >= stepsLen || state.currentStepIndex < 0) {
                state.currentStepIndex = 0;
              }
            }
          }
        })
      ),

    toggleViewMode: () =>
      set(
        produce((state: NotebookStoreState) => {
          state.viewMode = state.viewMode === 'create' ? 'step' : 'create';
          if (state.viewMode === 'step' && !state.currentPhaseId && state.tasks.length > 0) {
            const firstTask = state.tasks[0];
            if (firstTask.phases.length > 0) {
              state.currentPhaseId = firstTask.phases[0].id;
              state.currentStepIndex = 0;
            }
          }
        })
      ),

    runSingleCell: async (cellId: string): Promise<RunResult> => {
      const { notebookId } = get();
      if (!notebookId) {
        showToast({
          message: '未找到笔记本 ID',
          type: 'error',
        });
        return { success: false, error: 'Notebook ID not found' };
      }

      // 调用 codeStore.executeCell(cellId)
      const result = await useCodeStore.getState().executeCell(cellId);
      if (!result.success) {
        showToast({
          message: `单元格 ${cellId} 执行失败: ${result.error}`,
          type: 'error',
        });
      }
      return result;
    },

    runAllCells: async (): Promise<void> => {
      const state = get();
      const { notebookId } = state;

      if (!notebookId) {
        showToast({
          message: '未找到笔记本 ID',
          type: 'error',
        });
        return;
      }

      set({ isExecuting: true, currentRunningPhaseId: null });

      try {
        get().clearAllOutputs();

        const tasks = parseMarkdownCells(state.cells as any) as any;
        updateCellsPhaseId(state.cells as any, tasks);
        set({ tasks });

        const codeCells = state.cells.filter((cell) => cell.type === 'code');

        for (const cell of codeCells) {
          const phase = tasks
            .flatMap((task: any) => task.phases)
            .find((p: any) => p.id === cell.phaseId);
          if (phase && phase.id !== state.currentRunningPhaseId) {
            set({ currentRunningPhaseId: phase.id });
          }

          const result = await get().runSingleCell(cell.id);

          if (!result.success) {
            break;
          }
        }
      } finally {
        set({ isExecuting: false, currentRunningPhaseId: null });
      }
    },

    runCurrentCodeCell: async (): Promise<void> => {
      const state = get();
      const currentCellId = state.currentCellId;
      if (!currentCellId) {
        showToast({
          message: '当前没有选中的单元格',
          type: 'error',
        });
        return;
      }
      const currentCell = state.cells.find((c) => c.id === currentCellId);
      if (!currentCell) {
        showToast({
          message: '找不到当前选中的单元格',
          type: 'error',
        });
        return;
      }
      if (currentCell.type !== 'code') {
        showToast({
          message: '当前选中的单元格不是代码单元格',
          type: 'error',
        });
        return;
      }
      await get().runSingleCell(currentCellId);
    },

    addNewCell2End: (type: CellType, description: string = '', enableEdit: boolean = true): string => {
      const newCell: Partial<Cell> = {
        id: uuidv4(),
        type: type,
        content: '',
        outputs: [],
        enableEdit: enableEdit,
        phaseId: get().currentRunningPhaseId || null,
        description: description,
      };
      get().addCell(newCell);
      set({ lastAddedCellId: newCell.id! });
      if (enableEdit) {
        set({ editingCellId: newCell.id! });
      }
      set({ currentCellId: newCell.id! });

      const state = get();
      if (!state.currentPhaseId) {
        const firstPhase = state.tasks[0]?.phases[0];
        if (firstPhase) {
          set({ currentPhaseId: firstPhase.id, currentStepIndex: 0 });
        }
      }

      showToast({
        message: `新建 ${type} 单元格已添加`,
        type: 'success',
      });
      
      return newCell.id!;
    },

    // 新增：基于唯一标识符的cell创建和更新方法
    addNewCellWithUniqueIdentifier: (
      type: CellType, 
      description: string = '', 
      enableEdit: boolean = true,
      uniqueIdentifier?: string,
      prompt?: string
    ): string => {
      const timestamp = Date.now();
      
      // 生成唯一标识符：时间戳 + 提示词hash（如果有的话）
      const identifier = uniqueIdentifier || (() => {
        let id = `gen-${timestamp}`;
        if (prompt) {
          // 简单hash提示词的前20个字符
          const promptHash = prompt.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          id += `-${promptHash}`;
        }
        return id;
      })();
      
      const newCell: Partial<Cell> = {
        id: uuidv4(),
        type: type,
        content: '',
        outputs: [],
        enableEdit: enableEdit,
        phaseId: get().currentRunningPhaseId || null,
        description: description,
        metadata: {
          uniqueIdentifier: identifier,
          generationTimestamp: timestamp,
          prompt: prompt || undefined,
          isGenerating: true,
          generationType: type === 'image' ? 'image' : undefined
        }
      };
      
      get().addCell(newCell);
      set({ lastAddedCellId: newCell.id! });
      if (enableEdit) {
        set({ editingCellId: newCell.id! });
      }
      set({ currentCellId: newCell.id! });

      const state = get();
      if (!state.currentPhaseId) {
        const firstPhase = state.tasks[0]?.phases[0];
        if (firstPhase) {
          set({ currentPhaseId: firstPhase.id, currentStepIndex: 0 });
        }
      }

      showToast({
        message: `新建 ${type} 单元格已添加`,
        type: 'success',
      });
      
      return newCell.id!;
    },

    // 新增：基于唯一标识符查找并更新cell
    updateCellByUniqueIdentifier: (
      uniqueIdentifier: string,
      updates: Partial<Cell>
    ): boolean => {
      const state = get();
      const targetCell = state.cells.find(cell => 
        cell.metadata?.uniqueIdentifier === uniqueIdentifier
      );
      
      if (targetCell) {
        // 合并metadata
        if (updates.metadata) {
          updates.metadata = {
            ...targetCell.metadata,
            ...updates.metadata
          };
        }
        
        // 使用现有的updateCell方法
        if (updates.content !== undefined) {
          get().updateCell(targetCell.id, updates.content);
        }
        
        if (updates.metadata) {
          get().updateCellMetadata(targetCell.id, updates.metadata);
        }
        
        return true;
      } else {
        notebookLog.warn('Cell not found', { uniqueIdentifier });
        return false;
      }
    },

    addNewCell2Next: (type: CellType, description: string = '', enableEdit: boolean = true) => {
      const newCell: Partial<Cell> = {
        id: uuidv4(),
        type: type,
        content: '',
        outputs: [],
        enableEdit: enableEdit,
        phaseId: get().currentRunningPhaseId || null,
        description: description,
      };
      const currentCellIndex = get().cells.findIndex(
        (c) => c.id === get().currentCellId
      );
      get().addCell(newCell, currentCellIndex + 1);
      set({ lastAddedCellId: newCell.id! });
      set({ editingCellId: newCell.id! });
      set({ currentCellId: newCell.id! });

      const state = get();
      if (!state.currentPhaseId) {
        const firstPhase = state.tasks[0]?.phases[0];
        if (firstPhase) {
          set({ currentPhaseId: firstPhase.id, currentStepIndex: 0 });
        }
      }

      showToast({
        message: `新建 ${type} 单元格已添加`,
        type: 'success',
      });
    },

    addNewContent2CurrentCell: (content: string) => {
      const currentCellId = get().currentCellId;
      if (!currentCellId) {
        showToast({
          message: '当前没有选中的单元格',
          type: 'error',
        });
        return;
      }
      const currentCell = get().cells.find((c) => c.id === currentCellId);
      if (!currentCell) {
        showToast({
          message: '找不到当前选中的单元格',
          type: 'error',
        });
        return;
      }
      const updatedContent = `${currentCell.content}${content}`;
      get().updateCell(currentCellId, updatedContent);
      showToast({
        message: `内容已添加到单元格 ${currentCellId}`,
        type: 'success',
      });
    },

    getCurrentCellType: (): CellType => {
      const state = get();
      const currentCell = state.cells.find((c) => c.id === state.currentCellId);
      return currentCell ? currentCell.type : 'markdown';
    },

    checkOutputsIsError: (outputs: OutputItem[]): boolean => {
      for (let i = 0; i < outputs.length; i++) {
        if (outputs[i].type === 'error') {
          return true;
        }
      }
      return false;
    },

    checkCurrentCodeCellOutputsIsError: (): boolean => {
      const currentCell = get().getCurrentCell();
      if (!currentCell) {
        notebookLog.warn('No current cell found - cannot check code cell outputs');
        return false;
      }
      if (currentCell.type !== 'code') {
        notebookLog.warn('Current cell is not a code cell - cannot check outputs');
        return false;
      }
      for (let i = 0; i < (currentCell.outputs?.length || 0); i++) {
        if (currentCell.outputs && currentCell.outputs[i].type === 'error') {
          return true;
        }
      }
      return false;
    },

    // 添加更新单元格可编辑状态的函数
    updateCellCanEdit: (cellId: string, isEditable: boolean) => set(
      produce((state: NotebookStoreState) => {
        const cell = state.cells.find((c) => c.id === cellId);
        if (cell) {
          cell.enableEdit = isEditable;
        }
      })
    ),

    // 添加更新单元格元数据的函数
    updateCellMetadata: (cellId: string, metadata: Record<string, any>) => set(
      produce((state: NotebookStoreState) => {
        const cell = state.cells.find((c) => c.id === cellId);
        if (cell) {
          cell.metadata = {
            ...(cell.metadata || {}),
            ...metadata
          };
        }
      })
    ),

    convertCurrentCodeCellToHybridCell: () => set(
      produce((state: NotebookStoreState) => {
        const currentCell = state.cells.find((c) => c.id === state.currentCellId);

        if (!currentCell) {
          notebookLog.warn('No current cell found - cannot convert to Hybrid cell');
          return;
        }

        currentCell.type = 'hybrid';
      })
    ),

    // 在 useStore 的 actions 部分添加这个新函数
    convertToCodeCell: (cellId: string) =>
      set(
        produce((state: NotebookStoreState) => {
          const cell = state.cells.find((c) => c.id === cellId);
          if (cell) {
            // 解析内容中的代码块
            const lines = cell.content.split('\n');
            const codeBlockRegex = /^```(\w+)?$/;

            for (let i = 0; i < lines.length; i++) {
              if (codeBlockRegex.test(lines[i].trim())) {
                let codeContent = '';
                let j = i + 1;

                // 提取代码块内容
                while (j < lines.length && !codeBlockRegex.test(lines[j].trim())) {
                  codeContent += lines[j] + '\n';
                  j++;
                }

                // 更新单元格类型和内容
                cell.type = 'code';
                cell.content = codeContent.trim();
                break;
              }
            }
          }

          // 重新解析任务
          const updatedTasks = parseMarkdownCells(state.cells as any) as any;
          updateCellsPhaseId(state.cells as any, updatedTasks);
          state.tasks = updatedTasks;
        })
      ),

    // 通用的单元格类型更新方法
    updateCellType: (cellId: string, newType: CellType) =>
      set(
        produce((state: NotebookStoreState) => {
          const cell = state.cells.find((c) => c.id === cellId);
          if (cell) {
            cell.type = newType;

            // 重新解析任务
            const updatedTasks = parseMarkdownCells(state.cells as any) as any;
            updateCellsPhaseId(state.cells as any, updatedTasks);
            state.tasks = updatedTasks;
          }
        })
      ),

    getHistoryCode: (): string => {
      const state = get();
      const codeCells = state.cells.filter(
        (cell) => cell.id !== state.currentCellId && cell.type === 'code'
      );
      const codeCellsBeforeCurrent = [];
      for (const cell of codeCells) {
        if (cell.id === state.currentCellId) {
          break;
        }
        codeCellsBeforeCurrent.push(cell.content);
      }
      const historyCode = codeCellsBeforeCurrent.join('\n');
      return historyCode;
    },

    getPhaseHistoryCode: (phaseId: string): string => {
      const state = get();
      const codeCells = state.cells.filter(
        (cell) => cell.phaseId === phaseId && cell.type === 'code'
      );
      const codeCellsBeforeCurrent = [];
      for (const cell of codeCells) {
        if (cell.id === state.currentCellId) {
          break;
        }
        codeCellsBeforeCurrent.push(cell.content);
      }
      const historyCode = codeCellsBeforeCurrent.join('\n');
      return historyCode;
    },

    getPhaseById: (phaseId: string): Phase | null => {
      const state = get();
      return (
        state.tasks
          .flatMap((task) => task.phases)
          .find((phase) => phase.id === phaseId) || null
      );
    },

    getTaskByPhaseId: (phaseId: string): Task | null => {
      const state = get();
      return (
        state.tasks.find((task) =>
          task.phases.some((phase) => phase.id === phaseId)
        ) || null
      );
    },

    getCurrentViewCells: (): Cell[] => {
      const state = get();
      let cells: Cell[];

      if (state.viewMode === 'create' || !state.currentPhaseId) {
        cells = state.cells;
      } else {
        const phase = get().getPhaseById(state.currentPhaseId);
        if (!phase || !phase.steps.length) {
          const phaseResult = findCellsByPhase(state.tasks as any, state.currentPhaseId);
          // findCellsByPhase返回PhaseResult，需要合并intro和steps中的cells
          cells = [...phaseResult.intro];
          phaseResult.steps.forEach(step => {
            if (step.content) {
              cells.push(...step.content);
            }
          });
        } else {
          const currentStep = phase.steps[state.currentStepIndex];
          if (!currentStep) return [];
          cells = findCellsByStep(
            state.tasks as any,
            state.currentPhaseId,
            currentStep.id,
            state.cells as any
          );
        }
      }

      // 确保cells是数组
      if (!Array.isArray(cells)) {
        notebookLog.error('getCurrentViewCells: cells is not an array', { cells });
        return [];
      }

      return cells.map((cell) => ({
        ...cell,
        outputs: deserializeOutput(cell.outputs),
      }));
    },

    getCurrentStepCellsIDs: (): string[] => {
      const state = get();
      const phase = get().getPhaseById(state.currentPhaseId!);
      if (!phase || !phase.steps.length) {
        return [];
      }
      const currentStep = phase.steps[state.currentStepIndex];
      if (!currentStep) return [];
      return findCellsByStep(
        state.tasks as any,
        state.currentPhaseId!,
        currentStep.id,
        state.cells as any
      ).map((cell) => cell.id);
    },

    getAllCellsBeforeCurrent: (): Cell[] => {
      const state = get();
      const { cells, currentCellId } = state;

      if (!currentCellId || !Array.isArray(cells)) {
        return [];
      }

      const currentIndex = cells.findIndex(cell => cell.id === currentCellId);

      if (currentIndex === -1) {
        return [];
      }

      // Return all cells before the current cell, deserializing their outputs
      return cells.slice(0, currentIndex).map(cell => ({
        ...cell,
        outputs: deserializeOutput(cell.outputs),
      }));
    },

    getTotalSteps: (): number => {
      const state = get();
      const phase = get().getPhaseById(state.currentPhaseId!);
      return phase ? phase.steps.length : 0;
    },

    // 独立窗口管理
    setDetachedCellId: (cellId: string | null) => set({ 
      detachedCellId: cellId,
      isDetachedCellFullscreen: false // 重置为分屏模式
    }),
    getDetachedCell: (): Cell | null => {
      const state = get();
      if (!state.detachedCellId) return null;
      return state.cells.find(cell => cell.id === state.detachedCellId) || null;
    },
    toggleDetachedCellFullscreen: () => set((state) => ({ 
      isDetachedCellFullscreen: !state.isDetachedCellFullscreen 
    })),

    // 自动保存功能
    triggerAutoSave: () => {
      const state = get();
      if (!state.notebookId) {
        storeLog.debug('Auto-save skipped: no notebookId');
        return;
      }

      // Skip auto-save if notebook is not fully initialized
      if (!state.isInitialized) {
        storeLog.debug('Auto-save skipped: notebook not initialized', {
          notebookId: state.notebookId,
          cellsCount: state.cells?.length || 0,
          isInitialized: state.isInitialized
        });
        return;
      }

      notebookAutoSaveInstance.queueSave({
        notebookId: state.notebookId,
        notebookTitle: state.notebookTitle,
        cells: state.cells,
        tasks: state.tasks,
        timestamp: Date.now()
      }).catch(error => {
        storeLog.error('Failed to queue save', { error });
      });
    },

    loadFromDatabase: async (notebookId: string): Promise<boolean> => {
      try {
        notebookLog.lifecycleEvent('load', notebookId, { source: 'database' });
        
        const result = await NotebookAutoSave.loadNotebook(notebookId);
        if (!result) {
          notebookLog.warn('Notebook not found in database', { notebookId });
          return false;
        }

        const { notebookTitle, cells, tasks } = result;
        notebookLog.info('Loaded notebook data', { 
          title: notebookTitle, 
          cellsCount: cells.length, 
          tasksCount: tasks.length 
        });

        // 基于导入文件的思路，完整设置notebook状态
        // 1. 清空当前状态 (类似导入时的处理)
        set({ 
          cells: [], 
          tasks: [], 
          currentRunningPhaseId: null,
          currentPhaseId: null,
          currentStepIndex: 0,
          error: null
        });

        // 2. 设置基本信息
        set({
          notebookId,
          notebookTitle,
          viewMode: 'create', // 重置视图模式
        });

        // 3. 逐个添加cells (类似导入文件中的处理)
        if (cells && cells.length > 0) {
          // 直接设置所有cells，确保保持原有的ID和结构
          set({ cells: [...cells] });
          notebookLog.cellOperation('setCells', 'batch', { count: cells.length });
        } else {
          // 如果没有cells，创建默认标题cell
          const defaultCell = {
            id: `title-${Date.now()}`,
            type: 'markdown' as const,
            content: `# ${notebookTitle}`,
            outputs: [],
            enableEdit: true,
          };
          set({ cells: [defaultCell] });
          notebookLog.cellOperation('create', 'title', { reason: 'default creation' });
        }

        // 4. 设置tasks和其他状态
        if (tasks && tasks.length > 0) {
          set({ 
            tasks,
            currentPhaseId: tasks[0]?.phases?.[0]?.id || null,
          });
        }

        // 5. 设置当前cell
        const finalCells = get().cells;
        if (finalCells.length > 0) {
          set({ currentCellId: finalCells[0].id });
        }

        notebookLog.lifecycleEvent('load', notebookId, { status: 'success', cellCount: finalCells.length });
        
        showToast({
          message: `已加载笔记本: ${notebookTitle}`,
          type: 'success',
        });

        return true;
      } catch (error) {
        notebookLog.error('Failed to load notebook', { notebookId, error });
        
        showToast({
          message: `加载笔记本失败: ${error}`,
          type: 'error',
        });

        return false;
      }
    },

    saveNow: async (): Promise<void> => {
      const state = get();
      if (!state.notebookId) {
        return;
      }

      try {
        await notebookAutoSaveInstance.saveNow({
          notebookId: state.notebookId,
          notebookTitle: state.notebookTitle,
          cells: state.cells,
          tasks: state.tasks,
          timestamp: Date.now()
        });

        showToast({
          message: '笔记本已保存',
          type: 'success',
        });
      } catch (error) {
        notebookLog.error('Failed to save notebook', { error });
        
        showToast({
          message: `保存失败: ${error}`,
          type: 'error',
        });
      }
    },
  }))
);

// 设置自动保存订阅
useStore.subscribe(
  (state) => ({
    notebookId: state.notebookId,
    notebookTitle: state.notebookTitle,
    cells: state.cells,
    tasks: state.tasks
  }),
  async (current, previous) => {
    // 只有在notebook存在且内容发生实际变化时才触发保存
    if (!current.notebookId) return;
    
    // 初次加载时不触发保存
    if (!previous.notebookId && current.notebookId) return;
    
    // 检查是否有实际内容变化
    const hasChanges = 
      current.notebookTitle !== previous.notebookTitle ||
      current.cells.length !== previous.cells.length ||
      current.tasks.length !== previous.tasks.length ||
      JSON.stringify(current.cells) !== JSON.stringify(previous.cells) ||
      JSON.stringify(current.tasks) !== JSON.stringify(previous.tasks);
    
    if (hasChanges) {
      notebookLog.info('Notebook content changed - triggering auto-save');
      
      // Initialize auto-save service if needed
      try {
        await notebookAutoSaveInstance.initialize();
        
        // Queue the save with current state
        await notebookAutoSaveInstance.queueSave({
          notebookId: current.notebookId,
          notebookTitle: current.notebookTitle,
          cells: current.cells,
          tasks: current.tasks,
          timestamp: Date.now()
        });
      } catch (error) {
        notebookLog.error('Auto-save failed', { error });
      }
    }
  }
);

export default useStore;