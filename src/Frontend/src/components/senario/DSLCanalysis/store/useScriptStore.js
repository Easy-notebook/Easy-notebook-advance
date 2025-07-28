// ==============================================
// 引入依赖：zustand 用于创建状态管理 store；uuid 用于生成全局唯一ID
// ==============================================
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// 引入底层 cell 操作实现的 notebookStore
import useNotebookStore from '../../../../store/notebookStore';
import { sendCurrentCellExecuteCodeError_should_debug } from '../../../../store/autoActions';

// 添加 codeStore 导入
import useCodeStore from '../../../../store/codeStore';
import globalUpdateInterface from '../../../../interfaces/globalUpdateInterface';
// ==============================================
// 常量定义
// ==============================================

/**
 * 动画常量（单位：毫秒）
 * - ADD_LOADING：添加镜头时的加载时间
 * - UPDATE_LOADING：更新镜头时的加载时间
 * - TRANSITION：场景/分镜转换动画时间
 * - SEQUENCE_DELAY：剧本序列各步骤之间默认延时
 */
const ANIMATION = {
    ADD_LOADING: 50,
    UPDATE_LOADING: 30,
    TRANSITION: 60,
    SEQUENCE_DELAY: 100
};

/**
 * 定义镜头类型（对应剧本中的不同元素）
 */
const SHOT_TYPES = {
    DIALOGUE: 'dialogue',     // 对话（文本内容）
    ACTION: 'action',         // 动作（代码描述）
    HYBRID: 'hybrid',         // 混合型镜头
    ATTACHMENT: 'attachment', // 附件（文件相关内容）
    OUTCOME: 'outcome',       // 结果展示
    ERROR: 'error',            // error_message
    THINKING: 'thinking'     // 思考
};

/**
 * 场景模式常量
 */
const step_MODES = {
    WRITING: 'WRITING',  // 可编辑状态
    DEDUCTION: 'DEDUCTION', // 只读状态
    PAUSED: 'PAUSED' // 暂停状态
};

export { SHOT_TYPES, ANIMATION, step_MODES };

// ==============================================
// 辅助函数
// ==============================================

/**
 * 格式化镜头内容标题
 * 如果内容以 "# " 开头，则根据是否为步骤(isStep)调整为二级或三级标题
 * @param {string} content - 原始内容
 * @param {boolean} isStep - 是否为步骤镜头（true：三级标题；false：二级标题）
 * @returns {string} 格式化后的内容
 */
