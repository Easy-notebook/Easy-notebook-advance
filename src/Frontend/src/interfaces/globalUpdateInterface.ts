// src/interfaces/globalUpdateInterface.ts

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

// Type definitions for global update interface
type CellType = 'code' | 'markdown' | 'hybrid' | 'Hybrid';
type ViewMode = 'complete' | 'onlyCode' | 'onlyOutput';
type CodeCellMode = 'complete' | 'onlyCode' | 'onlyOutput';

interface Cell {
  id: string;
  type: CellType;
  content: string;
  description?: string;
  outputs?: any[];
}

interface GlobalUpdateInterface {
  // Notebook Store Methods
  setNotebookId: (id: string) => void;
  addCell: (newCell: Cell, index?: number) => void;
  deleteCell: (cellId: string) => void;
  updateCell: (cellId: string, newContent: string) => void;
  updateCellOutputs: (cellId: string, outputs: any[]) => void;
  updateCurrentCellWithContent: (content: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setCurrentPhase: (phaseId: string) => void;
  setCurrentStepIndex: (index: number) => void;
  setCurrentCell: (cellId: string) => void;
  setError: (error: string | null) => void;
  setCurrentRunningPhaseId: (phaseId: string) => void;
  runAllCells: () => void;
  clearCells: () => void;
  clearAllOutputs: () => void;
  clearCellOutputs: (cellId: string) => void;
  setAllowPagination: (allow: boolean) => void;
  setAddedLastCellID: (id: string) => void;
  getAddedLastCellID: () => string;
  addNewCell2End: (type: CellType, description?: string, enableEdit?: boolean) => string;
  addNewCellWithUniqueIdentifier: (type: CellType, description?: string, enableEdit?: boolean, uniqueIdentifier?: string, prompt?: string) => string;
  updateCellByUniqueIdentifier: (uniqueIdentifier: string, updates: Partial<any>) => boolean;
  addNewContent2CurrentCell: (content: string) => void;
  addNewCell2Next: (type: CellType, description?: string, enableEdit?: boolean) => void;
  runSingleCell: (cellId: string) => void;
  runCurrentCodeCell: () => Promise<void>;
  setCodeCellMode: (cellId: string, mode: CodeCellMode) => void;
  setCurrentCellMode_onlyCode: () => void;
  setCurrentCellMode_onlyOutput: () => void;
  setCurrentCellMode_complete: () => void;
  updateCurrentCellDescription: (description: string) => void;
  addNewContent2CurrentCellDescription: (content: string) => void;
  getHistoryCode: () => string;
  getPhaseHistoryCode: (phaseId: string) => string;
  convertCurrentCodeCellToHybridCell: () => void;
  
  // AI Agent Store Methods
  initStreamingAnswer: (QId: string) => void;
  addContentToAnswer: (QId: string, content: string) => void;
  finishStreamingAnswer: (QId: string) => void;
  
  // AI Action Methods
  createUserAskQuestion: (content: string, relatedQAIds?: string[], cellId?: string | null) => void;
  createUserNewInstruction: (content: string, relatedQAIds?: string[], cellId?: string | null) => void;
  createUserFileUpload: (content: string, relatedQAIds?: string[], cellId?: string | null) => void;
  createAIUnderstanding: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIExplainingProcess: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIWritingCode: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIRunningCode: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIAnalyzingResults: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIFixingBugs: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAICriticalThinking: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIReplyingQuestion: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIFixingCode: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createSystemEvent: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, viewMode?: ViewMode) => void;
  createAIGeneratingCode: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  createAIGeneratingText: (content: string, result?: string, relatedQAIds?: string[], cellId?: string | null, onProcess?: boolean) => void;
  
  // Video Generation Methods
  createGeneratingVideoCell: (prompt: string, params?: {quality?: string, ratio?: string, duration?: string}) => string;
  updateVideoGenerationProgress: (cellId: string, status: string) => void;
  completeVideoGeneration: (cellId: string, videoUrl: string) => void;
  failVideoGeneration: (cellId: string, error: string) => void;
}

