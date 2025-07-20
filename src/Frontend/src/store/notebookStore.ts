// store/notebookStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { parseMarkdownCells, findCellsByPhase, findCellsByStep } from '../utils/markdownParser';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '../components/UI/Toast';
import { produce } from 'immer';

import useCodeStore from './codeStore';

/**
 * 单元格类型
 */
export type CellType = 'code' | 'markdown' | 'Hybrid';

/**
 * 视图模式类型
 */
export type ViewMode = 'complete' | 'step';

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
    outputs: OutputItem[];
    enableEdit: boolean;
    phaseId: string | null;
    description?: string | null;
    metadata?: Record<string, any>;
}

/**
 * 步骤接口
 */
export interface Step {
    id: string;
    title: string;
    content: string;
    cellIds: string[];
}

/**
 * 阶段接口
 */
export interface Phase {
    id: string;
    title: string;
    steps: Step[];
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

    // 视图模式管理
    setViewMode: (mode: ViewMode) => void;
    toggleViewMode: () => void;

    // 代码执行
    runSingleCell: (cellId: string) => Promise<RunResult>;
    runAllCells: () => Promise<void>;
    runCurrentCodeCell: () => Promise<void>;

    // 单元格创建
    addNewCell2End: (type: CellType, description?: string, enableEdit?: boolean) => void;
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
  console.log('updateCellOutputs', outputs);

  set(
    produce((state: NotebookStoreState) => {
      const cell = state.cells.find((c) => c.id === cellId);
      if (cell) {
        console.log(serializedOutputs);
        console.log(serializedOutputs.length);
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

const useStore = create<NotebookStore>(
  subscribeWithSelector((set, get) => ({
    // ================= 原有状态(不变) =================
    notebookId: null,
    cells: [],
    tasks: [],
    currentPhaseId: null,
    currentStepIndex: 0,
    viewMode: 'complete',
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

    clearCells: () => set({ cells: [], tasks: [], currentRunningPhaseId: null }),
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
      const tasks = parseMarkdownCells(cells);
      const serializedCells = cells.map((cell) => ({
        ...cell,
        content: typeof cell.content === 'string' ? cell.content : String(cell.content || ''),
        outputs: serializeOutput(cell.outputs || []),
      }));
      set({ cells: serializedCells, tasks });
    },

    updateCurrentCellWithContent: (content: string) => {
      const currentCellId = get().currentCellId;
      if (!currentCellId) {
        console.error('当前没有选中的单元格');
        return;
      }
      get().updateCell(currentCellId, content);
    },

    addCell: (newCell: Partial<Cell>, index?: number) =>
      set(
        produce((state: NotebookStoreState) => {
          const targetIndex = index ?? state.cells.length;
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
          };
          state.cells.splice(targetIndex, 0, cell);
          state.tasks = parseMarkdownCells(state.cells);
          // console.log('addCell', state.tasks);
          if (state.tasks.length == 0) {
            console.log('addCell and temp tasks is null');
            state.cells.splice(targetIndex, 0, {
              id: uuidv4(),
              type: 'markdown',
              content: '# Untitled',
              outputs: [],
              enableEdit: true,
              phaseId: null,
            });
            state.tasks = parseMarkdownCells(state.cells);
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
          console.warn('标题不能为空');
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
        console.log({
          message: '当前没有选中的单元格',
          type: 'error',
        });
        return;
      }
      const currentCell = get().cells.find((c) => c.id === currentCellId);
      if (!currentCell) {
        console.log({
          message: '找不到当前选中的单元格',
          type: 'error',
        });
        return;
      }
      const updatedDescription = `${currentCell.description || ''}${content}`;
      get().updateCurrentCellDescription(updatedDescription);
      showToast({
        message: `内容已添加到单元格 ${currentCellId} 的描述`,
        type: 'success',
      });
      // console.log(currentCell.description);
    },

    deleteCell: (cellId: string) =>
      set(
        produce((state: NotebookStoreState) => {
          const cellToDelete = state.cells.find((c) => c.id === cellId);
          state.cells = state.cells.filter((cell) => cell.id !== cellId);
          state.tasks = parseMarkdownCells(state.cells);

          if (cellToDelete && cellToDelete.phaseId === state.currentPhaseId) {
            const currentPhaseCells = findCellsByPhase(
              state.tasks,
              state.currentPhaseId
            );
            if (currentPhaseCells.length === 0) {
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
            cell.content =
              typeof newContent === 'string'
                ? newContent
                : String(newContent || '');
          }
          state.tasks = parseMarkdownCells(state.cells);
        })
      ),

    updateCellOutputs: (cellId: string, outputs: OutputItem[]) => {
      updateCellOutputs(set, cellId, outputs);
    },

    setViewMode: (mode: ViewMode) =>
      set(
        produce((state: NotebookStoreState) => {
          state.viewMode = mode;
          if (mode === 'step' && !state.currentPhaseId && state.tasks.length > 0) {
            const firstTask = state.tasks[0];
            if (firstTask.phases.length > 0) {
              state.currentPhaseId = firstTask.phases[0].id;
              state.currentStepIndex = 0;
            }
          }
        })
      ),

    toggleViewMode: () =>
      set(
        produce((state: NotebookStoreState) => {
          state.viewMode = state.viewMode === 'complete' ? 'step' : 'complete';
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

        const tasks = parseMarkdownCells(state.cells);
        set({ tasks });

        const codeCells = state.cells.filter((cell) => cell.type === 'code');

        for (const cell of codeCells) {
          const phase = tasks
            .flatMap((task) => task.phases)
            .find((p) => p.id === cell.phaseId);
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

    addNewCell2End: (type: CellType, description: string = '', enableEdit: boolean = true) => {
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
        console.warn('No current cell found, cannot check current code cell outputs.');
        return false;
      }
      if (currentCell.type !== 'code') {
        console.warn('Current cell is not a code cell, cannot check current code cell outputs.');
        return false;
      }
      for (let i = 0; i < currentCell.outputs.length; i++) {
        if (currentCell.outputs[i].type === 'error') {
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
          console.warn('No current cell found, cannot convert current code cell to Hybrid cell.');
          return;
        }

        currentCell.type = 'Hybrid';
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
          state.tasks = parseMarkdownCells(state.cells);
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

      if (state.viewMode === 'complete' || !state.currentPhaseId) {
        cells = state.cells;
      } else {
        const phase = get().getPhaseById(state.currentPhaseId);
        if (!phase || !phase.steps.length) {
          cells = findCellsByPhase(state.tasks, state.currentPhaseId);
        } else {
          const currentStep = phase.steps[state.currentStepIndex];
          if (!currentStep) return [];
          cells = findCellsByStep(
            state.tasks,
            state.currentPhaseId,
            currentStep.id,
            state.cells
          );
        }
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
        state.tasks,
        state.currentPhaseId!,
        currentStep.id,
        state.cells
      ).map((cell) => cell.id);
    },

    getAllCellsBeforeCurrent: (): Cell[] => {
      const state = get();
      const { cells, currentCellId } = state;

      if (!currentCellId) {
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
  }))
);

export default useStore;