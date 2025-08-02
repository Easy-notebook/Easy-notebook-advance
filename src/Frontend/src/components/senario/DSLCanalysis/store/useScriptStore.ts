// ==============================================
// VDS Script Store - TypeScript Enhanced Version
// ==============================================
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// External dependencies
import useNotebookStore from '../../../../store/notebookStore';
import { sendCurrentCellExecuteCodeError_should_debug } from '../../../../store/autoActions';
import useCodeStore from '../../../../store/codeStore';
import globalUpdateInterface from '../../../../interfaces/globalUpdateInterface';

// ==============================================
// Types and Interfaces
// ==============================================

export interface ActionMetadata {
    [key: string]: any;
    isStep?: boolean;
    isChapter?: boolean;
    isSection?: boolean;
    chapterId?: string;
    sectionId?: string;
    chapterNumber?: number;
    sectionNumber?: number;
    finished_thinking?: boolean;
    thinkingText?: string;
}

export interface ScriptAction {
    id: string;
    type: string;
    content: string;
    metadata: ActionMetadata;
    mode?: string;
    isModified?: boolean;
    timestamp?: string;
    phaseId?: string | null;
    couldVisibleInWritingMode?: boolean;
    // Thinking cell specific properties
    agentName?: string;
    customText?: string | null;
    textArray?: string[];
    useWorkflowThinking?: boolean;
    // Code cell specific properties
    language?: string;
}

export interface ScriptStep {
    actionIds: string[];
    isModified?: boolean;
    isCompleted?: boolean;
    mode?: string;
}

export interface ExecutionStep {
    action: string;
    storeId?: string;
    contentType?: string;
    content?: string;
    metadata?: ActionMetadata;
    agentName?: string;
    customText?: string | null;
    textArray?: string[];
    thinkingText?: string;
    text?: string;
    actionIdRef?: string;
    stepId?: string;
    phaseId?: string;
    keepDebugButtonVisible?: boolean;
    codecell_id?: string;
    need_output?: boolean;
    auto_debug?: boolean;
    title?: string;
    updated_workflow?: any;
    updated_steps?: any[];
    stage_id?: string;
}

export interface ScriptStoreState {
    // UI State
    debugButtonVisible: boolean;
    onSequenceComplete: (() => void) | null;
    onSequenceTerminate: (() => void) | null;
    lastAddedActionId: string | null;
    
    // Script Management
    actions: ScriptAction[];
    steps: Record<string, ScriptStep>;
    
    // Counters
    chapterCounter: number;
    sectionCounter: number;
}

export interface ScriptStoreActions {
    // Helper functions
    getDefaultContent: (contentType?: string) => string;
    getCurrentStep: () => string | null;
    isStepInDeductionMode: () => boolean;
    getCurrentStepActions: () => ScriptAction[];
    
    // Action Management
    createNewAction: (type?: string, content?: string, metadata?: ActionMetadata) => string | null;
    addMultipleActions: (actions: Partial<ScriptAction>[]) => string[];
    addAction: (action: Partial<ScriptAction>, couldVisibleInWritingMode?: boolean) => string | null;
    updateAction: (actionId: string, updates?: Partial<ScriptAction>) => boolean;
    removeAction: (actionId: string) => boolean;
    
    // Specialized Operations
    updateLastText: (text: string) => void;
    finishThinking: () => void;
    setEffectAsThinking: (thinkingText?: string) => void;
    
    // Code Execution
    execCodeCell: (codecell_id: string, need_output?: boolean, auto_debug?: boolean) => Promise<any>;
    updateTitle: (title: string) => void;
    
    // Step Management
    markStepCompleted: (stepId: string) => void;
    
    // Main Execution Engine
    execAction: (step: ExecutionStep) => Promise<any>;
}

export type ScriptStore = ScriptStoreState & ScriptStoreActions;

// ==============================================
// Constants
// ==============================================

const STEP_MODES = {
    WRITING: 'writing',
    DEDUCTION: 'deduction',
    COMPLETED: 'completed'
} as const;

const CELL_TYPE_MAPPING: Record<string, string> = {
    text: 'markdown',
    code: 'code',
    Hybrid: 'Hybrid',
    outcome: 'outcome',
    error: 'error',
    thinking: 'thinking'
};