// 创建一个全局更新接口
const globalUpdateInterface: GlobalUpdateInterface = {
    // Notebook Store Methods
    setNotebookId: (id: string) => useStore.getState().setNotebookId(id),
    addCell: (newCell: Cell, index?: number) => useStore.getState().addCell(newCell, index),
    deleteCell: (cellId: string) => useStore.getState().deleteCell(cellId),
    updateCell: (cellId: string, newContent: string) => {
        console.log('🔄 globalUpdateInterface.updateCell called:', { cellId, contentLength: newContent?.length, contentPreview: newContent?.substring(0, 50) });
        const result = useStore.getState().updateCell(cellId, newContent);
        console.log('✅ globalUpdateInterface.updateCell completed');
        return result;
    },
    updateCellOutputs: (cellId: string, outputs: any[]) => useStore.getState().updateCellOutputs(cellId, outputs),
    updateCurrentCellWithContent: (content: string) => useStore.getState().updateCurrentCellWithContent(content),
    setViewMode: (mode: ViewMode) => useStore.getState().setViewMode(mode),
    toggleViewMode: () => useStore.getState().toggleViewMode(), // ADDED: 添加模式切换动作
    setCurrentPhase: (phaseId: string) => useStore.getState().setCurrentPhase(phaseId),
    setCurrentStepIndex: (index: number) => useStore.getState().setCurrentStepIndex(index),
    setCurrentCell: (cellId: string) => useStore.getState().setCurrentCell(cellId),
    setError: (error: string | null) => useStore.getState().setError(error),
    setCurrentRunningPhaseId: (phaseId: string) => useStore.getState().setCurrentRunningPhaseId(phaseId),
    runAllCells: () => useStore.getState().runAllCells(),
    clearCells: () => useStore.getState().clearCells(),
    clearAllOutputs: () => useStore.getState().clearAllOutputs(),
    clearCellOutputs: (cellId: string) => useStore.getState().clearCellOutputs(cellId),
    setAllowPagination: (allow: boolean) => useStore.getState().setAllowPagination(allow), // ADDED: 添加翻页权限设置

    setAddedLastCellID: (id: string) => useStore.getState().setLastAddedCellId(id),
    getAddedLastCellID: (): string => useStore.getState().lastAddedCellId || '',

    addNewCell2End: (type: CellType, description: string = '', enableEdit: boolean = true) => useStore.getState().addNewCell2End(type, description, enableEdit),
    addNewCellWithUniqueIdentifier: (type: CellType, description: string = '', enableEdit: boolean = true, uniqueIdentifier?: string, prompt?: string) => useStore.getState().addNewCellWithUniqueIdentifier(type, description, enableEdit, uniqueIdentifier, prompt),
    updateCellByUniqueIdentifier: (uniqueIdentifier: string, updates: Partial<any>) => useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, updates),
    addNewContent2CurrentCell: (content: string) => useStore.getState().addNewContent2CurrentCell(content),
    addNewCell2Next: (type: CellType, description: string = '', enableEdit: boolean = true) => useStore.getState().addNewCell2Next(type, description, enableEdit),

    runSingleCell: (cellId: string) => useStore.getState().runSingleCell(cellId),
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

    setCodeCellMode: (cellId: string, mode: CodeCellMode) => useCodeStore.getState().setCodeCellMode(cellId, mode),
    setCurrentCellMode_onlyCode: () => useCodeStore.getState().setCurrentCellMode_onlyCode(),
    setCurrentCellMode_onlyOutput: () => useCodeStore.getState().setCurrentCellMode_onlyOutput(),
    setCurrentCellMode_complete: () => useCodeStore.getState().setCurrentCellMode_complete(),

    updateCurrentCellDescription: (description: string) => useStore.getState().updateCurrentCellDescription(description),
    addNewContent2CurrentCellDescription: (content: string) => useStore.getState().addNewContent2CurrentCellDescription(content),

    getHistoryCode: (): string => useStore.getState().getHistoryCode(),
    getPhaseHistoryCode: (phaseId: string): string => useStore.getState().getPhaseHistoryCode(phaseId),
    convertCurrentCodeCellToHybridCell: () => useStore.getState().convertCurrentCodeCellToHybridCell(),

    // AI Agent Store Methods
    initStreamingAnswer: (QId: string) => useAIAgentStore.getState().initStreamingAnswer(QId),
    addContentToAnswer: (QId: string, content: string) => useAIAgentStore.getState().addContentToAnswer(QId, content),
    finishStreamingAnswer: (QId: string) => useAIAgentStore.getState().finishStreamingAnswer(QId),


    /**
     * 创建并添加用户提出问题的 Action
     * @param {string} content - 问题内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createUserAskQuestion: (content: string, relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId()) => {
        const action = createUserAskQuestionAction(content, relatedQAIds, cellId);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加用户新指令的 Action
     * @param {string} content - 指令内容
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createUserNewInstruction: (content: string, relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId()) => {
        const action = createUserNewInstructionAction(content, relatedQAIds, cellId);
        useAIAgentStore.getState().addAction(action);
    },

    /**
     * 创建并添加用户文件上传的 Action
     * @param {string} content - 上传文件的描述
     * @param {string[]} relatedQAIds - 相关的 QA IDs
     * @param {string|null} cellId - 相关的 Cell ID
     */
    createUserFileUpload: (content: string, relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId()) => {
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
    createAIUnderstanding: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIExplainingProcess: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIWritingCode: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIRunningCode: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIAnalyzingResults: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIFixingBugs: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAICriticalThinking: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIReplyingQuestion: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIFixingCode: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createSystemEvent: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), viewMode: ViewMode = 'create') => {
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
    createAIGeneratingCode: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
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
    createAIGeneratingText: (content: string, result: string = '', relatedQAIds: string[] = [], cellId: string | null = useStore.getState().getCurrentCellId(), onProcess: boolean = false) => {
        const action = createAIGeneratingTextAction(content, result, relatedQAIds, cellId, onProcess);
        useAIAgentStore.getState().addAction(action);
    },

    // Video Generation Methods Implementation
    createGeneratingVideoCell: (prompt: string, params: {quality?: string, ratio?: string, duration?: string} = {}) => {
        // 先创建一个新的 image 单元格并拿到真实的 cellId
        const cellId = useStore.getState().addNewCell2End('image');

        // 设置生成中的元数据
        useStore.getState().updateCellMetadata(cellId, {
            isGenerating: true,
            generationStartTime: Date.now(),
            prompt: prompt,
            generationType: 'video',
            generationParams: {
                quality: params.quality || 'standard',
                ratio: params.ratio || '16:9',
                duration: params.duration || '5'
            }
        });

        // 清空内容（保持一致）
        useStore.getState().updateCell(cellId, '');
        return cellId;
    },

    updateVideoGenerationProgress: (cellId: string, status: string) => {
        const cells = useStore.getState().cells;
        const targetCell = cells.find(cell => cell.id === cellId);
        
        if (targetCell && targetCell.metadata) {
            // Update generation status without changing other metadata
            targetCell.metadata = {
                ...targetCell.metadata,
                generationStatus: status
            };
            
            // Trigger re-render by updating the cell
            useStore.getState().updateCell(cellId, targetCell.content);
        }
    },

    completeVideoGeneration: (cellId: string, videoUrl: string) => {
        const cells = useStore.getState().cells;
        const targetCell = cells.find(cell => cell.id === cellId);
        
        if (targetCell) {
            // Create markdown content for the video
            const prompt = targetCell.metadata?.prompt || 'Generated Video';
            const videoMarkdown = `![${prompt}](${videoUrl})`;
            
            // Update cell content and clear generation metadata
            useStore.getState().updateCell(cellId, videoMarkdown);
            
            // Clear generation metadata
            if (targetCell.metadata) {
                targetCell.metadata = {
                    ...targetCell.metadata,
                    isGenerating: false,
                    generationStartTime: undefined,
                    generationStatus: undefined,
                    generationError: undefined
                };
            }
        }
    },

    failVideoGeneration: (cellId: string, error: string) => {
        const cells = useStore.getState().cells;
        const targetCell = cells.find(cell => cell.id === cellId);
        
        if (targetCell && targetCell.metadata) {
            // Set error state
            targetCell.metadata = {
                ...targetCell.metadata,
                isGenerating: true, // Keep generating state to show error UI
                generationError: error,
                generationStatus: 'failed'
            };
            
            // Trigger re-render
            useStore.getState().updateCell(cellId, targetCell.content);
        }
    }
};

export default globalUpdateInterface;
