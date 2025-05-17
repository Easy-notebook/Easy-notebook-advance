// src/store/actionCreators.js
import { EVENT_TYPES } from './AIAgentStore';
import { v4 as uuidv4 } from 'uuid';
import useStore from './notebookStore';

/**
 * 获取当前时间的格式化字符串 "HH:MM:SS"
 */
const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
};

/**
 * 基础 Action 创建函数
 * @param {string} type - Action 的类型
 * @param {string} content - Action 的内容
 * @param {string[]} relatedQAIds - 相关的 QA IDs
 * @param {string|null} cellId - 相关的 cell ID
 * @param {string} result - Action 的结果
 * @param {boolean} onProcess - Action 的处理状态
 * @returns {Action} - 创建的 Action 对象
 */
const createAction = (type, content, relatedQAIds = [], cellId = null, result = '', onProcess = false) => {
    if (!Array.isArray(relatedQAIds)) {
        console.warn(
            `createAction: expected relatedQAIds to be an array, but received ${typeof relatedQAIds}. Defaulting to an empty array.`
        );
        relatedQAIds = [];
    }

    console.log(`Creating action of type "${type}" with relatedQAIds:`, relatedQAIds);

    return {
        id: uuidv4(),
        type,
        timestamp: getCurrentTimestamp(),
        content,
        result,
        relatedQAIds,
        cellId,
        viewMode: useStore.getState().viewMode,
        onProcess,
    };
};

/**
 * 用户相关 Action 创建函数
 */
export const createUserAskQuestionAction = (content, relatedQAIds = [], cellId = null) =>
    createAction(EVENT_TYPES.USER_ASK_QUESTION, content, relatedQAIds, cellId);

export const createUserNewInstructionAction = (content, relatedQAIds = [], cellId = null) =>
    createAction(EVENT_TYPES.USER_NEW_INSTRUCTION, content, relatedQAIds, cellId);

export const createUserFileUploadAction = (content, relatedQAIds = [], cellId = null) =>
    createAction(EVENT_TYPES.USER_FILE_UPLOAD, content, relatedQAIds, cellId);

/**
 * AI 相关 Action 创建函数
 */
export const createAIUnderstandingAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_UNDERSTANDING, content, relatedQAIds, cellId, result, onProcess);

export const createAIExplainingProcessAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_EXPLAINING_PROCESS, content, relatedQAIds, cellId, result, onProcess);

export const createAIWritingCodeAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_WRITING_CODE, content, relatedQAIds, cellId, result, onProcess);

export const createAIRunningCodeAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_RUNNING_CODE, content, relatedQAIds, cellId, result, onProcess);

export const createAIAnalyzingResultsAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_ANALYZING_RESULTS, content, relatedQAIds, cellId, result, onProcess);

export const createAIFixingBugsAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_FIXING_BUGS, content, relatedQAIds, cellId, result, onProcess);

export const createAICriticalThinkingAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_CRITICAL_THINKING, content, relatedQAIds, cellId, result, onProcess);

export const createAIReplyingQuestionAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_REPLYING_QUESTION, content, relatedQAIds, cellId, result, onProcess);

export const createAIFixingCodeAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_FIXING_CODE, content, relatedQAIds, cellId, result, onProcess);

/**
 * 系统事件 Action 创建函数
 */
export const createSystemEventAction = (content, result = '', relatedQAIds = [], cellId = null) =>
    createAction(EVENT_TYPES.SYSTEM_EVENT, content, relatedQAIds, cellId, result);

export const createAIGeneratingCodeAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_GENERATING_CODE, content, relatedQAIds, cellId, result, onProcess);

export const createAIGeneratingTextAction = (content, result = '', relatedQAIds = [], cellId = null, onProcess = false) =>
    createAction(EVENT_TYPES.AI_GENERATING_TEXT, content, relatedQAIds, cellId, result, onProcess);