const ACTION_TYPES = {
    ADD_ACTION: 'add_action',
    ADD: 'add',
    NEW_CHAPTER: 'new_chapter',
    NEW_SECTION: 'new_section',
    NEXT_EVENT: 'next_event',
    IS_THINKING: 'is_thinking',
    FINISH_THINKING: 'finish_thinking',
    SET_EFFECT_AS_THINKING: 'set_effect_as_thinking',
    UPDATE_LAST_TEXT: 'update_last_text',
    REMOVE: 'remove',
    END_STEP: 'end_step',
    END_PHASE: 'end_phase',
    SET_COMPLETED_CURRENT_STEP: 'set_completed_current_step',
    SET_COMPLETED_STEP: 'set_completed_step',
    EXEC: 'exec',
    UPDATE_TITLE: 'update_title',
    UPDATE_WORKFLOW: 'update_workflow',
    UPDATE_STAGE_STEPS: 'update_stage_steps'
} as const;

// ==============================================
// Utility Functions
// ==============================================

const formatActionContent = (content: string, isStep = false): string => {
    if (!content) return '';
    if (isStep) {
        return content.startsWith('#') ? content : `### ${content}`;
    }
    return content;
};

const getDefaultContentByType = (contentType = 'text'): string => {
    const defaults: Record<string, string> = {
        text: '',
        code: '# Write your code here',
        outcome: 'Results will be displayed here',
        error: 'Error occurred',
        thinking: 'AI is thinking...'
    };
    return defaults[contentType] || '';
};

const createCellData = (actionId: string, action: Partial<ScriptAction>, cellType: string, content: string, currentStep: string | null) => {
    const baseCell: any = {
        id: actionId,
        type: cellType,
        content: content,
        outputs: [],
        enableEdit: cellType !== 'thinking',
        phaseId: currentStep,
        description: action.description || '',
        metadata: action.metadata || {}
    };

    // Add language property for code cells
    if (cellType === 'code' || cellType === 'Hybrid') {
        baseCell.language = action.language || 'python';
    }

    // Add special properties for thinking cells
    if (cellType === 'thinking') {
        baseCell.agentName = action.agentName || 'AI';
        baseCell.customText = action.customText || null;
        baseCell.textArray = action.textArray || [`${action.agentName || 'AI'} is thinking...`];
        baseCell.useWorkflowThinking = action.useWorkflowThinking || false;
    }

    return baseCell;
};

// ==============================================
// Store Implementation
// ==============================================

