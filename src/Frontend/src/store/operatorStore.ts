// store/operatorStore.ts

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { notebookApiIntegration } from '../services/notebookServices';
import { handleStreamResponse } from '../services/streamHandler';
import { showToast } from '../components/UI/Toast';
import useCodeStore from './codeStore';
import useStore from './notebookStore';
import { useAIAgentStore, EVENT_TYPES } from './AIAgentStore';

/**
 * 操作接口
 */
export interface Operation {
    type: string;
    payload: Record<string, any>;
    id?: string;
    timestamp?: string;
}

/**
 * 操作响应数据接口
 */
export interface OperationResponseData {
    [key: string]: any;
}

/**
 * 流处理回调函数类型
 */
export type StreamDataCallback = (data: OperationResponseData) => Promise<void>;

/**
 * Toast 显示函数类型
 */
export type ToastFunction = (message: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;

/**
 * Operator Store 状态接口
 */
export interface OperatorStoreState {
    operations: Operation[]; // 存储所有操作历史
    operationResponses: Record<string, OperationResponseData[]>; // 存储每个操作对应的响应
    isSendingOperation: boolean; // 标记是否正在发送操作
    error: string | null; // 存储error_message
}

/**
 * Operator Store Actions 接口
 */
export interface OperatorStoreActions {
    /**
     * 添加一个操作到操作历史
     */
    addOperation: (operation: Operation) => string;

    /**
     * 发送操作到后端
     */
    sendOperation: (notebookId: string | null, operation: Operation) => Promise<void>;

    /**
     * 获取操作历史
     */
    getOperationHistory: () => Operation[];

    /**
     * 获取某个操作的响应记录
     */
    getOperationResponses: (operationId: string) => OperationResponseData[];

    /**
     * 清空操作历史和响应记录
     */
    clearOperations: () => void;

    /**
     * 重置错误状态
     */
    resetError: () => void;
}

/**
 * 完整的 Operator Store 类型
 */
export type OperatorStore = OperatorStoreState & OperatorStoreActions;

/**
 * Operator Store 用于缓存用户操作和处理与后端的交互
 */
const useOperatorStore = create<OperatorStore>((set, get) => ({
    operations: [], // 存储所有操作历史
    operationResponses: {}, // 存储每个操作对应的响应
    isSendingOperation: false, // 标记是否正在发送操作
    error: null, // 存储error_message

    /**
     * 添加一个操作到操作历史
     * @param operation - 操作对象
     */
    addOperation: (operation: Operation): string => {
        const newOperation: Operation = { 
            ...operation, 
            id: uuidv4(), 
            timestamp: new Date().toISOString() 
        };
        set((state) => ({
            operations: [...state.operations, newOperation],
        }));
        return newOperation.id!; // 返回操作ID以便跟踪
    },

    /**
     * 发送操作到后端
     * @param notebookId - 笔记本ID
     * @param operation - 操作对象
     */
    sendOperation: async (notebookId: string | null, operation: Operation): Promise<void> => {
        const state = get();

        if (!notebookId) {
            notebookId = await useCodeStore.getState().initializeKernel();
            if (!notebookId) {
                showToast({ message: '无法初始化内核', type: 'error' });
                return;
            }
        }

        if (state.isSendingOperation) {
            showToast({ message: '正在处理其他操作，请稍后...', type: 'warning' });
            return;
        }

        set({ isSendingOperation: true, error: null });
        const operationId = get().addOperation(operation);

        try {
            // Record activity: stream start
            const viewMode = useStore.getState().viewMode;
            const { agentName, agentType } = (() => {
                switch (operation.type) {
                    case 'user_command':
                        return { agentName: 'Command Processor', agentType: 'command_processor' as const };
                    case 'user_question':
                        return { agentName: 'General Assistant', agentType: 'general' as const };
                    default:
                        return { agentName: 'System Assistant', agentType: 'general' as const };
                }
            })();
            useAIAgentStore.getState().addAction({
                type: EVENT_TYPES.SYSTEM_EVENT,
                content: `Operation started: ${operation.type}`,
                result: '',
                relatedQAIds: [],
                cellId: null,
                viewMode: viewMode || 'create',
                onProcess: true,
                agentName,
                agentType,
                taskDescription: 'Streaming updates from backend'
            });
            const startActionId = useAIAgentStore.getState().actions[0]?.id;

            // 使用统一接口发送操作，传入自定义的流处理函数
            await notebookApiIntegration.sendOperation(
                notebookId,
                operation,
                async (data: OperationResponseData) => {
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

            // Mark activity completed when stream closes
            if (startActionId) {
                useAIAgentStore.getState().updateAction(startActionId, {
                    onProcess: false,
                    result: `Stream completed: ${operation.type}`,
                    progressPercent: 100
                } as any);
            }
        } catch (error: any) {
            console.error('发送操作失败:', error);
            set({ error: error.message });
            // Mark activity failed
            const latestId = useAIAgentStore.getState().actions[0]?.id;
            if (latestId) {
                useAIAgentStore.getState().updateAction(latestId, {
                    onProcess: false,
                    errorMessage: error?.message || String(error)
                } as any);
            }
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
    getOperationHistory: (): Operation[] => get().operations,

    /**
     * 获取某个操作的响应记录
     * @param operationId - 操作ID
     */
    getOperationResponses: (operationId: string): OperationResponseData[] => 
        get().operationResponses[operationId] || [],

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