function formatShotContent(content, isStep) {
    if (content && content.trim().startsWith('# ')) {
        if (isStep) {
            if (!content.trim().startsWith('### ')) {
                return content.replace(/^# /, '### ');
            }
        } else {
            if (!content.trim().startsWith('## ')) {
                return content.replace(/^# /, '## ');
            }
        }
    }
    return content;
}

/**
 * 将 cell 类型映射为 shot 类型的辅助函数
 * @param {string} cellType - notebook cell 类型
 * @returns {string} 对应的镜头类型
 */
function mapCellTypeToShotType(cellType) {
    switch (cellType) {
        case 'markdown':
            return SHOT_TYPES.DIALOGUE;
        case 'code':
            return SHOT_TYPES.ACTION;
        case 'Hybrid':
            return SHOT_TYPES.HYBRID;
        case 'outcome':
            return SHOT_TYPES.OUTCOME;
        case 'error':
            return SHOT_TYPES.ERROR;
        case 'thinking':
            return SHOT_TYPES.THINKING;
        default:
            return SHOT_TYPES.DIALOGUE;
    }
}

// ==============================================
// Script Store
// ==============================================
export const useScriptStore = create((set, get) => ({
    // ------------------------------
    // Basic State
    // ------------------------------
    // Script State Overview:
    // A script consists of multiple steps and multiple stages.
    // - steps organize actions chronologically or logically within the narrative.
    // - stages provide another way to sequence actions, often for visualization or specific production stages.
    // - actions are the fundamental units (dialogue, action, etc.) and are referenced by ID in both steps and stages.
    // - Actual shot data (content, type) is primarily managed by `useNotebookStore` and linked via shot IDs.

    // Holds full shot objects for the `currentStep`.
    // This array is populated when switching steps or when the current step's actions are modified.
    actions: [],
    // Defines all steps in the script.
    // Each step (e.g., steps['stepId']) contains:
    //  - actionIds: An ordered array of IDs for actions belonging to this step. These IDs link to shot data
    //             managed by `useNotebookStore`.
    //  - mode: Editing mode (e.g., step_MODES.WRITING, step_MODES.DEDUCTION).
    //  - isModified: Boolean flag indicating if the step has unsaved changes.
    //  - isCompleted: Boolean flag indicating if the step is considered complete.
    steps: {
        'default': { actionIds: [], mode: step_MODES.WRITING, isModified: false, isCompleted: false }
    },
    stepOrder: ['default'], // Defines the order of steps in the script.
    currentStep: 'default', // ID of the currently active step.

    loading: false,            // Boolean flag indicating if an asynchronous operation is in progress.
    loadingType: 'default',    // String identifier for the type of content being loaded (e.g., a specific shot type).

    activeSequence: null,      // Holds the configuration for an active automated script sequence (e.g., for step-by-step execution).
    sequenceIndex: 0,          // Current step index within an active automated sequence.

    // stage-related state:
    // Defines all stages in the script. stages offer an alternative way to organize and sequence actions.
    // Each stage (e.g., stages['stageId']) contains:
    //  - id: The stage's unique ID.
    //  - type: The type of stage (e.g., 'stage').
    //  - actionIds: An ordered array of IDs for actions belonging to this stage. These IDs link to shot data.
    //  - mode: Editing mode for the stage.
    //  - isModified: Boolean flag indicating if the stage has unsaved changes.
    stages: {
        'default': { id: 'default', type: 'stage', actionIds: [], mode: step_MODES.WRITING, isModified: false }
    },
    stageOrder: ['default'], // Defines the order of stages.
    currentStage: 'default', // ID of the currently active stage.

    // Holds full shot objects for the `currentStage`.
    // This array is populated when switching stages.
    stageActions: [],

    debugButtonVisible: true, // Controls visibility of a debug button in the UI.
    onSequenceComplete: null, // Callback function to execute when an automated sequence completes.
    onSequenceTerminate: null, // Callback function to execute when an automated sequence is terminated.
    lastAddedActionId: null, // Stores the ID of the most recently added shot to the script.

    // ------------------------------
    // helper functions
    // ------------------------------

    /**
     * 根据镜头类型返回默认内容
     * @param {string} shotType - 镜头类型，默认为 'text'
     * @returns {string} 默认内容
     */
    getDefaultContent: (shotType = 'text') => {
        switch (shotType) {
            case 'text':
                return '';
            case 'code':
                return '# 在此编写代码';
            case 'outcome':
                return '结果将在此显示';
            case 'error':
                return '发生错误';
            default:
                return '';
        }
    },

    // ------------------------------
    // action operations interface
    // ------------------------------
    getCurrentStep: () => {
        const { currentStep, steps } = get();
        return steps[currentStep];
    },

    switchStep: (stepId, options = {}) => {
        if (get().currentStep === stepId) {
            console.log(`Already on step: ${stepId}, skipping switch`);
            return true;
        }
        set((state) => {
            let { steps, stepOrder } = state;
            if (!steps[stepId]) {
                steps = {
                    ...steps,
                    [stepId]: {
                        actionIds: [],
                        mode: options.mode || step_MODES.WRITING,
                        isModified: false,
                        isCompleted: false
                    }
                };
                stepOrder = [...state.stepOrder, stepId];
            }

            const actionIds = steps[stepId].actionIds;
            const notebookCells = useNotebookStore.getState().cells;
            const actions = actionIds.map(actionId => {
                const cell = notebookCells.find(cell => cell.id === actionId);
                if (!cell) return null;
                return {
                    id: cell.id,
                    type: mapCellTypeToShotType(cell.type),
                    content: cell.content,
                    metadata: cell.metadata || {},
                    mode: cell.enableEdit ? step_MODES.WRITING : step_MODES.DEDUCTION,
                    isModified: false,
                    timestamp: cell.timestamp || new Date().toISOString(),
                    phaseId: cell.phaseId || stepId
                };
            }).filter(Boolean);

            return {
                steps,
                stepOrder,
                currentStep: stepId,
                actions
            };
        });
        console.log(`Switched to step: ${stepId}`);
        const targetStep = get().steps[stepId];
        if (targetStep) {
            const isEditable = targetStep.mode === step_MODES.WRITING;
            targetStep.actionIds.forEach(id => {
                useNotebookStore.getState().updateCellCanEdit(id, isEditable);
            });
        }
        return true;
    },

    clearStep: (stepId = null) => {
        const targetStep = stepId || get().currentStep;
        const { steps } = get();
        const actionIds = steps[targetStep]?.actionIds || [];

        actionIds.forEach(id => {
            useNotebookStore.getState().deleteCell(id);
        });

        set(state => {
            let newActions = state.actions;
            if (targetStep === state.currentStep) {
                newActions = [];
            }

            return {
                actions: newActions,
                steps: {
                    ...state.steps,
                    [targetStep]: {
                        ...state.steps[targetStep],
                        actionIds: []
                    }
                }
            };
        });
    },

    createStep: (stepId, options = {}) => {
        if (get().steps[stepId]) {
            console.warn(`Step ${stepId} already exists`);
            return false;
        }
        set(state => ({
            steps: {
                ...state.steps,
                [stepId]: {
                    actionIds: [],
                    mode: options.mode || step_MODES.WRITING,
                    isModified: false,
                    isCompleted: false
                }
            },
            stepOrder: [...state.stepOrder, stepId]
        }));
        return true;
    },

    deleteStep: (stepId) => {
        if (stepId === 'default') {
            console.warn('could not delete default step');
            return false;
        }
        set(state => {
            const newSteps = { ...state.steps };
            delete newSteps[stepId];
            const newStepOrder = state.stepOrder.filter(id => id !== stepId);
            const newCurrentStep = state.currentStep === stepId ? 'default' : state.currentStep;
            return {
                steps: newSteps,
                stepOrder: newStepOrder,
                currentStep: newCurrentStep,
                actions: newCurrentStep === state.currentStep ? state.actions : newSteps[newCurrentStep].actionIds.map(id => {
                    const cell = useNotebookStore.getState().cells.find(cell => cell.id === id);
                    if (!cell) return null;

                    return {
                        id: cell.id,
                        type: mapCellTypeToShotType(cell.type),
                        content: cell.content,
                        metadata: cell.metadata || {},
                        mode: cell.enableEdit ? step_MODES.WRITING : step_MODES.DEDUCTION,
                        isModified: false,
                        timestamp: cell.timestamp || new Date().toISOString(),
                        phaseId: cell.phaseId || newCurrentStep
                    };
                }).filter(Boolean)
            };
        });
        return true;
    },

    createAndSwitchStep: (stepName = null, options = {}) => {
        const stepId = stepName || `step_${uuidv4().substring(0, 8)}`;
        if (get().steps[stepId]) {
            console.warn(`Step ${stepId} already exists, switching directly`);
            get().switchStep(stepId, options);
            return stepId;
        }
        get().createStep(stepId, options);
        // update currentStep DEDUCTION mode
        set(state => ({
            ...state,
            steps: {
                ...state.steps,
                [state.currentStep]: {
                    ...state.steps[state.currentStep],
                    mode: step_MODES.DEDUCTION
                }
            }
        }));
        get().switchStep(stepId, options);
        console.log(`Step ${stepId} created and switched`);
        return stepId;
    },

    initializeFirstStep: (FirstStepId = 'first_step', options = {}) => {
        const { steps } = get();
        if (steps[FirstStepId]) {
            get().switchStep(FirstStepId);
            return true;
        }
        get().createStep(FirstStepId, {
            mode: options.mode || step_MODES.WRITING,
            ...options
        });
        get().switchStep(FirstStepId);
        console.log(`Step ${FirstStepId} initialized and switched`);
        return true;
    },

    // ------------------------------
    // 镜头操作接口
    // ------------------------------
    createNewShot: (type = 'text', content = '', metadata = {}) => {
        const actionId = uuidv4();
        const shotContent = content || get().getDefaultContent(type);
        const newShot = {
            id: actionId,
            type: type,
            content: shotContent,
            metadata: metadata
        };
        return get().addShot(newShot);
    },

    /**
     * 批量添加镜头到当前场景
     * @param {Array} actions - 镜头数组
     * @returns {Array} 添加的镜头ID数组
     */
    addMultipleActions: (actions = []) => {
        if (!Array.isArray(actions) || actions.length === 0) {
            console.warn('No valid actions provided');
            return [];
        }
        const addedActionIds = [];
        actions.forEach(shot => {
            const actionId = get().addShot(shot);
            if (actionId) {
                addedActionIds.push(actionId);
            }
        });
        return addedActionIds;
    },

    /**
     * 添加镜头（同时调用 notebookStore 添加对应 cell）
     * 检查当前场景是否处于演绎模式，若是则不允许添加
     * @param {object} shot - 镜头对象，包含 id、type、content、metadata 等属性
     * @returns {string|null} 新增镜头的ID，若添加失败返回 null
     */
    addShot: (shot, couldVisibleInWritingMode = true) => {
        const { currentStep } = get();
        // if current step is in deduction mode, prohibit adding shot
        if (get().isStepInDeductionMode()) {
            console.warn(`Cannot add shot: step(${currentStep}) is in deduction mode`);
            return null;
        }
        const { getDefaultContent } = get();
        const actionId = shot.id || uuidv4();
        let content = shot.content || getDefaultContent(shot.type);
        // for text type shot (dialogue), adjust title format based on whether it is a step
        if (shot.type === SHOT_TYPES.DIALOGUE || shot.type === 'text') {
            const isStep = shot.metadata && shot.metadata.isStep;
            content = formatShotContent(content, isStep);
        }

        // map shot type to notebook cell type
        let cellType = 'markdown';
        if (shot.type === SHOT_TYPES.ACTION || shot.type === 'code') {
            cellType = 'code';
        } else if (shot.type === SHOT_TYPES.HYBRID) {
            cellType = 'Hybrid';
        } else if (shot.type === SHOT_TYPES.OUTCOME) {
            cellType = 'outcome';
        } else if (shot.type === SHOT_TYPES.ERROR) {
            cellType = 'error';
        } else if (shot.type === SHOT_TYPES.THINKING) {
            cellType = 'thinking';
        }

        // create new shot object
        const newShot = {
            id: actionId,
            type: shot.type || 'text',
            content,
            metadata: shot.metadata || {},
            mode: step_MODES.WRITING,
            isModified: false,
            timestamp: new Date().toISOString(),
            phaseId: currentStep,
            couldVisibleInWritingMode: couldVisibleInWritingMode
        };

        // add corresponding cell in notebookStore
        const cellData = {
            id: actionId,
            type: cellType,
            content: content,
            outputs: [],
            enableEdit: cellType === 'thinking' ? false : true,
            couldVisibleInWritingMode: couldVisibleInWritingMode,
            phaseId: currentStep,
            description: shot.description || '',
            metadata: shot.metadata || {}
        };

        // Add special properties for thinking cells
        if (cellType === 'thinking') {
            cellData.agentName = shot.agentName || 'AI';
            cellData.customText = shot.customText || null;
            cellData.textArray = shot.textArray || [];
            cellData.useWorkflowThinking = shot.useWorkflowThinking || false;
        }

        useNotebookStore.getState().addCell(cellData);

        // update step's actionIds and actions status
        set(state => {
            const updatedStepActionIds = [...(state.steps[currentStep]?.actionIds || []), actionId];
            const updatedActions = [...state.actions, newShot];

            return {
                actions: updatedActions,
                steps: {
                    ...state.steps,
                    [currentStep]: {
                        ...state.steps[currentStep],
                        actionIds: updatedStepActionIds,
                        isModified: true
                    }
                }
            };
        });

        // save new added cell's ID
        set({ lastAddedActionId: actionId });

        return actionId;
    },


    updateLastText: (text) => {
        const lastCell = useNotebookStore.getState().cells[useNotebookStore.getState().cells.length - 1];
        if (lastCell.type !== 'markdown') {
            console.warn('last cell is not markdown type, but', lastCell.type);
            return;
        }
        useNotebookStore.getState().updateCell(lastCell.id, text);
    },

    finishThinking: () => {
        // confirm last cell is thinking type
        const lastCell = useNotebookStore.getState().cells[useNotebookStore.getState().cells.length - 1];
        if (lastCell.type !== 'thinking') {
            console.warn('last cell is not thinking type, but', lastCell.type);
            return;
        }
        
        // delete cell in notebook
        useNotebookStore.getState().deleteCell(lastCell.id);
        
        // delete corresponding shot in current step
        set(state => {
            const updatedActions = state.actions.filter(shot => shot.id !== lastCell.id);
            const updatedStepActionIds = state.steps[state.currentStep].actionIds.filter(id => id !== lastCell.id);
            
            return {
                actions: updatedActions,
                steps: {
                    ...state.steps,
                    [state.currentStep]: {
                        ...state.steps[state.currentStep],
                        actionIds: updatedStepActionIds
                    }
                }
            };
        });
    },

    setEffectAsThinking: (thinkingText="finished thinking") => {
        const lastCell = useNotebookStore.getState().cells[useNotebookStore.getState().cells.length - 1];
        if (lastCell.type !== 'code') {
            console.warn('last cell is not code type, but', lastCell.type);
            return;
        }
        
        // update last code cell's metadata, add finished_thinking mark
        useNotebookStore.getState().updateCellMetadata(lastCell.id, {
            ...lastCell.metadata,
            finished_thinking: true,
            thinkingText: thinkingText
        });

        // ensure step's shot's metadata is also updated
        set(state => {
            const updatedActions = state.actions.map(shot => {
                if (shot.id === lastCell.id) {
                    return { ...shot, metadata: { ...shot.metadata, finished_thinking: true, thinkingText: thinkingText } };
                }
                return shot;
            });
            return {
                actions: updatedActions
            };
        });
    },

    /**
     * 更新指定镜头的内容和元数据
     * @param {string} actionId - 镜头ID
     * @param {object} updates - 更新内容与元数据（支持 content 与 metadata 属性）
     * @returns {boolean} 更新是否成功
     */
    updateShot: (actionId, updates = {}) => {
        const { currentStep } = get();
        if (get().isStepInDeductionMode()) {
            console.warn(`Cannot update shot: step(${currentStep}) is in deduction mode`);
            return false;
        }

        // get cell in notebookStore
        const notebookCell = useNotebookStore.getState().cells.find(cell => cell.id === actionId);
        if (!notebookCell) {
            console.warn(`shot ${actionId} does not exist`);
            return false;
        }

        // for text type shot, adjust title format when updating content
        if (updates.content && (mapCellTypeToShotType(notebookCell.type) === SHOT_TYPES.DIALOGUE ||
            mapCellTypeToShotType(notebookCell.type) === 'text')) {
            const isStep = notebookCell.metadata && notebookCell.metadata.isStep;
            updates.content = formatShotContent(updates.content, isStep);
        }

        // update content in notebookStore
        if (updates.content !== undefined) {
            useNotebookStore.getState().updateCell(actionId, updates.content);
        }

        // update metadata
        if (updates.metadata) {
            useNotebookStore.getState().updateCellMetadata(actionId, {
                ...notebookCell.metadata,
                ...updates.metadata
            });
        }

        // update actions array in scriptStore
        set(state => {
            const shotIndex = state.actions.findIndex(shot => shot.id === actionId);
            if (shotIndex === -1) return state;

            const updatedActions = [...state.actions];
            updatedActions[shotIndex] = {
                ...updatedActions[shotIndex],
                ...updates,
                content: updates.content !== undefined ? updates.content : updatedActions[shotIndex].content,
                metadata: updates.metadata ? { ...updatedActions[shotIndex].metadata, ...updates.metadata } : updatedActions[shotIndex].metadata,
                isModified: true
            };

            return {
                actions: updatedActions,
                steps: {
                    ...state.steps,
                    [currentStep]: {
                        ...state.steps[currentStep],
                        isModified: true
                    }
                }
            };
        });

        return true;
    },

    /**
     * 删除指定镜头，同时调用 notebookStore 删除对应 cell
     * @param {string} actionId - 镜头ID
     * @returns {boolean} 是否成功删除
     */
    removeShot: (actionId) => {
        const { currentStep } = get();
        if (get().isStepInDeductionMode()) {
            console.warn(`无法删除镜头: 场景(${currentStep})处于演绎模式`);
            return false;
        }

        // 检查镜头是否存在于当前场景
        const { steps } = get();
        const currentactionIds = steps[currentStep]?.actionIds || [];
        if (!currentactionIds.includes(actionId)) {
            console.warn(`镜头 ${actionId} 不存在于当前场景`);
            return false;
        }

        // 从 notebookStore 中删除 cell
        useNotebookStore.getState().deleteCell(actionId);

        // 更新 scriptStore 中的 actions 数组和 actionIds
        set(state => ({
            actions: state.actions.filter(shot => shot.id !== actionId),
            steps: {
                ...state.steps,
                [currentStep]: {
                    ...state.steps[currentStep],
                    actionIds: state.steps[currentStep].actionIds.filter(id => id !== actionId),
                    isModified: true
                }
            }
        }));

        return true;
    },

    // ------------------------------
    // 剧本序列操作（自动化步骤）
    // ------------------------------

    /**
     * 启动剧本序列，根据配置按顺序执行各命令
     * @param {object} sequence - 序列配置对象，必须包含 steps 数组（每一步包含 action、延时 delay 等信息）
     * @param {object} options - 可选配置，例如 replace（是否清空当前场景）
     * @returns {boolean} 序列是否成功启动
     */
    startSequence: (sequence, options = {}) => {
        if (!sequence || typeof sequence !== 'object') {
            console.error('Invalid sequence configuration - 序列必须是一个有效对象');
            return false;
        }
        if (!sequence.steps || !Array.isArray(sequence.steps) || sequence.steps.length === 0) {
            console.error('Invalid sequence configuration - 序列必须包含 steps 数组');
            return false;
        }
        const targetStepId = sequence.stepId || get().currentStep;
        const targetStep = get().steps[targetStepId];
        console.log(`尝试启动场景 ${targetStepId} 的序列`);
        if (targetStep.isCompleted) {
            console.log(`拒绝执行序列: 场景 ${targetStepId} 已完成，直接加载记录`);
            return false;
        }
        console.log('启动序列:', sequence.name, '总步骤:', sequence.steps.length);
        // 若序列中指定场景，则切换到该场景
        if (sequence.stepId) {
            get().switchStep(sequence.stepId);
        }
        // 若 replace 为 true，则清空当前场景
        if (options.replace) {
            get().clearStep(sequence.stepId || get().currentStep);
        }
        // 初始化序列状态
        set({
            activeSequence: sequence,
            sequenceIndex: 0
        });
        // 延时后开始处理序列的第一步
        setTimeout(() => get().processNextSequenceStep(), 10);
        return true;
    },

    /**
     * 执行指定的操作步骤
     * @param {object} step - 操作步骤配置
     * @returns {Promise<any>} 操作结果
     */
    execAction: async (step) => {
        switch (step.action) {
            case 'new_step': {
                get().createStep(step.stepId);
                globalUpdateInterface.createSystemEvent(`Created new step: ${step.stepId}`, '', [], null);
                break;
            }
            case 'clear_step': {
                get().clearStep(step.stepId);
                globalUpdateInterface.createSystemEvent(`Cleared step: ${step.stepId || 'current step'}`, '', [], null);
                break;
            }
            case 'switch_step': {
                get().switchStep(step.stepId);
                globalUpdateInterface.createSystemEvent(`Switched to step: ${step.stepId}`, '', [], null);
                break;
            }
            case 'switch_stage': {
                get().switchstage(step.stageId);
                globalUpdateInterface.createSystemEvent(`Switched to stage: ${step.stageId}`, '', [], null);
                break;
            }
            case 'switch_to_next_step': {
                get().switchToNextstep();
                globalUpdateInterface.createSystemEvent('Switched to next step', '', [], null);
                break;
            }
            case 'switch_to_previous_step': {
                get().switchToPreviousstep();
                globalUpdateInterface.createSystemEvent('Switched to previous step', '', [], null);
                break;
            }
            case 'switch_to_next_stage': {
                get().switchToNextstage();
                globalUpdateInterface.createSystemEvent('Switched to next stage', '', [], null);
                break;
            }
            case 'switch_to_previous_stage': {
                get().switchToPreviousstage();
                globalUpdateInterface.createSystemEvent('Switched to previous stage', '', [], null);
                break;
            }
            case 'delete_step': {
                get().deleteStep(step.stepId);
                globalUpdateInterface.createSystemEvent(`Deleted step: ${step.stepId}`, '', [], null);
                break;
            }
            case 'add_stage': {
                get().addstage(step.stageType, step.stageId);
                globalUpdateInterface.createSystemEvent(`Added stage: ${step.stageId}`, '', [], null);
                break;
            }
            case 'remove_stage': {
                get().removestage(step.stageId);
                globalUpdateInterface.createSystemEvent(`Removed stage: ${step.stageId}`, '', [], null);
                break;
            }
            case 'add_shot': {
                const actionId = get().addShot(step.shot);
                if (step.shot.type === 'code' || step.shot.type === SHOT_TYPES.ACTION) {
                    globalUpdateInterface.createAIWritingCode(`Added code shot: ${actionId}`, step.shot.content || '', [], actionId);
                } else {
                    globalUpdateInterface.createAIReplyingQuestion(`Added dialogue shot: ${actionId}`, step.shot.content || '', [], actionId);
                }
                break;
            }
            case 'add': {
                const actionId = step.storeId || uuidv4();
                get().addShot({
                    id: actionId,
                    type: step.shotType || 'text',
                    content: step.content || '',
                    metadata: step.metadata || {},
                });
                if (step.shotType === 'code' || step.shotType === SHOT_TYPES.ACTION) {
                    globalUpdateInterface.createAIGeneratingCode("", '', [], actionId);
                } else {
                    globalUpdateInterface.createAIGeneratingText("",  '', [], actionId);
                }
                break;
            }
            case 'next_event': {
                break;
            }
            case 'add_step_to_next': {
                // globalUpdateInterface.createSystemEvent('Added next step', '', [], null);
                break;
            }
            case 'is_thinking': {
                const actionId = step.storeId || uuidv4();
                get().addShot({
                    id: actionId,
                    type: 'thinking',
                    textArray: step.textArray || [`${step.agentName || 'AI'} is thinking...`],
                    agentName: step.agentName || 'AI',
                    customText: step.customText || null,
                    useWorkflowThinking: false // We'll handle thinking texts via textArray instead
                });
                globalUpdateInterface.createAICriticalThinking(`${step.agentName || 'AI'} is thinking...`, step.customText || '', [], actionId, true);
                break;
            }
            case 'finish_thinking': {
                get().finishThinking();
                globalUpdateInterface.createAICriticalThinking('Finished thinking', '', [], null, false);
                break;
            }
            case 'set_effect_as_thinking': {
                get().setEffectAsThinking(step.thinkingText);
                break;
            }
            case 'update_last_text': {
                get().updateLastText(step.text);
                break;
            }

            case 'remove': {
                get().removeShot(step.actionIdRef);
                globalUpdateInterface.createSystemEvent(`Removed shot: ${step.actionIdRef}`, '', [], null);
                break;
            }
            case 'end_step': {
                console.log(`Step ended: ${step.stepId || 'unknown'}`);
                globalUpdateInterface.createSystemEvent(`Step ended: ${step.stepId || 'unknown'}`, '', [], null);
                break;
            }
            case 'end_phase': {
                console.log(`Phase ended: ${step.phaseId || 'unknown'}`);
                globalUpdateInterface.createSystemEvent(`Phase ended: ${step.phaseId || 'unknown'}`, '', [], null);
                set(state => ({
                    steps: {
                        ...state.steps,
                        [state.currentStep]: {
                            ...state.steps[state.currentStep],
                            isCompleted: true
                        }
                    }
                }));
                if (step.keepDebugButtonVisible !== false) {
                    set({ debugButtonVisible: true });
                }
                break;
            }
            case 'set_completed_current_step': {
                get().markStepCompleted(get().currentStep);
                globalUpdateInterface.createSystemEvent(`Marked current step as completed`, '', [], null);
                break;
            }
            case 'set_completed_step': {
                get().markStepCompleted(step.stepId);
                globalUpdateInterface.createSystemEvent(`Marked step as completed: ${step.stepId}`, '', [], null);
                break;
            }
            case 'set_completed_stage': {
                get().markStageCompleted(step.stageId);
                globalUpdateInterface.createSystemEvent(`Marked stage as completed: ${step.stageId}`, '', [], null);
                break;
            }
            case 'exec': {
                const targetId = step.codecell_id === "lastAddedCellId"
                    ? get().lastAddedActionId
                    : step.codecell_id;
    
                if (targetId) {
                    console.log(`Executing code: ${targetId}`);
                    globalUpdateInterface.createAIRunningCode(`Executing...`, '', [], targetId, true);
                    const output = await get().execCodeCell(targetId, step.need_output, step.auto_debug);
                    console.log(`Execution completed: ${targetId}`, output);
                    globalUpdateInterface.createAIRunningCode(`Execution completed`, "", [], targetId, false);
                    return output;
                } else {
                    console.warn('Failed to execute code: Cell ID not found');
                    globalUpdateInterface.createSystemEvent('Execution failed: Cell ID not found', '', [], null);
                }
                break;
            }
            case 'update_title': {
                get().updateTitle(step.title);
                globalUpdateInterface.createSystemEvent(`Updated title: ${step.title}`, '', [], null);
                break;
            }
            default:
                console.warn(`Unknown sequence action: ${step.action}`);
                globalUpdateInterface.createSystemEvent(`Unknown action: ${step.action}`, '', [], null);
        }
    },

    /**
     * 处理剧本序列中的下一个步骤
     * 根据当前 activeSequence 与 sequenceIndex 获取步骤，并根据 action 执行相应操作
     */
    processNextSequenceStep: async () => {
        const { activeSequence, sequenceIndex } = get();
        if (!activeSequence || sequenceIndex >= activeSequence.steps.length) {
            // 序列执行完毕，重置 activeSequence 并调用回调（如有）
            set({ activeSequence: null });
            if (typeof get().onSequenceComplete === 'function') {
                get().onSequenceComplete();
            }
            return false;
        }
        const step = activeSequence.steps[sequenceIndex];
        console.log(`执行序列步骤 ${sequenceIndex + 1}/${activeSequence.steps.length}:`, step.action);
        const delay = step.delay || ANIMATION.SEQUENCE_DELAY;

        // 等待步骤执行完成
        await get().execAction(step);

        // 步骤执行完成，更新索引并延时处理下一个步骤
        set({ sequenceIndex: sequenceIndex + 1 });
        setTimeout(() => get().processNextSequenceStep(), delay);
        return true;
    },

    /**
     * 设置序列完成回调函数，在序列全部执行完毕后调用
     * @param {function} callback - 回调函数
     */
    setSequenceCompleteCallback: (callback) => {
        set({ onSequenceComplete: callback });
    },

    /**
     * 手动终止当前序列的执行，并调用终止回调（如有）
     * @returns {boolean} 是否成功终止序列
     */
    terminateSequence: () => {
        console.log('手动终止序列执行');
        set({ activeSequence: null, sequenceIndex: 0 });
        if (typeof get().onSequenceTerminate === 'function') {
            get().onSequenceTerminate();
        }
        return true;
    },

    /**
     * 设置序列终止回调函数，在序列被手动终止时调用
     * @param {function} callback - 回调函数
     */
    setSequenceTerminateCallback: (callback) => {
        set({ onSequenceTerminate: callback });
    },

    // ------------------------------
    // 导出功能
    // ------------------------------

    /**
     * 导出指定场景数据（包含场景ID、镜头及模式）
     * @param {string|null} stepId - 场景ID，默认当前场景
     * @returns {object|null} 导出的场景数据，若场景不存在则返回 null
     */
    exportstep: (stepId = null) => {
        const targetStepId = stepId || get().currentStep;
        const { steps } = get();
        if (!steps[targetStepId]) {
            console.warn(`场景 ${targetStepId} 不存在`);
            return null;
        }
        return {
            id: targetStepId,
            actions: steps[targetStepId].actions,
            mode: steps[targetStepId].mode
        };
    },

    /**
     * 导出完整剧本数据，包括所有场景及其顺序
     * @returns {object} 导出的剧本数据
     */
    exportScript: () => {
        const { steps, stepOrder } = get();
        return {
            steps: Object.keys(steps).map(stepId => ({
                id: stepId,
                actions: steps[stepId].actions,
                mode: steps[stepId].mode
            })),
            stepOrder
        };
    },

    // ------------------------------
    // stage（分镜）操作接口
    // ------------------------------

    /**
     * 切换当前分镜，同时保存当前分镜的镜头数据到 stages 中
     * @param {string} stageId - 目标分镜ID
     */
    switchstage: (stageId) => {
        set((state) => ({
            stages: {
                ...state.stages,
                [state.currentStage]: {
                    ...state.stages[state.currentStage],
                    actions: [...state.stageActions]
                }
            },
            currentStage: stageId,
            stageActions: state.stages[stageId]?.actions || []
        }));
    },

    /**
     * 向分镜中添加镜头
     * @param {string} content - 镜头内容
     * @param {string} type - 镜头类型，默认为 'text'
     * @param {object} metadata - 相关元数据
     * @param {string|null} stageId - 指定分镜ID，默认为当前分镜
     * @returns {string} 新增镜头的ID
     */
    addShotTostage: (content = '', type = 'text', metadata = {}, stageId = null) => {
        const id = uuidv4();
        const targetstage = stageId || get().currentStage;
        const mappedType = type === 'text' ? SHOT_TYPES.DIALOGUE :
            type === 'code' ? SHOT_TYPES.ACTION : type;
        const newShot = {
            id,
            content,
            type: mappedType,
            metadata,
            timestamp: Date.now(),
            mode: step_MODES.WRITING,
            isModified: false
        };
        // 如果指定分镜不是当前分镜，则更新对应 stages，否则直接更新 stageActions
        if (stageId && stageId !== get().currentStage) {
            set((state) => ({
                stages: {
                    ...state.stages,
                    [targetstage]: {
                        ...state.stages[targetstage],
                        actions: [...(state.stages[targetstage]?.actions || []), newShot]
                    }
                }
            }));
        } else {
            set((state) => ({
                stageActions: [...state.stageActions, newShot]
            }));
        }
        return id;
    },

    /**
     * 添加新的分镜（stage），更新 stageOrder 并设置默认状态
     * @param {string} stageType - 分镜类型，默认为 'stage'
     * @param {string|null} stageId - 指定ID，否则自动生成
     * @returns {string} 新分镜ID
     */
    addstage: (stageType = 'stage', stageId = null) => {
        const id = stageId || uuidv4();
        set((state) => {
            const newstages = {
                ...state.stages,
                [id]: { id, type: stageType, actionIds: [], mode: step_MODES.WRITING, isModified: false }
            };
            const newstageOrder = [...state.stageOrder];
            if (!newstageOrder.includes(id)) {
                newstageOrder.push(id);
            }
            return {
                stages: newstages,
                stageOrder: newstageOrder
            };
        });
        return id;
    },

    /**
     * 删除指定分镜；若删除当前分镜则切换回 'default'
     * @param {string} stageId - 分镜ID
     */
    removestage: (stageId) => {
        set((state) => {
            const newstages = { ...state.stages };
            delete newstages[stageId];
            let newcurrentStage = state.currentStage;
            let newstageActions = state.stageActions;
            if (state.currentStage === stageId) {
                newcurrentStage = 'default';
                newstageActions = newstages['default']?.actions || [];
            }
            return {
                stages: newstages,
                currentStage: newcurrentStage,
                stageActions: newstageActions
            };
        });
    },

    /**
     * 从分镜中移除指定镜头
     * @param {string} id - 镜头ID
     * @param {string|null} stageId - 指定分镜ID，默认为当前分镜
     */
    removeShotFromstage: (id, stageId = null) => {
        const targetstage = stageId || get().currentStage;
        if (stageId && stageId !== get().currentStage) {
            set((state) => ({
                stages: {
                    ...state.stages,
                    [targetstage]: {
                        ...state.stages[targetstage],
                        actions: (state.stages[targetstage]?.actions || []).filter(shot => shot.id !== id)
                    }
                }
            }));
        } else {
            set((state) => ({
                stageActions: state.stageActions.filter(shot => shot.id !== id)
            }));
        }
    },

    // ------------------------------
    // 上/下一个场景操作
    // ------------------------------

    /**
     * 切换到下一个场景
     */
    switchToNextstep: () => {
        set((state) => {
            const { currentStep, stepOrder, steps, actions } = state;
            const index = stepOrder.indexOf(currentStep);
            if (index === -1 || index >= stepOrder.length - 1) return {};
            const nextstepId = stepOrder[index + 1];
            return {
                steps: {
                    ...steps,
                    [currentStep]: { ...steps[currentStep], actions: [...actions] }
                },
                currentStep: nextstepId,
                actions: steps[nextstepId]?.actions || []
            };
        });
    },

    /**
     * 切换到上一个场景
     */
    switchToPreviousstep: () => {
        set((state) => {
            const { currentStep, stepOrder, steps, actions } = state;
            const index = stepOrder.indexOf(currentStep);
            if (index <= 0) return {};
            const prevstepId = stepOrder[index - 1];
            return {
                steps: {
                    ...steps,
                    [currentStep]: { ...steps[currentStep], actions: [...actions] }
                },
                currentStep: prevstepId,
                actions: steps[prevstepId]?.actions || []
            };
        });
    },

    getCurrentStepstatus: () => {
        const { currentStep, steps } = get();
        return steps[currentStep]?.mode || step_MODES.WRITING;
    },

    /**
     * 获取下一个场景的详细数据（若存在）
     * @returns {object|null} 下一个场景对象或 null
     */
    getNextstepDetails: () => {
        const { currentStep, stepOrder, steps } = get();
        const index = stepOrder.indexOf(currentStep);
        if (index !== -1 && index < stepOrder.length - 1) {
            const nextstepId = stepOrder[index + 1];
            return steps[nextstepId];
        }
        return null;
    },

    /**
     * 获取上一个场景的详细数据（若存在）
     * @returns {object|null} 上一个场景对象或 null
     */
    getPreviousstepDetails: () => {
        const { currentStep, stepOrder, steps } = get();
        const index = stepOrder.indexOf(currentStep);
        if (index > 0) {
            const prevstepId = stepOrder[index - 1];
            return steps[prevstepId];
        }
        return null;
    },

    // ------------------------------
    // 上/下一个分镜操作
    // ------------------------------

    /**
     * 切换到下一个分镜
     */
    switchToNextstage: () => {
        set((state) => {
            const { currentStage, stageOrder, stages, stageActions } = state;
            const index = stageOrder.indexOf(currentStage);
            if (index === -1 || index >= stageOrder.length - 1) return {};
            const nextstageId = stageOrder[index + 1];
            return {
                stages: {
                    ...stages,
                    [currentStage]: {
                        ...stages[currentStage],
                        actions: [...stageActions]
                    }
                },
                currentStage: nextstageId,
                stageActions: stages[nextstageId]?.actions || []
            };
        });
    },

    /**
     * 切换到上一个分镜
     */
    switchToPreviousstage: () => {
        set((state) => {
            const { currentStage, stageOrder, stages, stageActions } = state;
            const index = stageOrder.indexOf(currentStage);
            if (index <= 0) return {};
            const prevstageId = stageOrder[index - 1];
            return {
                stages: {
                    ...stages,
                    [currentStage]: {
                        ...stages[currentStage],
                        actions: [...stageActions]
                    }
                },
                currentStage: prevstageId,
                stageActions: stages[prevstageId]?.actions || []
            };
        });
    },

    /**
     * 获取下一个分镜的详细数据（若存在）
     * @returns {object|null} 下一个分镜对象或 null
     */
    getNextstageDetails: () => {
        const { currentStage, stageOrder, stages } = get();
        const index = stageOrder.indexOf(currentStage);
        if (index !== -1 && index < stageOrder.length - 1) {
            const nextstageId = stageOrder[index + 1];
            return stages[nextstageId];
        }
        return null;
    },

    /**
     * 获取上一个分镜的详细数据（若存在）
     * @returns {object|null} 上一个分镜对象或 null
     */
    getPreviousstageDetails: () => {
        const { currentStage, stageOrder, stages } = get();
        const index = stageOrder.indexOf(currentStage);
        if (index > 0) {
            const prevstageId = stageOrder[index - 1];
            return stages[prevstageId];
        }
        return null;
    },

    // ------------------------------
    // 调试功能
    // ------------------------------

    /**
     * 获取调试按钮的可见状态
     * @returns {boolean} 是否可见
     */
    getDebugButtonVisible: () => get().debugButtonVisible,

    /**
     * 设置调试按钮的可见状态
     * @param {boolean} visible - 是否可见
     */
    setDebugButtonVisible: (visible) => {
        set({ debugButtonVisible: visible });
    },

    // ------------------------------
    // 状态管理及场景/分镜完成标记
    // ------------------------------

    isStepCompleted: (stepId) => {
        const targetStepId = stepId || get().currentStep;
        const step = get().steps[targetStepId];
        return step && step.isCompleted === true;
    },

    markStepCompleted: (stepId) => {
        const targetStepId = stepId || get().currentStep;
        set(state => ({
            steps: {
                ...state.steps,
                [targetStepId]: {
                    ...state.steps[targetStepId],
                    isCompleted: true,
                    mode: step_MODES.DEDUCTION
                }
            }
        }));
        console.log(`markStepCompleted: ${targetStepId}`);
        return true;
    },

    markStepPaused: (stepId) => {
        const targetStepId = stepId || get().currentStep;
        set(state => ({
            steps: {
                ...state.steps,
                [targetStepId]: {
                    ...state.steps[targetStepId],
                    isCompleted: false,
                    mode: step_MODES.PAUSED
                }
            }
        }));
        console.log(`markStepPaused: ${targetStepId}`);
        return true;
    },

    /**
     * mode management
     */
    setStepMode: (stepId, mode) => {
        set(state => ({
            steps: {
                ...state.steps,
                [stepId]: {
                    ...state.steps[stepId],
                    mode: mode
                }
            }
        }));
        console.log(`setStepMode: ${stepId} to ${mode}`);
        return true;
    },

    setStageMode: (stageId, mode) => {
        set(state => ({
            stages: {
                ...state.stages,
                [stageId]: {
                    ...state.stages[stageId],
                    mode: mode
                }
            }
        }));
        console.log(`setStageMode: ${stageId} to ${mode}`);
        return true;
    },
    
    IsStepWriting: (stepId) => {
        const targetStepId = stepId || get().currentStep;
        return get().steps[targetStepId]?.mode === step_MODES.WRITING;
    },

    IsStepDeduction: (stepId) => {
        const targetStepId = stepId || get().currentStep;
        return get().steps[targetStepId]?.mode === step_MODES.DEDUCTION;
    },

    IsStepPaused: (stepId) => {
        const targetStepId = stepId || get().currentStep;
        return get().steps[targetStepId]?.mode === step_MODES.PAUSED;
    },

    IsStageWriting: (stageId) => {
        const targetStageId = stageId || get().currentStage;
        return get().stages[targetStageId]?.mode === step_MODES.WRITING;
    },
    
    IsStageDeduction: (stageId) => {
        const targetStageId = stageId || get().currentStage;
        return get().stages[targetStageId]?.mode === step_MODES.DEDUCTION;
    },

    IsStagePaused: (stageId) => {
        const targetStageId = stageId || get().currentStage;
        return get().stages[targetStageId]?.mode === step_MODES.PAUSED;
    },

    
    /**
     * 标记指定分镜为已完成
     * @param {string|null} stageId - 分镜ID，默认当前分镜
     * @returns {boolean} 是否成功标记
     */
    markStageCompleted: (stageId) => {
        const targetStageId = stageId || get().currentStage;
        set(state => ({
            stages: {
                ...state.stages,
                [targetStageId]: {
                    ...state.stages[targetStageId],
                    isCompleted: true,
                    mode: step_MODES.DEDUCTION
                }
            }
        }));
        console.log(`markStageCompleted: ${targetStageId}`);
        return true;
    },

    markStagePaused: (stageId) => {
        const targetStageId = stageId || get().currentStage;
        set(state => ({
            stages: {
                ...state.stages,
                [targetStageId]: {
                    ...state.stages[targetStageId],
                    isCompleted: false,
                    mode: step_MODES.PAUSED
                }
            }
        }));
        console.log(`markStagePaused: ${targetStageId}`);
        return true;
    },

    /**
     * 标记指定场景为未完成
     * @param {string} stepId - 场景ID，默认当前场景
     */
    markStepIncomplete: (stepId) => {
        set(state => ({
            steps: {
                ...state.steps,
                [stepId]: {
                    ...state.steps[stepId],
                    isCompleted: false,
                    mode: step_MODES.WRITING
                }
            }
        }));
    },
    // ------------------------------
    // 第一个/新场景及最后镜头操作
    // ------------------------------

    /**
     * 添加第一个场景的第一个镜头（编剧模式）
     * @param {string} content - 镜头内容
     * @param {string} type - 镜头类型
     * @param {object} metadata - 额外元数据
     * @param {string} stepId - 场景ID（可选）
     * @returns {object} 包含 stepId 和 actionId
     */
    addFirstStepFirstShot: (content = '', type = 'text', metadata = {}, stepId = null) => {
        // 创建或切换到第一个场景（默认ID 为 'first_step'）
        const targetStepId = stepId || 'first_step';
        get().initializeFirstStep(targetStepId, { mode: step_MODES.WRITING });
        // 添加第一个镜头，并标记 isFirstShot
        const actionId = get().createNewShot(type, content, {
            ...metadata,
            isFirstShot: true
        });
        console.log(`已添加第一个场景(${targetStepId})的第一个镜头(${actionId})`);
        return { stepId: targetStepId, actionId };
    },

    /**
     * 添加新场景和第一个镜头，同时将当前场景设置为演绎模式（只读）
     * @param {string} content - 新镜头内容
     * @param {string} type - 镜头类型
     * @param {object} metadata - 额外元数据
     * @returns {object} 包含新场景ID、镜头ID以及之前场景ID
     */
    addNewstepFirstShot: (content = '', type = 'text', metadata = {}) => {
        const previousstepId = get().currentStep;
        // 将当前场景设置为演绎模式（只读）
        get().setstepToDeductionMode(previousstepId);
        // 创建并切换到新场景（编剧模式）
        const newstepId = get().createAndswitchStep(null, { mode: step_MODES.WRITING });
        // 添加新场景的第一个镜头，并标记 isFirstShot
        const actionId = get().createNewShot(type, content, {
            ...metadata,
            isFirstShot: true
        });
        console.log(`已将场景(${previousstepId})设为演绎状态，并添加新场景(${newstepId})的第一个镜头(${actionId})`);
        return { stepId: newstepId, actionId, previousstepId };
    },

    /**
     * 添加当前场景的最后一个镜头，并设置当前场景为演绎模式且标记完成
     * @param {string} content - 镜头内容
     * @param {string} type - 镜头类型
     * @param {object} metadata - 额外元数据
     * @returns {string} 新镜头ID
     */
    addLastShotAndFinishstep: (content = '', type = 'text', metadata = {}) => {
        const currentStepId = get().currentStep;
        // 添加最后一个镜头，并标记 isLastShot
        const actionId = get().createNewShot(type, content, {
            ...metadata,
            isLastShot: true
        });
        // 标记当前场景为完成状态，并切换为演绎模式（只读）
        get().markStepCompleted(currentStepId);
        get().setstepToDeductionMode(currentStepId);
        console.log(`已添加场景(${currentStepId})的最后一个镜头(${actionId})并设置为演绎状态`);
        return actionId;
    },

    /**
     * 添加最后场景的最后一个镜头
     * @param {string} content - 镜头内容
     * @param {string} type - 镜头类型
     * @param {object} metadata - 额外元数据
     * @param {boolean} setAsCompleted - 是否将场景标记为已完成（默认为 true）
     * @returns {object} 包含 stepId 和 actionId
     */
    addFinalstepLastShot: (content = '', type = 'text', metadata = {}, setAsCompleted = true) => {
        const { stepOrder } = get();
        const laststepId = stepOrder[stepOrder.length - 1];
        // 切换到最后一个场景
        get().switchStep(laststepId);
        // 添加最后一个镜头，并标记 isFinalShot
        const actionId = get().createNewShot(type, content, {
            ...metadata,
            isFinalShot: true
        });
        // 如需要，标记场景为完成，并切换为演绎模式
        if (setAsCompleted) {
            get().markStepCompleted(laststepId);
            set(state => ({
                steps: {
                    ...state.steps,
                    [laststepId]: {
                        ...state.steps[laststepId],
                        mode: step_MODES.DEDUCTION
                    }
                }
            }));
        }
        console.log(`已添加最后场景(${laststepId})的最后一个镜头(${actionId})`);
        return { stepId: laststepId, actionId };
    },

    // ------------------------------
    // 场景模式管理（编剧模式 / 演绎模式）
    // ------------------------------

    /**
     * 检查指定场景是否处于演绎模式（只读）
     * @param {string|null} stepId - 场景ID，默认当前场景
     * @returns {boolean} 是否为演绎模式
     */
    isStepInDeductionMode: (stepId = null) => {
        const targetStepId = stepId || get().currentStep;
        const step = get().steps[targetStepId];
        return step && step.mode === step_MODES.DEDUCTION;
    },

    /**
     * 设置指定场景的模式（编剧 / 演绎）
     * 同步更新 notebookStore 中 cell 的可编辑状态
     * @param {string} mode - 目标模式，必须为 step_MODES.WRITING 或 step_MODES.DEDUCTION
     * @param {string|null} stepId - 场景ID，默认当前场景
     * @returns {boolean} 是否设置成功
     */
    setstepMode: (mode, stepId = null) => {
        if (mode !== step_MODES.WRITING && mode !== step_MODES.DEDUCTION) {
            console.warn(`无效的场景模式: ${mode}`);
            return false;
        }
        const targetStepId = stepId || get().currentStep;
        if (!get().steps[targetStepId]) {
            console.warn(`场景 ${targetStepId} 不存在`);
            return false;
        }
        set(state => ({
            steps: {
                ...state.steps,
                [targetStepId]: {
                    ...state.steps[targetStepId],
                    mode: mode
                }
            }
        }));
        // 如果修改的是当前场景，同步更新 notebookStore 中各 cell 的编辑属性
        if (targetStepId === get().currentStep) {
            const isEditable = mode === step_MODES.WRITING;
            const actionIds = get().actions.map(shot => shot.id);
            actionIds.forEach(id => {
                const cell = useNotebookStore.getState().cells.find(cell => cell.id === id);
                if (cell) {
                    useNotebookStore.getState().updateCellMetadata(id, {
                        ...cell.metadata,
                        enableEdit: isEditable
                    });
                }
            });
        }
        console.log(`已将场景(${targetStepId})设置为 ${mode} 模式`);
        return true;
    },

    /**
     * 设置当前场景为编剧模式
     * @param {string|null} stepId - 场景ID，默认当前场景
     * @returns {boolean} 是否设置成功
     */
    setstepToWritingMode: (stepId = null) => {
        return get().setstepMode(step_MODES.WRITING, stepId);
    },

    /**
     * 设置当前场景为演绎模式
     * @param {string|null} stepId - 场景ID，默认当前场景
     * @returns {boolean} 是否设置成功
     */
    setstepToDeductionMode: (stepId = null) => {
        return get().setstepMode(step_MODES.DEDUCTION, stepId);
    },

    // ------------------------------
    // 执行代码单元格
    // ------------------------------

    /**
     * 执行指定ID的代码单元格
     * @param {string} codecell_id - 要执行的单元格ID
     * @param {boolean} need_output - 是否需要输出
     * @param {boolean} auto_debug - 是否自动调试
     * @returns {Promise<any>} 返回执行结果的Promise
     */
    execCodeCell: async (codecell_id, need_output = true, auto_debug = false) => {
        if (!codecell_id) {
            console.warn('执行指令需要指定codecell_id');
            return Promise.resolve(false);
        }

        // 在执行前先设置显示模式为输出优先
        if (need_output) {
            useCodeStore.getState().setCellMode(codecell_id, 'output_only');
        }

        console.log(`执行单元格: ${codecell_id}, need_output: ${need_output}, auto_debug: ${auto_debug}`);

        try {
            // 使用await等待执行完成
            const result = await useCodeStore.getState().executeCell(codecell_id);
            console.log('执行结果:', result);

            if (auto_debug && result && result.success === false) {
                // 如果需要自动调试，设置当前单元格并触发调试
                setTimeout(() => {
                    useNotebookStore.getState().setCurrentCell(codecell_id);
                    sendCurrentCellExecuteCodeError_should_debug();
                }, 1000);
                return result.error; // 返回错误信息
            }

            // 确保执行完成后设置为输出模式
            if (need_output) {
                useCodeStore.getState().setCellMode(codecell_id, 'output_only');
            }

            if (!result.success) {
                return result.error; // 返回错误信息
            }

            return result.outputs; // 返回输出结果
        } catch (err) {
            console.error(`执行单元格失败: ${err.message}`);
            return Promise.resolve(false);
        }
    },

    updateTitle: (title) => {
        useNotebookStore.getState().updateTitle(title);
    },


}));

// 导出 store 实例供外部使用
export default useScriptStore;
