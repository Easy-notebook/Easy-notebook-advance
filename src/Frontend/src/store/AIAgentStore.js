// src/store/AIAgentStore.js
import { create } from 'zustand';

// 定义事件类型
export const EVENT_TYPES = {
    // 用户相关事件
    USER_ASK_QUESTION: 'user_ask_question',           // 用户提出问题
    USER_NEW_INSTRUCTION: 'user_new_instruction',     // 用户提出新指令
    USER_FILE_UPLOAD: 'user_file_upload',             // 用户进行文件上传操作

    // AI 相关事件
    AI_UNDERSTANDING: 'ai_understanding',             // AI 正在理解用户的问题和操作
    AI_EXPLAINING_PROCESS: 'ai_explaining_process',   // AI 正在解释整个过程和思路
    AI_WRITING_CODE: 'ai_writing_code',               // AI 正在书写代码
    AI_RUNNING_CODE: 'ai_running_code',               // AI 正在运行代码并生成结果
    AI_ANALYZING_RESULTS: 'ai_analyzing_results',     // AI 正在分析运行结果
    AI_FIXING_BUGS: 'ai_fixing_bugs',                 // AI 正在修复 BUG
    AI_CRITICAL_THINKING: 'ai_critical_thinking',     // AI 正在进行批判性思考
    AI_REPLYING_QUESTION: 'ai_replying_question',     // AI 正在回复问题
    AI_FIXING_CODE: 'ai_fixing_code',                 // AI 正在修复代码
    AI_GENERATING_CODE: 'ai_generating_code',         // AI 正在生成代码
    AI_GENERATING_TEXT: 'ai_generating_text',         // AI 正在生成文本
    SYSTEM_EVENT: 'system_event'                      // 系统事件
};

// 创建 Zustand store
export const useAIAgentStore = create((set) => ({
    // 当前视图: 'script' 或 'qa'
    activeView: 'script',
    // 加载状态
    isLoading: false,
    // 命令输入框是否可见
    showCommandInput: false,
    // 所有的 actions
    actions: [],
    qaList: [],

    // 设置当前视图
    setActiveView: (view) => set({ activeView: view }),
    // 设置加载状态
    setIsLoading: (loading) => set({ isLoading: loading }),
    // 设置命令输入框可见性
    setShowCommandInput: (visible) => set({ showCommandInput: visible }),

    // Actions CRUD
    addAction: (action) => {
        // 验证 relatedQAIds 是否为数组
        if (!Array.isArray(action.relatedQAIds)) {
            console.warn(
                `addAction: expected relatedQAIds to be an array for action ID "${action.id}", but received ${typeof action.relatedQAIds}. Defaulting to an empty array.`
            );
            action.relatedQAIds = [];
        }

        console.log('Adding action:', action);

        set((state) => ({
            actions: [
                {
                    ...action,
                    onProcess: action.onProcess || false
                },
                ...state.actions
            ]
        }));
    },
    
    removeAction: (actionId) => {
        set((state) => ({
            actions: state.actions.filter((action) => action.id !== actionId)
        }));
    },
    updateAction: (actionId, updates) => {
        set((state) => ({
            actions: state.actions.map((action) =>
                action.id === actionId ? { ...action, ...updates } : action
            )
        }));
    },
    setActionProcess: (actionId, onProcess) => {
        set((state) => ({
            actions: state.actions.map((action) =>
                action.id === actionId ? { ...action, onProcess } : action
            )
        }));
    },

    // Q&A CRUD
    addQA: (qa) => {
        set((state) => ({
            qaList: [
                {
                    ...qa,
                    onProcess: qa.onProcess || false
                },
                ...state.qaList
            ]
        }));
    },
    removeQA: (qaId) => {
        set((state) => ({
            qaList: state.qaList.filter((qa) => qa.id !== qaId)
        }));
    },
    updateQA: (qaId, updates) => {
        set((state) => ({
            qaList: state.qaList.map((qa) =>
                qa.id === qaId ? { ...qa, ...updates } : qa
            )
        }));
    },
    setQAProcess: (qaId, onProcess) => {
        set((state) => ({
            qaList: state.qaList.map((qa) =>
                qa.id === qaId ? { ...qa, onProcess } : qa
            )
        }));
    },

    // 初始化流式回答
    initStreamingAnswer: (qaId) => {
        console.log('initStreamingAnswer', qaId);
        set((state) => {
            // 1. 找到目标 QA
            const targetIndex = state.qaList.findIndex((qa) => qa.id === qaId);
            if (targetIndex === -1) {
                console.warn(`initStreamingAnswer: QA with ID "${qaId}" not found.`);
                return {};
            }
            const targetQA = state.qaList[targetIndex];

            // 2. 创建一个新的 QA，除了 id 之外其他信息都复制原 QA
            const newQA = {
                ...targetQA,
                id: `${targetQA.id}-[0]`,
            };

            // 3. 更新目标 QA：清空 content、设为未解决、设为正在处理
            const updatedTargetQA = {
                ...targetQA,
                content: '',
                type: 'assistant',
                resolved: false,
                onProcess: true,
            };

            // 4. 组装新的 qaList
            const newQaList = [
                ...state.qaList.slice(0, targetIndex),
                updatedTargetQA, // 更新后的原 QA
                newQA,           // 插入的新 QA
                ...state.qaList.slice(targetIndex + 1),
            ];

            return { qaList: newQaList };
        });
    },

    // 追加内容到答案
    addContentToAnswer: (qaId, content) => {
        console.log('addContentToAnswer', qaId, content);
        set((state) => ({
            qaList: state.qaList.map((qa) =>
                qa.id === qaId
                    ? { ...qa, content: qa.content + content }
                    : qa
            )
        }));
    },

    // 完成回答
    finishStreamingAnswer: (qaId) => {
        console.log('finishStreamingAnswer', qaId);
        set((state) => ({
            qaList: state.qaList.map((qa) => {
                if (qa.id === qaId) {
                    return {
                        ...qa,
                        resolved: true,
                        onProcess: false,
                    };
                }
                // 如果是刚才插入的新 QA (id = 原id-[0])
                if (qa.id === `${qaId}-[0]`) {
                    return {
                        ...qa,
                        resolved: true,
                    };
                }
                return qa;
            })
        }));
    },

}));
