// store/operatorStore.js

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { notebookApiIntegration } from '../services/notebookServices';
import { handleStreamResponse } from '../services/streamHandler';
import { showToast } from '../components/UI/Toast';
import useCodeStore from './codeStore';

/**
 * Operator Store 用于缓存用户操作和处理与后端的交互
 */
const useOperatorStore = create((set, get) => ({
    operations: [], // 存储所有操作历史
    operationResponses: {}, // 存储每个操作对应的响应
    isSendingOperation: false, // 标记是否正在发送操作
    error: null, // 存储error_message

    /**
     * 添加一个操作到操作历史
     * @param {Object} operation - 操作对象
     */
    addOperation: (operation) => {
        const newOperation = { ...operation, id: uuidv4(), timestamp: new Date().toISOString() };
        set((state) => ({
            operations: [...state.operations, newOperation],
        }));
        return newOperation.id; // 返回操作ID以便跟踪
    },

    /**
     * 发送操作到后端
     * @param {string} notebookId - 笔记本ID
     * @param {Object} operation - 操作对象
     */
    sendOperation: async (notebookId, operation) => {
        const state = get();

        if (!notebookId) {
            notebookId = await useCodeStore.getState().initializeKernel();
        }

        if (state.isSendingOperation) {
            showToast({ message: '正在处理其他操作，请稍后...', type: 'warning' });
            return;
        }

        set({ isSendingOperation: true, error: null });
        const operationId = get().addOperation(operation);

        try {
            // 使用统一接口发送操作，传入自定义的流处理函数
            await notebookApiIntegration.sendOperation(
                notebookId,
                operation,
                async (data) => {
                    try {
                        // 处理流式响应
                        await handleStreamResponse(data, showToast);
            
                        // 更新操作响应状态
                        set((state) => ({
                            operationResponses: {
                                ...state.operationResponses,
                                [operationId]: [
                                    ...(state.operationResponses[operationId] || []),
                                    data,
                                ],
                            },
                        }));
                    } catch (error) {
                        console.error('处理操作时发生错误:', error);
                    }
                }
            );            
        } catch (error) {
            console.error('发送操作失败:', error);
            set({ error: error.message });
            showToast({
                message: `操作发送失败: ${error.message}`,
                type: 'error'
            });
        } finally {
            set({ isSendingOperation: false });
        }
    },

    /**
     * 获取操作历史
     */
    getOperationHistory: () => get().operations,

    /**
     * 获取某个操作的响应记录
     * @param {string} operationId - 操作ID
     */
    getOperationResponses: (operationId) => get().operationResponses[operationId] || [],

    /**
     * 清空操作历史和响应记录
     */
    clearOperations: () => set({ operations: [], operationResponses: {} }),

    /**
     * 重置错误状态
     */
    resetError: () => set({ error: null }),
}));

export default useOperatorStore;
