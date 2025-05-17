// src/interfaces/globalUpdateInterface.js

import useStore from '../store/notebookStore';
import { useAIAgentStore } from '../store/AIAgentStore';
import useCodeStore from '../store/codeStore';
import { sendCurrentCellExecuteCodeResult, sendCurrentCellExecuteCodeError_should_debug } from '../store/autoActions';
import {
    createUserAskQuestionAction,
    createUserNewInstructionAction,
    createUserFileUploadAction,
    createAIUnderstandingAction,
    createAIExplainingProcessAction,
    createAIWritingCodeAction,
    createAIRunningCodeAction,
    createAIAnalyzingResultsAction,
    createAIFixingBugsAction,
    createAICriticalThinkingAction,
    createAIReplyingQuestionAction,
    createAIFixingCodeAction,
    createSystemEventAction,
    createAIGeneratingCodeAction,
    createAIGeneratingTextAction
} from '../store/actionCreators';

// 创建一个全局更新接口
const globalUpdateInterface = {
    // Notebook Store Methods
    setNotebookId: (id) => useStore.getState().setNotebookId(id),
    addCell: (newCell, index) => useStore.getState().addCell(newCell, index),
    deleteCell: (cellId) => useStore.getState().deleteCell(cellId),
    updateCell: (cellId, newContent) => useStore.getState().updateCell(cellId, newContent),
    updateCellOutputs: (cellId, outputs) => useStore.getState().updateCellOutputs(cellId, outputs),
    updateCurrentCellWithContent: (content) => useStore.getState().updateCurrentCellWithContent(content),
    setViewMode: (mode) => useStore.getState().setViewMode(mode),
    toggleViewMode: () => useStore.getState().toggleViewMode(), // ADDED: 添加模式切换动作
    setCurrentPhase: (phaseId) => useStore.getState().setCurrentPhase(phaseId),
    setCurrentStepIndex: (index) => useStore.getState().setCurrentStepIndex(index),
    setCurrentCell: (cellId) => useStore.getState().setCurrentCell(cellId),
    setError: (error) => useStore.getState().setError(error),
    setCurrentRunningPhaseId: (phaseId) => useStore.getState().setCurrentRunningPhaseId(phaseId),
    runAllCells: () => useStore.getState().runAllCells(),
    clearCells: () => useStore.getState().clearCells(),
    clearAllOutputs: () => useStore.getState().clearAllOutputs(),
    clearCellOutputs: (cellId) => useStore.getState().clearCellOutputs(cellId),
    setAllowPagination: (allow) => useStore.getState().setAllowPagination(allow), // ADDED: 添加翻页权限设置

    setAddedLastCellID: (id) => useStore.getState().setAddLastCellID(id),
    getAddedLastCellID: () => useStore.getState().getAddLastCellID(),

    addNewCell2End: (type, description = '', enableEdit = true) => useStore.getState().addNewCell2End(type, description, enableEdit),
    addNewContent2CurrentCell: (content) => useStore.getState().addNewContent2CurrentCell(content),
    addNewCell2Next: (type, description = '', enableEdit = true) => useStore.getState().addNewCell2Next(type, description, enableEdit),

    runSingleCell: (cellId) => useStore.getState().runSingleCell(cellId),
    runCurrentCodeCell: async () => {
        if (useStore.getState().getCurrentCellType() === 'Hybrid') {
            await useStore.getState().convertToCodeCell(useStore.getState().getCurrentCellId());
        }
        await useStore.getState().runCurrentCodeCell();
        if (useStore.getState().checkCurrentCodeCellOutputsIsError()) {
            sendCurrentCellExecuteCodeError_should_debug();
        }
        else {
            sendCurrentCellExecuteCodeResult();
        }
    },

    setCodeCellMode: (cellId, mode) => useCodeStore.getState().setCodeCellMode(cellId, mode),
    setCurrentCellMode_onlyCode: () => useCodeStore.getState().setCurrentCellMode_onlyCode(),
    setCurrentCellMode_onlyOutput: () => useCodeStore.getState().setCurrentCellMode_onlyOutput(),
    setCurrentCellMode_complete: () => useCodeStore.getState().setCurrentCellMode_complete(),

    updateCurrentCellDescription: (description) => useStore.getState().updateCurrentCellDescription(description),
    addNewContent2CurrentCellDescription: (content) => useStore.getState().addNewContent2CurrentCellDescription(content),

    getHistoryCode: () => useStore.getState().getHistoryCode(),
    getPhaseHistoryCode: (phaseId) => useStore.getState().getPhaseHistoryCode(phaseId),
    convertCurrentCodeCellToHybridCell : () => useStore.getState().convertCurrentCodeCellToHybridCell(),

    // AI Agent Store Methods
    initStreamingAnswer: (QId) => useAIAgentStore.getState().initStreamingAnswer(QId),
    addContentToAnswer: (QId, content) => useAIAgentStore.getState().addContentToAnswer(QId, content),
    finishStreamingAnswer: (QId) => useAIAgentStore.getState().finishStreamingAnswer(QId),


    /**
     * 创建并添加用户提出问题的 Action
     * @param {string} content - 问题内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createUserAskQuestion: (content, relatedQAIds = [], cellId = useStore.getState().getCurrentCellId()) => {
        const action = createUserAskQuestionAction(content, relatedQAIds, cellId);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加用户新指令的 Action
     * @param {string} content - 指令内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createUserNewInstruction: (content, relatedQAIds = [], cellId = useStore.getState().getCurrentCellId()) => {
        const action = createUserNewInstructionAction(content, relatedQAIds, cellId);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加用户文件上传的 Action
     * @param {string} content - 上传文件的描述
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createUserFileUpload: (content, relatedQAIds = [], cellId = useStore.getState().getCurrentCellId()) => {
        const action = createUserFileUploadAction(content, relatedQAIds, cellId);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 理解用户需求的 Action
     * @param {string} content - 理解内容
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIUnderstanding: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIUnderstandingAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 解释过程的 Action
     * @param {string} content - 解释内容
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIExplainingProcess: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIExplainingProcessAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 编写代码的 Action
     * @param {string} content - 编写代码的描述
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIWritingCode: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIWritingCodeAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 运行代码的 Action
     * @param {string} content - 运行代码的描述
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIRunningCode: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIRunningCodeAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 分析结果的 Action
     * @param {string} content - 分析内容
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIAnalyzingResults: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIAnalyzingResultsAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 修复 Bug 的 Action
     * @param {string} content - 修复 Bug 的描述
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIFixingBugs: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIFixingBugsAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 批判性思考的 Action
     * @param {string} content - 思考内容
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAICriticalThinking: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAICriticalThinkingAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 回复问题的 Action
     * @param {string} content - 回复内容
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIReplyingQuestion: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIReplyingQuestionAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 修复代码的 Action
     * @param {string} content - 修复代码的描述
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIFixingCode: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIFixingCodeAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加系统事件的 Action
     * @param {string} content - 系统事件内容
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createSystemEvent: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), viewMode = 'complete') => {
        const action = createSystemEventAction(content, result, relatedQAIds, cellId, viewMode);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 生成代码的 Action
     * @param {string} content - 生成代码的描述
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIGeneratingCode: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIGeneratingCodeAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加 AI 生成文本的 Action
     * @param {string} content - 生成文本的描述
     * @param {string} result - 结果内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     * @param {boolean} onProcess - 是否正在处理
     */
    createAIGeneratingText: (content, result = '', relatedQAIds = [], cellId = useStore.getState().getCurrentCellId(), onProcess = false) => {
        const action = createAIGeneratingTextAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    }
};

export default globalUpdateInterface;
