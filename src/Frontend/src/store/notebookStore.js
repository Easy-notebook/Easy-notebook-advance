// store/notebookStore.js

import { create } from 'zustand';
// 1) 删除 persist、createJSONStorage
// import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { parseMarkdownCells, findCellsByPhase, findCellsByStep } from '../utils/markdownParser';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '../components/UI/Toast';
import { produce } from 'immer';

import useCodeStore from './codeStore';

// 序列化工具
const serializeOutput = (output) => {
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
const deserializeOutput = (output) => {
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
const updateCellOutputs = (set, cellId, outputs) => {
  const serializedOutputs = serializeOutput(outputs);
  console.log('updateCellOutputs', outputs);

  set(
    produce((state) => {
      const cell = state.cells.find((c) => c.id === cellId);
      if (cell) {
        console.log(serializedOutputs);
        console.log(serializedOutputs.length);
        if (serializedOutputs.length > 0) {
          if (state.checkOutputsIsError(serializedOutputs)) {
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
  // 2) 去掉 persist(...) 只保留 subscribeWithSelector
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
    setEditingCellId: (id) => set({ editingCellId: id }),
    setError: (error) => set({ error }),
    setIsCollapsed: (isCollapsed) => set({ isCollapsed }),
    setLastAddedCellId: (id) => set({ lastAddedCellId: id }),
    setUploadMode: (uploadMode) => set({ uploadMode }),
    setAllowedTypes: (allowedTypes) => set({ allowedTypes }),
    setMaxFiles: (maxFiles) => set({ maxFiles }),
    setIsRightSidebarCollapsed: (isRightSidebarCollapsed) =>
      set({ isRightSidebarCollapsed }),
    setNotebookId: (id) => set({ notebookId: id }),
    setCurrentPhase: (phaseId) =>
      set({ currentPhaseId: phaseId, currentStepIndex: 0 }),
    setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
    setCurrentCell: (cellId) => set({ currentCellId: cellId }),
    setCurrentRunningPhaseId: (phaseId) => set({ currentRunningPhaseId: phaseId }),
    setAllowPagination: (allow) => set({ allowPagination: allow }),
    setShowButtons: (cellId, value) =>
      set(
        produce((state) => {
          state.showButtons[cellId] = value;
        })
      ),

    clearCells: () => set({ cells: [], tasks: [], currentRunningPhaseId: null }),
    clearAllOutputs: () =>
      set(
        produce((state) => {
          state.cells.forEach((cell) => {
            cell.outputs = [];
          });
        })
      ),
    clearCellOutputs: (cellId) =>
      set(
        produce((state) => {
          const cell = state.cells.find((c) => c.id === cellId);
          if (cell) {
            cell.outputs = [];
          }
        })
      ),

    setCells: (cells) => {
      const tasks = parseMarkdownCells(cells);
      const serializedCells = cells.map((cell) => ({
        ...cell,
        content: typeof cell.content === 'string' ? cell.content : String(cell.content || ''),
        outputs: serializeOutput(cell.outputs || []),
      }));
      set({ cells: serializedCells, tasks });
    },

    updateCurrentCellWithContent: (content) => {
      const currentCellId = get().currentCellId;
      if (!currentCellId) {
        console.error('当前没有选中的单元格');
        return;
      }
      get().updateCell(currentCellId, content);
    },

    addCell: (newCell, index) =>
      set(
        produce((state) => {
          const targetIndex = index ?? state.cells.length;
          const cell = {
            id: newCell.id || uuidv4(),
            type: newCell.type || 'markdown',
            content:
              typeof newCell.content === 'string'
                ? newCell.content
                : String(newCell.content || ''),
            outputs: serializeOutput(newCell.outputs || []),
            enableEdit: true,
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

    updateTitle: (title) => set(
      // 判断cell列表是否为空
      produce((state) => {
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
            enableEdit: true
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

    updateCurrentCellDescription: (description) =>
      set(
        produce((state) => {
          const cell = state.cells.find((c) => c.id === state.currentCellId);
          if (cell) {
            cell.description = description;
          }
        })
      ),

    addNewContent2CurrentCellDescription: (content) => {
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

    deleteCell: (cellId) =>
      set(
        produce((state) => {
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

    updateCell: (cellId, newContent) =>
      set(
        produce((state) => {
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

    updateCellOutputs: (cellId, outputs) => {
      updateCellOutputs(set, cellId, outputs);
    },



    setViewMode: (mode) =>
      set(
        produce((state) => {
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
        produce((state) => {
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

    runSingleCell: async (cellId) => {
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

    runAllCells: async () => {
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

    runCurrentCodeCell: async () => {
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

    addNewCell2End: (type, description = '', enableEdit = true) => {
      const newCell = {
        id: uuidv4(),
        type: type,
        content: '',
        outputs: [],
        enableEdit: enableEdit,
        phaseId: get().currentRunningPhaseId || null,
        description: description,
      };
      get().addCell(newCell);
      set({ lastAddedCellId: newCell.id });
      set({ editingCellId: newCell.id });
      set({ currentCellId: newCell.id });

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

    addNewCell2Next: (type, description = '', enableEdit = true) => {
      const newCell = {
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
      set({ lastAddedCellId: newCell.id });
      set({ editingCellId: newCell.id });
      set({ currentCellId: newCell.id });

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

    addNewContent2CurrentCell: (content) => {
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

    getCurrentCellType: () => {
      const state = get();
      const currentCell = state.cells.find((c) => c.id === state.currentCellId);
      return currentCell ? currentCell.type : 'markdown';
    },

    checkOutputsIsError: (outputs) => {
      for (let i = 0; i < outputs.length; i++) {
        if (outputs[i].type === 'error') {
          return true;
        }
      }
      return false;
    },


    checkCurrentCodeCellOutputsIsError: () => {
      const currentCell = useStore.getState().getCurrentCell();
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
    updateCellCanEdit: (cellId, isEditable) => set(
      produce((state) => {
        const cell = state.cells.find((c) => c.id === cellId);
        if (cell) {
          cell.enableEdit = isEditable;
        }
      })
    ),

    // 添加更新单元格元数据的函数
    updateCellMetadata: (cellId, metadata) => set(
      produce((state) => {
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
      produce((state) => {
        const currentCell = state.cells.find((c) => c.id === state.currentCellId);

        if (!currentCell) {
          console.warn('No current cell found, cannot convert current code cell to Hybrid cell.');
          return;
        }

        currentCell.type = 'Hybrid';
      })
    ),

    // 在 useStore 的 actions 部分添加这个新函数
    convertToCodeCell: (cellId) =>
      set(
        produce((state) => {
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

    getHistoryCode: () => {
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

    getPhaseHistoryCode: (phaseId) => {
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

    getPhaseById: (phaseId) => {
      const state = get();
      return (
        state.tasks
          .flatMap((task) => task.phases)
          .find((phase) => phase.id === phaseId) || null
      );
    },

    getTaskByPhaseId: (phaseId) => {
      const state = get();
      return (
        state.tasks.find((task) =>
          task.phases.some((phase) => phase.id === phaseId)
        ) || null
      );
    },

    getCurrentViewCells: () => {
      const state = get();
      let cells;

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

    getCurrentStepCellsIDs: () => {
      const state = get();
      const phase = get().getPhaseById(state.currentPhaseId);
      if (!phase || !phase.steps.length) {
        return [];
      }
      const currentStep = phase.steps[state.currentStepIndex];
      if (!currentStep) return [];
      return findCellsByStep(
        state.tasks,
        state.currentPhaseId,
        currentStep.id,
        state.cells
      ).map((cell) => cell.id);
    },

    getAllCellsBeforeCurrent: () => {
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

    getTotalSteps: () => {
      const state = get();
      const phase = get().getPhaseById(state.currentPhaseId);
      return phase ? phase.steps.length : 0;
    },
  }))
);

export default useStore;
