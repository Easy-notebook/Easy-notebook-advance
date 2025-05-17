// store/codeStore.js
import { create } from 'zustand';
import useStore from './notebookStore'; // 引入 notebookStore，用来更新对应 cell 的 outputs
import { NotebookApiService } from '../services/notebookServices';

// 显示模式常量
export const DISPLAY_MODES = {
    COMPLETE: 'complete',
    CODE_ONLY: 'code_only',
    OUTPUT_ONLY: 'output_only'
};

/**
 * 在这个 store 中，统一管理：
 * 1) 内核状态 (isKernelReady, error)
 * 2) 每个 Cell 的执行状态 (isExecuting, elapsedTime, isCancelling, etc.)
 * 3) 轮询逻辑
 * 4) 单个 Cell 执行 / 取消执行方法
 */
const useCodeStore = create((set, get) => ({
    // ========== 全局内核状态 ==========
    isKernelReady: false,
    error: null,

    // ========== 每个 Cell 的执行状态 ==========
    /**
     * cellExecStates: {
     *   [cellId]: {
     *     isExecuting: boolean;
     *     isCancelling: boolean;
     *     elapsedTime: number;
     *     statusCheckInterval: any; // 存放 setInterval 的返回值
     *   }
     * }
     */
    cellExecStates: {},

    // ========== 每个 Cell 的显示模式 ==========
    cellModes: {},

    // ========== Actions: 内核相关 ==========
    setKernelReady: (ready) => set({ isKernelReady: ready }),
    setError: (err) => set({ error: err }),

    initializeKernel: async () => {
        // 如果已经就绪，直接返回
        console.log('initializeKernel:', get().isKernelReady, "notebookId:", useStore.getState().notebookId);
        if (get().isKernelReady) return useStore.getState().notebookId;

        try {
            get().setError(null);
            const result = await NotebookApiService.initializeNotebook();
            if (result.status === 'ok') {
                get().setKernelReady(true);
                useStore.getState().setNotebookId(result.notebook_id);
                console.log('change notebookId:', useStore.getState().notebookId);
                console.log('内核初始化成功');
                return result.notebook_id;
            } else {
                throw new Error(result.message || '内核初始化失败');
            }
        } catch (error) {
            console.error('initializeKernel error:', error);
            get().setKernelReady(false);
            get().setError(error.message);
            return false;
        }
    },

    restartKernel: async () => {
        try {
            get().setError(null);
            const result = await NotebookApiService.restartNotebook();
            if (result.status === 'ok') {
                get().setKernelReady(true);
                console.log('内核重启成功');
                return true;
            } else {
                throw new Error(result.message || '内核重启失败');
            }
        } catch (error) {
            console.error('restartKernel error:', error);
            get().setKernelReady(false);
            get().setError(error.message);
            return false;
        }
    },

    // ========== Actions: 每个 Cell 的执行状态管理 ==========
    initCellExecState: (cellId) => {
        const state = get();
        if (!state.cellExecStates[cellId]) {
            set((prev) => ({
                cellExecStates: {
                    ...prev.cellExecStates,
                    [cellId]: {
                        isExecuting: false,
                        isCancelling: false,
                        elapsedTime: 0,
                        statusCheckInterval: null,
                    }
                }
            }));
        }
    },

    getCellExecState: (cellId) => {
        const execStates = get().cellExecStates;
        // 如果还没有初始化过，就返回一个默认状态
        if (!execStates[cellId]) {
            return {
                isExecuting: false,
                isCancelling: false,
                elapsedTime: 0,
                statusCheckInterval: null,
            };
        }
        return execStates[cellId];
    },

    setCellExecState: (cellId, partial) => {
        set((prev) => ({
            cellExecStates: {
                ...prev.cellExecStates,
                [cellId]: {
                    ...prev.cellExecStates[cellId],
                    ...partial
                }
            }
        }));
    },

    // 停止定时器
    stopStatusCheck: (cellId) => {
        const cellExec = get().getCellExecState(cellId);
        if (cellExec.statusCheckInterval) {
            clearInterval(cellExec.statusCheckInterval);
        }
        get().setCellExecState(cellId, { statusCheckInterval: null });
    },

    // 启动定时器，每秒检查一次执行状态
    startStatusCheck: (cellId) => {
        const notebookId = useStore.getState().notebookId;
        if (!notebookId) {
            console.error('Notebook ID 不存在，无法开始状态轮询');
            return;
        }
        // 先停掉旧的
        get().stopStatusCheck(cellId);

        const intervalId = setInterval(async () => {
            try {
                const status = await NotebookApiService.getExecutionStatus(notebookId);
                const cellExec = get().getCellExecState(cellId);
                // 如果已经不在执行，就停止轮询
                if (!cellExec.isExecuting) {
                    clearInterval(intervalId);
                    return;
                }

                if (status.status === 'running') {
                    get().setCellExecState(cellId, { elapsedTime: status.elapsed_time || 0 });
                    if (status.outputs?.length > 0) {
                        useStore.getState().updateCellOutputs(cellId, status.outputs);
                    }
                } else {
                    // 执行结束
                    clearInterval(intervalId);
                    get().setCellExecState(cellId, {
                        isExecuting: false,
                        elapsedTime: 0,
                        statusCheckInterval: null
                    });
                    if (status.outputs?.length > 0) {
                        useStore.getState().updateCellOutputs(cellId, status.outputs);
                    }
                }
            } catch (err) {
                console.error('检查执行状态错误:', err);
                clearInterval(intervalId);
                get().setCellExecState(cellId, {
                    isExecuting: false,
                    statusCheckInterval: null
                });
            }
        }, 1000);

        get().setCellExecState(cellId, { statusCheckInterval: intervalId });
    },

    // 取消执行
    cancelCellExecution: async (cellId) => {
        const notebookId = useStore.getState().notebookId;
        if (!notebookId) {
            console.error('Notebook ID 不存在，无法取消执行');
            return { success: false, error: 'no_notebook_id' };
        }
        get().setCellExecState(cellId, { isCancelling: true });

        try {
            await NotebookApiService.cancelExecution(notebookId);
            get().stopStatusCheck(cellId);
            get().setCellExecState(cellId, {
                isExecuting: false,
                elapsedTime: 0,
            });
            return { success: false, error: 'canceled_by_user' };
        } catch (error) {
            console.error('取消执行错误:', error);
            return { success: false, error: error.message };
        } finally {
            get().setCellExecState(cellId, { isCancelling: false });
        }
    },

    // 执行单个 Cell
    executeCell: async (cellId) => {
        // 如果正在执行 => 视作"取消"
        const cellExec = get().getCellExecState(cellId);
        if (cellExec.isExecuting) {
            return get().cancelCellExecution(cellId);
        }

        // 如果内核没就绪，先初始化
        const ok = await get().initializeKernel();
        const notebookId = useStore.getState().notebookId;
        const notebookState = useStore.getState();
        if (!ok) {
            return { success: false, error: '内核初始化失败' };
        }
        await NotebookApiService.executeCode('print("fast check")', notebookId);

        // 清除旧输出
        notebookState.clearCellOutputs(cellId);
        // 设置 isExecuting
        get().setCellExecState(cellId, {
            isExecuting: true,
            elapsedTime: 0,
        });

        // 开始轮询
        get().startStatusCheck(cellId);

        // 真正发起执行请求
        try {
            const codeCell = notebookState.cells.find((c) => c.id === cellId);
            if (!codeCell) {
                // Cell 不存在
                get().stopStatusCheck(cellId);
                get().setCellExecState(cellId, { isExecuting: false });
                return { success: false, error: 'Cell 不存在' };
            }

            const result = await NotebookApiService.executeCode(codeCell.content, notebookId);
            // 更新 outputs
            notebookState.updateCellOutputs(cellId, result.outputs || []);

            let hasError = false;
            let error = null;
            if (result.outputs) {
                for (let output of result.outputs) {
                    if (output.type === 'error') {
                        hasError = true;
                        error = output.content;
                        break;
                    }
                }
            }

            // 停止轮询
            get().stopStatusCheck(cellId);
            get().setCellExecState(cellId, {
                isExecuting: false,
                elapsedTime: 0,
            });

            // console.log('执行结果:', result);

            if (hasError) {
                return { success: false, error: error };
            }

            return { success: true, outputs: result.outputs };
        } catch (error) {
            console.error('执行单元格错误:', error);
            notebookState.updateCellOutputs(cellId, [
                { type: 'error', content: error.message }
            ]);
            get().stopStatusCheck(cellId);
            get().setCellExecState(cellId, { isExecuting: false });
            return { success: false, error: error.message };
        }
    },

    // ========== 显示模式管理 ==========
    setCellMode: (cellId, mode) => {
        console.log(`[setCellMode] cellId=${cellId}, mode=${mode}`);
        set((prev) => ({
            cellModes: {
                ...prev.cellModes,
                [cellId]: mode,
            }
        }));
    },

    setCurrentCellMode_onlyCode: () => {
        console.log('设置当前cell模式为只有代码');
        const cellId = useStore.getState().currentCellId;
        get().setCellMode(cellId, DISPLAY_MODES.CODE_ONLY);
    },
    setCurrentCellMode_onlyOutput: () => {
        console.log('设置当前cell模式为只有输出');
        const cellId = useStore.getState().currentCellId;
        get().setCellMode(cellId, DISPLAY_MODES.OUTPUT_ONLY);
    },
    setCurrentCellMode_complete: () => {
        const cellId = useStore.getState().currentCellId;
        get().setCellMode(cellId, DISPLAY_MODES.COMPLETE);
    },

    // ========== 重置 ==========
    resetAll: () => set({
        isKernelReady: false,
        error: null,
        cellExecStates: {},
        cellModes: {}
    }),
}));

export default useCodeStore;