export const useScriptStore = create<ScriptStore>((set, get) => ({
    // ==============================================
    // State
    // ==============================================
    debugButtonVisible: true,
    onSequenceComplete: null,
    onSequenceTerminate: null,
    lastAddedActionId: null,
    
    actions: [],
    steps: {},
    
    chapterCounter: 0,
    sectionCounter: 0,
    
    // ==============================================
    // Helper Functions
    // ==============================================
    
    getDefaultContent: getDefaultContentByType,
    
    getCurrentStep: (): string | null => {
        try {
            // Import pipeline store dynamically to avoid circular dependency
            const { usePipelineStore } = require('./pipelineController.ts');
            const pipelineState = usePipelineStore.getState();
            return pipelineState.currentStepId || null;
        } catch (error) {
            console.warn('[useScriptStore] Could not get current step from pipeline store:', error);
            return null;
        }
    },
    
    isStepInDeductionMode: (): boolean => {
        const currentStep = get().getCurrentStep();
        const { steps } = get();
        return currentStep ? steps[currentStep]?.mode === STEP_MODES.DEDUCTION : false;
    },
    
    getCurrentStepActions: (): ScriptAction[] => {
        const currentStep = get().getCurrentStep();
        const { steps, actions } = get();
        if (!currentStep) return [];
        const actionIds = steps[currentStep]?.actionIds || [];
        return actions.filter(action => actionIds.includes(action.id));
    },
    
    // ==============================================
    // Action Management
    // ==============================================
    
    createNewAction: (type = 'text', content = '', metadata = {}): string | null => {
        const actionId = uuidv4();
        const actionContent = content || get().getDefaultContent(type);
        const newAction: Partial<ScriptAction> = {
            id: actionId,
            type: type,
            content: actionContent,
            metadata: metadata
        };
        return get().addAction(newAction);
    },

    addMultipleActions: (actions = []): string[] => {
        if (!Array.isArray(actions) || actions.length === 0) {
            console.warn('[useScriptStore] No valid actions provided for batch add');
            return [];
        }
        
        const addedActionIds: string[] = [];
        actions.forEach(action => {
            try {
                const actionId = get().addAction(action);
                if (actionId) {
                    addedActionIds.push(actionId);
                }
            } catch (error) {
                console.error('[useScriptStore] Failed to add action:', action, error);
            }
        });
        
        console.log(`[useScriptStore] Successfully added ${addedActionIds.length}/${actions.length} actions`);
        return addedActionIds;
    },

    addAction: (action: Partial<ScriptAction>, couldVisibleInWritingMode = true): string | null => {
        const currentStep = get().getCurrentStep();
        
        // Validation checks
        if (get().isStepInDeductionMode()) {
            console.warn(`[useScriptStore] Cannot add action: step(${currentStep}) is in deduction mode`);
            return null;
        }

        if (!action || typeof action !== 'object') {
            console.error('[useScriptStore] Invalid action object provided');
            return null;
        }

        try {
            const actionId = action.id || uuidv4();
            let content = action.content || get().getDefaultContent(action.type);
            
            // Format content for text actions
            if (action.type === 'text') {
                const isStep = action.metadata && action.metadata.isStep;
                content = formatActionContent(content, isStep);
            }

            // Map action type to cell type
            const cellType = CELL_TYPE_MAPPING[action.type || 'text'] || 'markdown';

            // Create action object for script store
            const newAction: ScriptAction = {
                id: actionId,
                type: action.type || 'text',
                content,
                metadata: action.metadata || {},
                mode: STEP_MODES.WRITING,
                isModified: false,
                timestamp: new Date().toISOString(),
                phaseId: currentStep,
                couldVisibleInWritingMode,
                ...(action.agentName && { agentName: action.agentName }),
                ...(action.customText !== undefined && { customText: action.customText }),
                ...(action.textArray && { textArray: action.textArray }),
                ...(action.useWorkflowThinking !== undefined && { useWorkflowThinking: action.useWorkflowThinking }),
                ...(action.language && { language: action.language })
            };

            // Create corresponding cell for notebook store
            const cellData = createCellData(actionId, action, cellType, content, currentStep);
            cellData.couldVisibleInWritingMode = couldVisibleInWritingMode;

            console.log('[useScriptStore] Adding action and cell:', {
                actionId,
                type: action.type,
                cellType,
                contentLength: content.length
            });

            // Add to notebook store first
            useNotebookStore.getState().addCell(cellData);

            // Update script store state
            set(state => {
                const updatedStepActionIds = [...(state.steps[currentStep || '']?.actionIds || []), actionId];
                const updatedActions = [...state.actions, newAction];

                return {
                    actions: updatedActions,
                    steps: {
                        ...state.steps,
                        ...(currentStep && {
                            [currentStep]: {
                                ...state.steps[currentStep],
                                actionIds: updatedStepActionIds,
                                isModified: true
                            }
                        })
                    },
                    lastAddedActionId: actionId
                };
            });

            // Verify cell was added successfully
            setTimeout(() => {
                const currentCells = useNotebookStore.getState().cells;
                const addedCell = currentCells.find(cell => cell.id === actionId);
                if (addedCell) {
                    console.log(`[useScriptStore] Successfully added cell. Total cells: ${currentCells.length}`);
                } else {
                    console.error('[useScriptStore] Failed to verify cell addition');
                }
            }, 100);

            return actionId;
            
        } catch (error) {
            console.error('[useScriptStore] Error adding action:', error);
            return null;
        }
    },

    updateAction: (actionId: string, updates: Partial<ScriptAction> = {}): boolean => {
        const currentStep = get().getCurrentStep();
        
        if (get().isStepInDeductionMode()) {
            console.warn(`[useScriptStore] Cannot update action: step(${currentStep}) is in deduction mode`);
            return false;
        }

        if (!actionId || !updates) {
            console.error('[useScriptStore] Invalid parameters for updateAction');
            return false;
        }

        try {
            // Update notebook store first
            const notebookCell = useNotebookStore.getState().cells.find(cell => cell.id === actionId);
            if (!notebookCell) {
                console.warn(`[useScriptStore] Action ${actionId} not found in notebook store`);
                return false;
            }

            if (updates.content !== undefined) {
                useNotebookStore.getState().updateCell(actionId, updates.content);
            }

            if (updates.metadata) {
                useNotebookStore.getState().updateCellMetadata(actionId, {
                    ...notebookCell.metadata,
                    ...updates.metadata
                });
            }

            // Update script store
            set(state => {
                const actionIndex = state.actions.findIndex(action => action.id === actionId);
                if (actionIndex === -1) {
                    console.warn(`[useScriptStore] Action ${actionId} not found in script store`);
                    return state;
                }

                const updatedActions = [...state.actions];
                updatedActions[actionIndex] = {
                    ...updatedActions[actionIndex],
                    ...updates,
                    content: updates.content !== undefined ? updates.content : updatedActions[actionIndex].content,
                    metadata: updates.metadata ? 
                        { ...updatedActions[actionIndex].metadata, ...updates.metadata } : 
                        updatedActions[actionIndex].metadata,
                    isModified: true
                };

                return {
                    actions: updatedActions,
                    steps: currentStep ? {
                        ...state.steps,
                        [currentStep]: {
                            ...state.steps[currentStep],
                            isModified: true
                        }
                    } : state.steps
                };
            });

            return true;
        } catch (error) {
            console.error('[useScriptStore] Error updating action:', error);
            return false;
        }
    },

    removeAction: (actionId: string): boolean => {
        const currentStep = get().getCurrentStep();
        
        if (get().isStepInDeductionMode()) {
            console.warn(`[useScriptStore] Cannot remove action: step(${currentStep}) is in deduction mode`);
            return false;
        }

        if (!actionId || !currentStep) {
            console.error('[useScriptStore] Invalid actionId or currentStep for removeAction');
            return false;
        }

        try {
            const { steps } = get();
            const currentActionIds = steps[currentStep]?.actionIds || [];
            
            if (!currentActionIds.includes(actionId)) {
                console.warn(`[useScriptStore] Action ${actionId} not found in current step`);
                return false;
            }

            // Remove from notebook store
            useNotebookStore.getState().deleteCell(actionId);

            // Update script store
            set(state => ({
                actions: state.actions.filter(action => action.id !== actionId),
                steps: {
                    ...state.steps,
                    [currentStep]: {
                        ...state.steps[currentStep],
                        actionIds: state.steps[currentStep].actionIds.filter(id => id !== actionId),
                        isModified: true
                    }
                }
            }));

            console.log(`[useScriptStore] Successfully removed action: ${actionId}`);
            return true;
        } catch (error) {
            console.error('[useScriptStore] Error removing action:', error);
            return false;
        }
    },

    // ==============================================
    // Specialized Operations
    // ==============================================

    updateLastText: (text: string): void => {
        try {
            const cells = useNotebookStore.getState().cells;
            const lastCell = cells[cells.length - 1];
            
            if (!lastCell) {
                console.warn('[useScriptStore] No cells found for updateLastText');
                return;
            }
            
            if (lastCell.type !== 'markdown') {
                console.warn(`[useScriptStore] Last cell is not markdown type, but ${lastCell.type}`);
                return;
            }
            
            useNotebookStore.getState().updateCell(lastCell.id, text);
            console.log(`[useScriptStore] Updated last text for cell: ${lastCell.id}`);
        } catch (error) {
            console.error('[useScriptStore] Error updating last text:', error);
        }
    },

    finishThinking: (): void => {
        try {
            const cells = useNotebookStore.getState().cells;
            const lastCell = cells[cells.length - 1];
            
            if (!lastCell) {
                console.warn('[useScriptStore] No cells found for finishThinking');
                return;
            }
            
            if (lastCell.type !== 'thinking') {
                console.warn(`[useScriptStore] Last cell is not thinking type, but ${lastCell.type}`);
                return;
            }

            // Remove from notebook store
            useNotebookStore.getState().deleteCell(lastCell.id);

            // Remove from script store
            set(state => {
                const updatedActions = state.actions.filter(action => action.id !== lastCell.id);
                const currentStep = get().getCurrentStep();
                const updatedStepActionIds = currentStep && state.steps[currentStep] ? 
                    state.steps[currentStep].actionIds.filter(id => id !== lastCell.id) : [];

                return {
                    actions: updatedActions,
                    steps: currentStep ? {
                        ...state.steps,
                        [currentStep]: {
                            ...state.steps[currentStep],
                            actionIds: updatedStepActionIds
                        }
                    } : state.steps
                };
            });

            console.log(`[useScriptStore] Finished thinking and removed cell: ${lastCell.id}`);
        } catch (error) {
            console.error('[useScriptStore] Error finishing thinking:', error);
        }
    },

    setEffectAsThinking: (thinkingText = "finished thinking"): void => {
        try {
            const cells = useNotebookStore.getState().cells;
            const lastCell = cells[cells.length - 1];
            
            if (!lastCell) {
                console.warn('[useScriptStore] No cells found for setEffectAsThinking');
                return;
            }
            
            if (lastCell.type !== 'code') {
                console.warn(`[useScriptStore] Last cell is not code type, but ${lastCell.type}`);
                return;
            }

            // Update cell metadata
            useNotebookStore.getState().updateCellMetadata(lastCell.id, {
                ...lastCell.metadata,
                finished_thinking: true,
                thinkingText: thinkingText
            });

            // Update script store action metadata
            set(state => {
                const updatedActions = state.actions.map(action => {
                    if (action.id === lastCell.id) {
                        return {
                            ...action,
                            metadata: {
                                ...action.metadata,
                                finished_thinking: true,
                                thinkingText: thinkingText
                            }
                        };
                    }
                    return action;
                });

                return { actions: updatedActions };
            });

            console.log(`[useScriptStore] Set effect as thinking for cell: ${lastCell.id}`);
        } catch (error) {
            console.error('[useScriptStore] Error setting effect as thinking:', error);
        }
    },

    // ==============================================
    // Code Execution
    // ==============================================

    execCodeCell: async (codecell_id: string, need_output = true, auto_debug = false): Promise<any> => {
        if (!codecell_id) {
            console.warn('[useScriptStore] execCodeCell requires codecell_id');
            return Promise.resolve(false);
        }

        try {
            console.log(`[useScriptStore] Executing cell: ${codecell_id}`, {
                need_output,
                auto_debug
            });

            // Set display mode if needed
            if (need_output) {
                useCodeStore.getState().setCellMode(codecell_id, 'output_only');
            }

            // Execute cell
            const result = await useCodeStore.getState().executeCell(codecell_id);
            console.log(`[useScriptStore] Execution result for ${codecell_id}:`, result);

            // Handle auto-debug
            if (auto_debug && result && result.success === false) {
                console.log(`[useScriptStore] Auto-debug triggered for cell: ${codecell_id}`);
                setTimeout(() => {
                    useNotebookStore.getState().setCurrentCell(codecell_id);
                    sendCurrentCellExecuteCodeError_should_debug();
                }, 1000);
                return result.error;
            }

            // Ensure output mode is set
            if (need_output) {
                useCodeStore.getState().setCellMode(codecell_id, 'output_only');
            }

            return result.success ? result.outputs : result.error;
        } catch (error) {
            console.error(`[useScriptStore] Error executing cell ${codecell_id}:`, error);
            return Promise.resolve(false);
        }
    },

    updateTitle: (title: string): void => {
        try {
            useNotebookStore.getState().updateTitle(title);
            console.log(`[useScriptStore] Updated title: ${title}`);
        } catch (error) {
            console.error('[useScriptStore] Error updating title:', error);
        }
    },

    // ==============================================
    // Step Management
    // ==============================================

    markStepCompleted: (stepId: string): void => {
        if (!stepId) {
            console.warn('[useScriptStore] markStepCompleted requires stepId');
            return;
        }

        set(state => ({
            steps: {
                ...state.steps,
                [stepId]: {
                    ...state.steps[stepId],
                    isCompleted: true,
                    mode: STEP_MODES.COMPLETED
                }
            }
        }));

        console.log(`[useScriptStore] Marked step as completed: ${stepId}`);
    },

    // ==============================================
    // Main Execution Engine
    // ==============================================

    execAction: async (step: ExecutionStep): Promise<any> => {
        if (!step || !step.action) {
            console.error('[useScriptStore] execAction requires step with action property');
            return;
        }

        const actionType = step.action;
        console.log(`[useScriptStore] Executing action: ${actionType}`, step);

        try {
            switch (actionType) {
                case ACTION_TYPES.ADD_ACTION: {
                    if (!step.action || typeof step.action !== 'object') {
                        console.error('[useScriptStore] Invalid action data for add_action');
                        break;
                    }
                    const actionId = get().addAction(step.action as any);
                    if ((step.action as any).type === 'code') {
                        globalUpdateInterface.createAIWritingCode(
                            `Added code action: ${actionId}`, 
                            (step.action as any).content || '', 
                            [], 
                            actionId
                        );
                    } else {
                        globalUpdateInterface.createAIReplyingQuestion(
                            `Added text action: ${actionId}`, 
                            (step.action as any).content || '', 
                            [], 
                            actionId
                        );
                    }
                    break;
                }

                case ACTION_TYPES.ADD: {
                    const actionId = step.storeId || uuidv4();
                    get().addAction({
                        id: actionId,
                        type: step.contentType || 'text',
                        content: step.content || '',
                        metadata: step.metadata || {},
                    });

                    if (step.contentType === 'code') {
                        globalUpdateInterface.createAIGeneratingCode("", '', [], actionId);
                    } else {
                        globalUpdateInterface.createAIGeneratingText("", '', [], actionId);
                    }
                    break;
                }

                case ACTION_TYPES.NEW_CHAPTER: {
                    const actionId = step.storeId || uuidv4();
                    const { chapterCounter } = get();
                    const newChapterNumber = chapterCounter + 1;
                    
                    set({ chapterCounter: newChapterNumber, sectionCounter: 0 });
                    
                    const chapterContent = `## Stage ${newChapterNumber}: ${step.content}`;
                    get().addAction({
                        id: actionId,
                        type: step.contentType || 'text',
                        content: chapterContent,
                        metadata: {
                            ...step.metadata,
                            isChapter: true,
                            chapterId: actionId,
                            chapterNumber: newChapterNumber
                        },
                    });
                    break;
                }

                case ACTION_TYPES.NEW_SECTION: {
                    const actionId = step.storeId || uuidv4();
                    const { sectionCounter } = get();
                    const newSectionNumber = sectionCounter + 1;
                    
                    set({ sectionCounter: newSectionNumber });
                    
                    const sectionContent = `### Step ${newSectionNumber}: ${step.content}`;
                    get().addAction({
                        id: actionId,
                        type: step.contentType || 'text',
                        content: sectionContent,
                        metadata: {
                            ...step.metadata,
                            isSection: true,
                            sectionId: actionId,
                            sectionNumber: newSectionNumber
                        },
                    });
                    break;
                }

                case ACTION_TYPES.IS_THINKING: {
                    const actionId = step.storeId || uuidv4();
                    get().addAction({
                        id: actionId,
                        type: 'thinking',
                        textArray: step.textArray || [`${step.agentName || 'AI'} is thinking...`],
                        agentName: step.agentName || 'AI',
                        customText: step.customText || null,
                        useWorkflowThinking: false
                    });
                    globalUpdateInterface.createAICriticalThinking(
                        `${step.agentName || 'AI'} is thinking...`, 
                        step.customText || '', 
                        [], 
                        actionId, 
                        true
                    );
                    break;
                }

                case ACTION_TYPES.FINISH_THINKING: {
                    get().finishThinking();
                    globalUpdateInterface.createAICriticalThinking('Finished thinking', '', [], null, false);
                    break;
                }

                case ACTION_TYPES.SET_EFFECT_AS_THINKING: {
                    get().setEffectAsThinking(step.thinkingText);
                    break;
                }

                case ACTION_TYPES.UPDATE_LAST_TEXT: {
                    if (step.text) {
                        get().updateLastText(step.text);
                    }
                    break;
                }

                case ACTION_TYPES.REMOVE: {
                    if (step.actionIdRef) {
                        get().removeAction(step.actionIdRef);
                        globalUpdateInterface.createSystemEvent(`Removed action: ${step.actionIdRef}`, '', [], null);
                    }
                    break;
                }

                case ACTION_TYPES.END_STEP: {
                    console.log(`[useScriptStore] Step ended: ${step.stepId || 'unknown'}`);
                    globalUpdateInterface.createSystemEvent(`Step ended: ${step.stepId || 'unknown'}`, '', [], null);
                    break;
                }

                case ACTION_TYPES.END_PHASE: {
                    console.log(`[useScriptStore] Phase ended: ${step.phaseId || 'unknown'}`);
                    globalUpdateInterface.createSystemEvent(`Phase ended: ${step.phaseId || 'unknown'}`, '', [], null);
                    
                    const currentStep = get().getCurrentStep();
                    if (currentStep) {
                        set(state => ({
                            steps: {
                                ...state.steps,
                                [currentStep]: {
                                    ...state.steps[currentStep],
                                    isCompleted: true
                                }
                            }
                        }));
                    }

                    if (step.keepDebugButtonVisible !== false) {
                        set({ debugButtonVisible: true });
                    }
                    break;
                }

                case ACTION_TYPES.SET_COMPLETED_CURRENT_STEP: {
                    const currentStep = get().getCurrentStep();
                    if (currentStep) {
                        get().markStepCompleted(currentStep);
                        globalUpdateInterface.createSystemEvent('Marked current step as completed', '', [], null);
                    }
                    break;
                }

                case ACTION_TYPES.SET_COMPLETED_STEP: {
                    if (step.stepId) {
                        get().markStepCompleted(step.stepId);
                        globalUpdateInterface.createSystemEvent(`Marked step as completed: ${step.stepId}`, '', [], null);
                    }
                    break;
                }

                case ACTION_TYPES.EXEC: {
                    const targetId = step.codecell_id === "lastAddedCellId"
                        ? get().lastAddedActionId
                        : step.codecell_id;

                    if (targetId) {
                        console.log(`[useScriptStore] Executing code: ${targetId}`);
                        globalUpdateInterface.createAIRunningCode('Executing...', '', [], targetId, true);
                        
                        const output = await get().execCodeCell(targetId, step.need_output, step.auto_debug);
                        
                        console.log(`[useScriptStore] Execution completed: ${targetId}`, output);
                        globalUpdateInterface.createAIRunningCode('Execution completed', "", [], targetId, false);
                        
                        return output;
                    } else {
                        console.warn('[useScriptStore] Failed to execute code: Cell ID not found');
                        globalUpdateInterface.createSystemEvent('Execution failed: Cell ID not found', '', [], null);
                    }
                    break;
                }

                case ACTION_TYPES.UPDATE_TITLE: {
                    if (step.title) {
                        get().updateTitle(step.title);
                        globalUpdateInterface.createSystemEvent(`Updated title: ${step.title}`, '', [], null);
                    }
                    break;
                }

                case ACTION_TYPES.UPDATE_WORKFLOW: {
                    console.log('[useScriptStore] Received workflow update:', step.updated_workflow);
                    
                    // Import stores dynamically to avoid circular dependency
                    const { useWorkflowPanelStore } = await import('../../../Notebook/store/workflowPanelStore');
                    
                    const workflowPanelStore = useWorkflowPanelStore.getState();
                    
                    // Set up workflow update confirmation
                    workflowPanelStore.setPendingWorkflowUpdate(step.updated_workflow);
                    workflowPanelStore.setShowWorkflowConfirm(true);
                    
                    // Set up confirmation handlers
                    workflowPanelStore.setOnConfirmWorkflowUpdate(async () => {
                        console.log('%c✅ USER CONFIRMED WORKFLOW UPDATE ✅', 'color: #27ae60; font-weight: bold; font-size: 16px;');
                        
                        if (step.updated_workflow) {
                            const { useWorkflowStateMachine } = await import('./workflowStateMachine.ts');
                            const { usePipelineStore } = await import('./pipelineController.ts');
                            
                            const stateMachine = useWorkflowStateMachine.getState();
                            const currentPipelineState = usePipelineStore.getState();
                            
                            // Mark current step as completed
                            const currentStepId = currentPipelineState.currentStepId;
                            const currentStageId = currentPipelineState.currentStageId;
                            
                            if (currentStepId) {
                                currentPipelineState.markStepCompleted(currentStepId);
                                console.log('[useScriptStore] Marked current step as completed after workflow update:', currentStepId);
                            }
                            
                            // Update AI Planning Context if available
                            try {
                                const { useAIPlanningContextStore } = await import('./aiPlanningContext');
                                const aiPlanningStore = useAIPlanningContextStore.getState();
                                if (aiPlanningStore.clearAllStageStatus) {
                                    aiPlanningStore.clearAllStageStatus();
                                }
                            } catch (error) {
                                console.warn('[useScriptStore] Could not update AI Planning Context:', error);
                            }
                            
                            // Dispatch workflow completion event
                            if (currentStepId && currentStageId) {
                                window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                                    detail: { 
                                        stepId: currentStepId, 
                                        result: { 
                                            targetAchieved: true, 
                                            workflowUpdated: true,
                                            newWorkflow: step.updated_workflow 
                                        },
                                        stageId: currentStageId,
                                        timestamp: Date.now()
                                    }
                                }));
                            }
                            
                            // Determine next stage
                            const newWorkflowStages = step.updated_workflow.stages || [];
                            const nextStageId = newWorkflowStages.length > 0 ? newWorkflowStages[0].id : null;
                            
                            console.log('[useScriptStore] Processing workflow update:', {
                                workflow: step.updated_workflow.name,
                                nextStageId
                            });
                            
                            // Handle workflow update through state machine
                            stateMachine.handleWorkflowUpdate(step.updated_workflow, nextStageId);
                            
                            // Re-enable auto-advance
                            setTimeout(() => {
                                console.log('=== [useScriptStore] RE-ENABLING AUTO-ADVANCE AFTER WORKFLOW UPDATE ===');
                                console.log('[useScriptStore] About to call enableAutoAdvanceAfterConfirmation');
                                console.log('[useScriptStore] State machine state:', {
                                    currentState: stateMachine.currentState,
                                    currentStageId: stateMachine.currentStageId,
                                    autoAdvanceEnabled: stateMachine.autoAdvanceEnabled
                                });
                                stateMachine.enableAutoAdvanceAfterConfirmation();
                                console.log('[useScriptStore] enableAutoAdvanceAfterConfirmation called successfully');
                            }, 100);
                        }
                        
                        // Clean up confirmation dialog
                        workflowPanelStore.setShowWorkflowConfirm(false);
                        workflowPanelStore.setPendingWorkflowUpdate(null);
                        workflowPanelStore.setWorkflowUpdated(true);
                        workflowPanelStore.incrementWorkflowUpdateCount();
                        
                        globalUpdateInterface.createSystemEvent('Workflow updated successfully, auto-advance re-enabled', '', [], null);
                    });
                    
                    workflowPanelStore.setOnRejectWorkflowUpdate(async () => {
                        console.log('[useScriptStore] User rejected workflow update');
                        
                        // Re-enable auto-advance
                        console.log('=== [useScriptStore] RE-ENABLING AUTO-ADVANCE AFTER WORKFLOW REJECTION ===');
                        const { useWorkflowStateMachine } = await import('./workflowStateMachine.ts');
                        const stateMachine = useWorkflowStateMachine.getState();
                        console.log('[useScriptStore] About to call enableAutoAdvanceAfterConfirmation (rejection case)');
                        console.log('[useScriptStore] State machine state:', {
                            currentState: stateMachine.currentState,
                            currentStageId: stateMachine.currentStageId,
                            autoAdvanceEnabled: stateMachine.autoAdvanceEnabled
                        });
                        stateMachine.enableAutoAdvanceAfterConfirmation();
                        console.log('[useScriptStore] enableAutoAdvanceAfterConfirmation called successfully (rejection case)');
                        
                        // Clean up confirmation dialog
                        workflowPanelStore.setShowWorkflowConfirm(false);
                        workflowPanelStore.setPendingWorkflowUpdate(null);
                        
                        globalUpdateInterface.createSystemEvent('Workflow update rejected by user, auto-advance restored', '', [], null);
                    });
                    
                    globalUpdateInterface.createSystemEvent('Workflow update received, awaiting user confirmation', '', [], null);
                    break;
                }

                case ACTION_TYPES.UPDATE_STAGE_STEPS: {
                    console.log('[useScriptStore] Received stage steps update:', step.updated_steps);
                    
                    const { usePipelineStore } = await import('./pipelineController.ts');
                    const { useWorkflowStateMachine } = await import('./workflowStateMachine.ts');
                    
                    const currentPipelineState = usePipelineStore.getState();
                    const stateMachine = useWorkflowStateMachine.getState();
                    
                    if (step.updated_steps && step.stage_id) {
                        console.log(`[useScriptStore] Processing stage steps update for ${step.stage_id}:`, step.updated_steps);
                        
                        // Find next uncompleted step
                        const completedSteps = currentPipelineState.completedSteps || [];
                        const currentStepId = currentPipelineState.currentStepId;
                        
                        // First check if current step should be marked as completed
                        if (currentStepId) {
                            const currentStepInfo = step.updated_steps.find((stepInfo: any) => {
                                const stepId = stepInfo.step_id || stepInfo.id;
                                return stepId === currentStepId;
                            });
                            
                            // If current step is marked as completed in the update, mark it completed
                            if (currentStepInfo && currentStepInfo.status === 'completed' && !completedSteps.includes(currentStepId)) {
                                console.log(`[useScriptStore] Marking current step as completed: ${currentStepId}`);
                                currentPipelineState.markStepCompleted(currentStepId);
                            }
                        }
                        
                        // Find next uncompleted step (now including current step if it's still not completed)
                        const nextUncompletedStep = step.updated_steps.find((stepInfo: any) => {
                            const stepId = stepInfo.step_id || stepInfo.id;
                            return !currentPipelineState.completedSteps.includes(stepId) && 
                                   stepInfo.status !== 'completed' &&
                                   stepId !== 'section_1_workflow_initialization';
                        });
                        
                        const nextStepId = nextUncompletedStep ? 
                            (nextUncompletedStep.step_id || nextUncompletedStep.id) : null;
                        
                        console.log(`[useScriptStore] Next step to execute: ${nextStepId || 'None found'}`);
                        
                        // Handle stage steps update through state machine
                        stateMachine.handleStageStepsUpdate(step.stage_id, step.updated_steps, nextStepId);
                        
                        globalUpdateInterface.createSystemEvent(
                            `Stage steps updated for ${step.stage_id}${nextStepId ? `, proceeding to ${nextStepId}` : ''}`, 
                            '', [], null
                        );
                    }
                    break;
                }

                case ACTION_TYPES.NEXT_EVENT: {
                    // No-op for next event
                    break;
                }

                default:
                    console.warn(`[useScriptStore] Unknown action type: ${actionType}`);
                    globalUpdateInterface.createSystemEvent(`Unknown action: ${actionType}`, '', [], null);
            }

            console.log(`[useScriptStore] Successfully executed action: ${actionType}`);
        } catch (error) {
            console.error(`[useScriptStore] Error executing action ${actionType}:`, error);
            globalUpdateInterface.createSystemEvent(`Error executing action ${actionType}: ${error.message}`, '', [], null);
            throw error;
        }
    }
}));

// Export the store
export default useScriptStore;