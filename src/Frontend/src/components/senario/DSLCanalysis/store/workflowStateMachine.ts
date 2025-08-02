/**
 * Workflow State Machine Store - TypeScript Version
 * 
 * This module provides a finite state machine for managing workflow execution states,
 * step transitions, stage completions, and auto-advance logic using Zustand.
 * 
 * States: IDLE -> STEP_EXECUTING -> STEP_COMPLETED -> STAGE_COMPLETED -> WORKFLOW_COMPLETED
 * 
 * @author Hu Silan
 * @project Easy-notebook
 * @file workflowStateMachine.ts
 */
import { create } from 'zustand';

// ==============================================
// Types and Interfaces
// ==============================================

export interface WorkflowStep {
    step_id: string;
    id?: string;
    status?: string;
    title?: string;
    description?: string;
    index?: number;
}

export interface WorkflowStage {
    id: string;
    title?: string;
    description?: string;
    steps: WorkflowStep[];
}

export interface WorkflowTemplate {
    name: string;
    stages: WorkflowStage[];
}

export interface ExecutionHistoryEntry {
    timestamp: number;
    fromState: string;
    toState: string;
    event: string;
    payload: any;
}

export interface StepResult {
    status: string;
    reason?: string;
    error?: string;
    timestamp?: string;
    targetAchieved?: boolean;
    workflowUpdated?: boolean;
    newWorkflow?: WorkflowTemplate;
}

// Store references interfaces
export interface StoreReference {
    getState: () => any;
    setState?: (state: any) => void;
}

// ==============================================
// Constants
// ==============================================

export const WORKFLOW_STATES = {
    IDLE: 'idle',
    STEP_EXECUTING: 'step_executing',
    STEP_COMPLETED: 'step_completed',
    STEP_FAILED: 'step_failed',
    STAGE_COMPLETED: 'stage_completed',
    WORKFLOW_COMPLETED: 'workflow_completed',
    CANCELLED: 'cancelled'
} as const;

export type WorkflowState = typeof WORKFLOW_STATES[keyof typeof WORKFLOW_STATES];

export const EVENTS = {
    START: 'START',
    START_STEP: 'START_STEP',
    COMPLETE_STEP: 'COMPLETE_STEP',
    FAIL_STEP: 'FAIL_STEP',
    COMPLETE_STAGE: 'COMPLETE_STAGE',
    COMPLETE_WORKFLOW: 'COMPLETE_WORKFLOW',
    CANCEL: 'CANCEL',
    RESET: 'RESET',
    AUTO_ADVANCE_STEP: 'AUTO_ADVANCE_STEP',
    AUTO_ADVANCE_STAGE: 'AUTO_ADVANCE_STAGE',
    WORKFLOW_UPDATE: 'WORKFLOW_UPDATE',
    STAGE_STEPS_UPDATE: 'STAGE_STEPS_UPDATE'
} as const;

export type WorkflowEvent = typeof EVENTS[keyof typeof EVENTS];

// State transition rules
const STATE_TRANSITIONS: Record<WorkflowState, Partial<Record<WorkflowEvent, WorkflowState>>> = {
    [WORKFLOW_STATES.IDLE]: {
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
    },
    [WORKFLOW_STATES.STEP_EXECUTING]: {
        [EVENTS.COMPLETE_STEP]: WORKFLOW_STATES.STEP_COMPLETED,
        [EVENTS.FAIL_STEP]: WORKFLOW_STATES.STEP_FAILED,
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.WORKFLOW_UPDATE]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.STAGE_STEPS_UPDATE]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
    },
    [WORKFLOW_STATES.STEP_COMPLETED]: {
        [EVENTS.AUTO_ADVANCE_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.COMPLETE_STAGE]: WORKFLOW_STATES.STAGE_COMPLETED,
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
    },
    [WORKFLOW_STATES.STEP_FAILED]: {
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE
    },
    [WORKFLOW_STATES.STAGE_COMPLETED]: {
        [EVENTS.AUTO_ADVANCE_STAGE]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.COMPLETE_WORKFLOW]: WORKFLOW_STATES.WORKFLOW_COMPLETED,
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
    },
    [WORKFLOW_STATES.WORKFLOW_COMPLETED]: {
        [EVENTS.COMPLETE_WORKFLOW]: WORKFLOW_STATES.WORKFLOW_COMPLETED,
        [EVENTS.WORKFLOW_UPDATE]: WORKFLOW_STATES.IDLE,
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE
    },
    [WORKFLOW_STATES.CANCELLED]: {
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE,
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING
    }
};

// ==============================================
// Store State Interface
// ==============================================

export interface WorkflowStateMachineState {
    // Current state machine state
    currentState: WorkflowState;
    
    // Current execution context
    currentStageId: string | null;
    currentStepId: string | null;
    currentStepIndex: number;
    
    // Execution history and tracking
    executionHistory: ExecutionHistoryEntry[];
    completedSteps: string[];
    completedStages: string[];
    failedSteps: string[];
    
    // Auto-advance settings
    autoAdvanceEnabled: boolean;
    autoAdvanceDelay: number;
    
    // Integration with other stores
    aiPlanningStore: StoreReference | null;
    pipelineStore: StoreReference | null;
}

export interface WorkflowStateMachineActions {
    // State transition
    transition: (event: WorkflowEvent, payload?: any) => boolean;
    executeStateEffects: (state: WorkflowState, payload?: any) => void;
    
    // Public API methods
    startStep: (stepId: string, stageId?: string, stepIndex?: number) => boolean;
    completeStep: (stepId?: string, result?: StepResult) => boolean;
    failStep: (stepId?: string, error?: Error | string) => boolean;
    completeStage: (stageId?: string) => boolean;
    cancel: () => boolean;
    reset: () => boolean;
    
    // Workflow update handlers
    handleWorkflowUpdate: (workflowTemplate: WorkflowTemplate, nextStageId?: string) => boolean;
    handleStageStepsUpdate: (stageId: string, updatedSteps: WorkflowStep[], nextStepId?: string) => boolean;
    enableAutoAdvanceAfterConfirmation: () => void;
    
    // Auto-advance logic
    autoAdvanceToNextStep: () => boolean;
    autoAdvanceToNextStage: () => boolean;
    
    // State check methods
    canAutoAdvanceToNextStep: () => boolean;
    canAutoAdvanceToNextStage: () => boolean;
    isCurrentStageCompleted: () => boolean;
    isWorkflowCompleted: () => boolean;
    
    // Helper methods
    getNextStep: () => (WorkflowStep & { index: number }) | null;
    getNextStage: () => WorkflowStage | null;
    
    // Integration methods
    notifyStepStarted: (stepId: string, stageId?: string) => void;
    notifyStepCompleted: (stepId: string, result?: StepResult) => void;
    notifyStepFailed: (stepId: string, error?: Error | string) => void;
    notifyStageCompleted: (stageId: string) => void;
    notifyWorkflowCompleted: () => void;
    notifyCancelled: () => void;
    
    // Store integration setup
    setStoreReferences: (aiPlanningStore: StoreReference, pipelineStore: StoreReference) => void;
    
    // Configuration methods
    setAutoAdvanceEnabled: (enabled: boolean) => void;
    setAutoAdvanceDelay: (delay: number) => void;
    
    // Debug and monitoring methods
    getCurrentContext: () => any;
    getExecutionHistory: () => ExecutionHistoryEntry[];
}

export type WorkflowStateMachine = WorkflowStateMachineState & WorkflowStateMachineActions;

// ==============================================
// Store Implementation
// ==============================================

export const useWorkflowStateMachine = create<WorkflowStateMachine>((set, get) => ({
    // ==============================================
    // State
    // ==============================================
    currentState: WORKFLOW_STATES.IDLE,
    
    currentStageId: null,
    currentStepId: null,
    currentStepIndex: 0,
    
    executionHistory: [],
    completedSteps: [],
    completedStages: [],
    failedSteps: [],
    
    autoAdvanceEnabled: true,
    autoAdvanceDelay: 1000,
    
    aiPlanningStore: null,
    pipelineStore: null,
    
    // ==============================================
    // Core State Machine Logic
    // ==============================================
    
    transition: (event: WorkflowEvent, payload: any = {}): boolean => {
        const currentState = get().currentState;
        const nextState = STATE_TRANSITIONS[currentState]?.[event];
        
        if (!nextState) {
             return false;
        }
        
        // Update state and execute side effects
        set(state => ({
            currentState: nextState,
            executionHistory: [
                ...state.executionHistory,
                {
                    timestamp: Date.now(),
                    fromState: currentState,
                    toState: nextState,
                    event,
                    payload
                }
            ]
        }));
        
        // Execute side effects based on new state
        get().executeStateEffects(nextState, payload);
        
        return true;
    },
    
    executeStateEffects: (state: WorkflowState, payload: any = {}): void => {
        const effects: Record<WorkflowState, () => void> = {
            [WORKFLOW_STATES.STEP_EXECUTING]: () => {
                const { stepId, stageId, stepIndex } = payload;                
                set({
                    currentStepId: stepId,
                    currentStageId: stageId || get().currentStageId,
                    currentStepIndex: stepIndex !== undefined ? stepIndex : get().currentStepIndex
                });
                
                get().notifyStepStarted(stepId, stageId);
            },
            
            [WORKFLOW_STATES.STEP_COMPLETED]: () => {
                const { stepId, result } = payload;
                const currentStepId = get().currentStepId;
                const stepToComplete = stepId || currentStepId;
                
                if (!stepToComplete) {
                    console.warn('[WorkflowStateMachine] No step ID available for completion');
                    return;
                }
                
                set(state => ({
                    completedSteps: state.completedSteps.includes(stepToComplete) 
                        ? state.completedSteps 
                        : [...state.completedSteps, stepToComplete]
                }));
                
                get().notifyStepCompleted(stepToComplete, result);
                
                // Check if step result contains workflow update
                const hasWorkflowUpdate = result?.workflowUpdated && result?.newWorkflow;
                if (hasWorkflowUpdate) {
                    set({ autoAdvanceEnabled: false });
                    get().handleWorkflowUpdate(result.newWorkflow, result.nextStageId);
                    return;
                }
                
                // Check for auto-advance to next step (only if no workflow update)
                const canAutoAdvance = get().autoAdvanceEnabled && get().canAutoAdvanceToNextStep();
                
                
                if (canAutoAdvance) {
                    setTimeout(() => {
                        console.log('%c🚀 AUTO-ADVANCING TO NEXT STEP', 'color: #00b894; font-weight: bold; font-size: 12px;');
                        get().autoAdvanceToNextStep();
                    }, get().autoAdvanceDelay);
                }
                
                // Check if stage is completed after a delay to allow state updates to propagate
                setTimeout(() => {
                    const isStageCompleted = get().isCurrentStageCompleted();
                    console.log(
                        `%c🏁 STAGE COMPLETION CHECK (DELAYED)\n` +
                        `%c📁 Stage: ${get().currentStageId}\n` +
                        `%c✅ Completed: ${isStageCompleted}`,
                        'color: #fdcb6e; font-weight: bold;',
                        'color: #6c5ce7; font-weight: bold;',
                        'color: #00b894; font-weight: bold;'
                    );
                    
                    if (isStageCompleted) {
                        console.log('%c🎉 TRANSITIONING TO STAGE COMPLETED', 'color: #fd79a8; font-weight: bold; font-size: 12px;');
                        get().transition(EVENTS.COMPLETE_STAGE, { stageId: get().currentStageId });
                    }
                }, 300); // Wait for all state updates to complete
            },
            
            [WORKFLOW_STATES.STEP_FAILED]: () => {
                const { stepId, error } = payload;
                const currentStepId = get().currentStepId;
                const stepToFail = stepId || currentStepId;
                
                if (!stepToFail) {
                    console.warn('[WorkflowStateMachine] No step ID available for failure');
                    return;
                }
                
                set(state => ({
                    failedSteps: state.failedSteps.includes(stepToFail)
                        ? state.failedSteps
                        : [...state.failedSteps, stepToFail]
                }));
                
                get().notifyStepFailed(stepToFail, error);
            },
            
            [WORKFLOW_STATES.STAGE_COMPLETED]: () => {
                const { stageId } = payload;
                const currentStageId = get().currentStageId;
                const stageToComplete = stageId || currentStageId;
                
                if (!stageToComplete) {
                    console.warn('[WorkflowStateMachine] No stage ID available for completion');
                    return;
                }
                
                set(state => ({
                    completedStages: state.completedStages.includes(stageToComplete)
                        ? state.completedStages
                        : [...state.completedStages, stageToComplete]
                }));
                
                get().notifyStageCompleted(stageToComplete);
                
                // Check for auto-advance to next stage
                if (get().autoAdvanceEnabled && get().canAutoAdvanceToNextStage()) {
                    setTimeout(() => {
                        get().autoAdvanceToNextStage();
                    }, get().autoAdvanceDelay);
                }
                
                // Check if workflow is completed
                if (get().isWorkflowCompleted()) {
                    get().transition(EVENTS.COMPLETE_WORKFLOW);
                }
            },
            
            [WORKFLOW_STATES.WORKFLOW_COMPLETED]: () => {
                get().notifyWorkflowCompleted();
            },
            
            [WORKFLOW_STATES.CANCELLED]: () => {
                get().notifyCancelled();
            },
            
            [WORKFLOW_STATES.IDLE]: () => {
                // No specific effects for idle state
            }
        };
        
        // Handle special update events regardless of state
        const updateHandlers: Record<string, (payload: any) => void> = {
            [EVENTS.WORKFLOW_UPDATE]: (payload) => {
                const { workflowTemplate, nextStageId } = payload;
                
                set({
                    currentStageId: nextStageId || workflowTemplate?.stages?.[0]?.id || null,
                    currentStepId: null,
                    currentStepIndex: 0,
                    completedSteps: [],
                    completedStages: [],
                    failedSteps: [],
                    autoAdvanceEnabled: false  // Disable temporarily, will be re-enabled by enableAutoAdvanceAfterConfirmation
                });
                
                // Update workflow template in pipeline store
                const pipelineStore = get().pipelineStore;
                if (pipelineStore && workflowTemplate) {
                    const targetStageId = nextStageId || workflowTemplate.stages?.[0]?.id;
                    
                    // Use the proper setStage method to ensure UI updates
                    const pipelineState = pipelineStore.getState();
                    
                    // First update the core workflow data
                    pipelineStore.setState({
                        workflowTemplate,
                        completedStages: [],
                        completedSteps: [],
                        currentStageId: targetStageId,
                        isWorkflowActive: true
                    });
                    
                    // Then trigger stage transition to ensure UI updates
                    if (targetStageId && pipelineState.setStage) {
                        console.log(`%c🚀 TRIGGERING STAGE TRANSITION TO: ${targetStageId}`, 'color: #e74c3c; font-weight: bold;');
                        pipelineState.setStage(targetStageId, 'next');
                    }
                }
            },
            
            [EVENTS.STAGE_STEPS_UPDATE]: (payload) => {
                const { stageId, updatedSteps, nextStepId } = payload;
                console.log(
                    `%c📝 STAGE STEPS UPDATE EVENT 📝\n` +
                    `%c📁 Stage: ${stageId}\n` +
                    `%c📊 Steps Count: ${updatedSteps?.length || 0}\n` +
                    `%c🎯 Next Step: ${nextStepId || 'None'}`,
                    'color: #9b59b6; font-weight: bold; font-size: 14px;',
                    'color: #3498db; font-weight: bold;',
                    'color: #2ecc71; font-weight: bold;',
                    'color: #e74c3c; font-weight: bold;'
                );
                
                // Update stage steps in workflow template
                if (get().pipelineStore && updatedSteps && stageId) {
                    const pipelineState = get().pipelineStore?.getState();
                    const currentWorkflowTemplate = pipelineState?.workflowTemplate;
                    
                    if (currentWorkflowTemplate?.stages && get().pipelineStore?.setState) {
                        const updatedStages = currentWorkflowTemplate.stages.map((stage: WorkflowStage) => {
                            if (stage.id === stageId) {
                                return { ...stage, steps: updatedSteps };
                            }
                            return stage;
                        });
                        
                        get().pipelineStore?.setState({
                            workflowTemplate: {
                                ...currentWorkflowTemplate,
                                stages: updatedStages
                            }
                        });
                    }
                }
                
                // Mark current step as completed
                const currentStepId = get().currentStepId;
                if (currentStepId) {
                    set(state => ({
                        completedSteps: state.completedSteps.includes(currentStepId) 
                            ? state.completedSteps 
                            : [...state.completedSteps, currentStepId]
                    }));
                    
                    get().notifyStepCompleted(currentStepId, { 
                        status: 'completed', 
                        reason: 'stage_steps_updated' 
                    });
                }
                
                // Use delayed transition to next step, consistent with normal flow
                if (nextStepId) {
                    console.log(
                        `%c🎯 DELAYED TRANSITION TO NEXT STEP: ${nextStepId}\n` +
                        `%c📁 Stage: ${stageId}`,
                        'color: #e67e22; font-weight: bold; font-size: 12px;',
                        'color: #3498db; font-weight: bold;'
                    );
                    
                    // Find the step index for the next step
                    const pipelineState = get().pipelineStore?.getState();
                    const currentStage = pipelineState?.workflowTemplate?.stages?.find(
                        (stage: WorkflowStage) => stage.id === stageId
                    );
                    
                    const nextStepIndex = currentStage?.steps?.findIndex(
                        (step: any) => (step.step_id || step.id) === nextStepId
                    ) || 0;
                    
                    // Wait for state updates to propagate before starting next step
                    setTimeout(() => {
                        console.log(`%c🚀 STARTING NEXT STEP AFTER STAGE UPDATE: ${nextStepId}`, 'color: #27ae60; font-weight: bold;');
                        get().startStep(nextStepId, stageId, nextStepIndex);
                        
                        // Dispatch event to trigger step execution after additional delay
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
                                detail: { 
                                    stepId: nextStepId,
                                    stageId: stageId,
                                    action: 'execute_after_stage_steps_update',
                                    timestamp: Date.now()
                                }
                            }));
                        }, 200);
                    }, 800); // Longer delay to ensure all state updates complete
                } else {
                    // No next step specified, use delayed completion flow
                    setTimeout(() => {
                        get().transition(EVENTS.COMPLETE_STEP, { 
                            stepId: currentStepId, 
                            result: { status: 'completed', reason: 'stage_steps_updated' }
                        });
                    }, 300); // Delay to match normal completion flow
                }
                
                console.log('[WorkflowStateMachine] Stage steps updated, navigation handled');
            }
        };
        
        // Execute state-specific effect
        const effect = effects[state];
        if (effect) {
            effect();
        }
        
        // Handle special update events
        const updateHandler = updateHandlers[payload.event || ''];
        if (updateHandler) {
            updateHandler(payload);
        }
    },
    
    // ==============================================
    // Public API Methods
    // ==============================================
    
    startStep: (stepId: string, stageId?: string, stepIndex?: number): boolean => {
        const currentState = get().currentState;
        const currentStepId = get().currentStepId;
        const currentStageId = get().currentStageId;
        
        // If already executing the same step in the same stage, just return true
        if (currentState === WORKFLOW_STATES.STEP_EXECUTING && 
            currentStepId === stepId && 
            currentStageId === (stageId || currentStageId)) {
            console.log(`[WorkflowStateMachine] Step ${stepId} in stage ${stageId || currentStageId} is already executing, skipping duplicate start`);
            return true;
        }
        
        return get().transition(EVENTS.START_STEP, { stepId, stageId, stepIndex });
    },
    
    completeStep: (stepId?: string, result?: StepResult): boolean => {
        return get().transition(EVENTS.COMPLETE_STEP, { stepId, result });
    },
    
    failStep: (stepId?: string, error?: Error | string): boolean => {
        return get().transition(EVENTS.FAIL_STEP, { stepId, error });
    },
    
    completeStage: (stageId?: string): boolean => {
        return get().transition(EVENTS.COMPLETE_STAGE, { stageId });
    },
    
    cancel: (): boolean => {
        return get().transition(EVENTS.CANCEL);
    },
    
    reset: (): boolean => {
        set({
            currentStageId: null,
            currentStepId: null,
            currentStepIndex: 0,
            executionHistory: [],
            completedSteps: [],
            completedStages: [],
            failedSteps: []
        });
        return get().transition(EVENTS.RESET);
    },
    
    // ==============================================
    // Workflow Update Handlers
    // ==============================================
    
    handleWorkflowUpdate: (workflowTemplate: WorkflowTemplate, nextStageId?: string): boolean => {
        const currentState = get().currentState;
        console.log(
            `%c🚀 HANDLE WORKFLOW UPDATE CALLED 🚀\n` +
            `%c📊 Current State: ${currentState}\n` +
            `%c📋 Workflow: ${workflowTemplate?.name || 'Unknown'}\n` +
            `%c🎯 Next Stage: ${nextStageId || 'None'}`,
            'color: #e67e22; font-weight: bold; font-size: 14px;',
            'color: #3498db; font-weight: bold;',
            'color: #2ecc71; font-weight: bold;',
            'color: #9b59b6; font-weight: bold;'
        );
        
        return get().transition(EVENTS.WORKFLOW_UPDATE, { 
            workflowTemplate, 
            nextStageId,
            event: EVENTS.WORKFLOW_UPDATE
        });
    },
    
    handleStageStepsUpdate: (stageId: string, updatedSteps: WorkflowStep[], nextStepId?: string): boolean => {
        return get().transition(EVENTS.STAGE_STEPS_UPDATE, { 
            stageId, 
            updatedSteps, 
            nextStepId,
            event: EVENTS.STAGE_STEPS_UPDATE
        });
    },
    
    enableAutoAdvanceAfterConfirmation: (): void => {
        const state = get();
        console.log(
            `%c🔓 RE-ENABLING AUTO-ADVANCE 🔓\n` +
            `%c🎭 Current State: ${state.currentState}\n` +
            `%c🔍 Can Advance Step: ${state.canAutoAdvanceToNextStep()}\n` +
            `%c🔍 Can Advance Stage: ${state.canAutoAdvanceToNextStage()}`,
            'color: #27ae60; font-weight: bold; font-size: 14px;',
            'color: #3498db; font-weight: bold;',
            'color: #e67e22; font-weight: bold;',
            'color: #9b59b6; font-weight: bold;'
        );
        
        set({ autoAdvanceEnabled: true });
        
        // Trigger auto-advance if conditions are met
        if (state.currentState === WORKFLOW_STATES.STEP_COMPLETED && state.canAutoAdvanceToNextStep()) {
            console.log('%c🚀 TRIGGERING STEP AUTO-ADVANCE', 'color: #27ae60; font-weight: bold; font-size: 12px;');
            setTimeout(() => {
                state.autoAdvanceToNextStep();
            }, state.autoAdvanceDelay);
        } else if (state.currentState === WORKFLOW_STATES.STAGE_COMPLETED && state.canAutoAdvanceToNextStage()) {
            console.log('%c🚀 TRIGGERING STAGE AUTO-ADVANCE', 'color: #8e44ad; font-weight: bold; font-size: 12px;');
            setTimeout(() => {
                state.autoAdvanceToNextStage();
            }, state.autoAdvanceDelay);
        } else if (state.currentState === WORKFLOW_STATES.STEP_EXECUTING || state.currentState === WORKFLOW_STATES.IDLE) {
            // Handle workflow update case: need to start first step of new workflow
            console.log('%c🔄 WORKFLOW UPDATE: STARTING FIRST STEP OF NEW WORKFLOW', 'color: #e74c3c; font-weight: bold; font-size: 12px;');
            
            const pipelineStore = state.pipelineStore;
            if (pipelineStore) {
                const pipelineState = pipelineStore.getState();
                const workflowTemplate = pipelineState.workflowTemplate;
                
                if (workflowTemplate?.stages?.length > 0) {
                    // Start from the first stage (not skip planning)
                    const targetStage = workflowTemplate.stages[0];
                    const firstStep = targetStage.steps?.[0];
                    
                    if (firstStep && targetStage) {
                        console.log(
                            `%c🎯 STARTING NEW WORKFLOW FIRST STEP\n` +
                            `%c📁 Stage: ${targetStage.id}\n` +
                            `%c📝 Step: ${firstStep.step_id || firstStep.id}\n` +
                            `%c📊 Workflow has ${workflowTemplate.stages?.length || 0} stages`,
                            'color: #2ecc71; font-weight: bold;',
                            'color: #3498db; font-weight: bold;',
                            'color: #e67e22; font-weight: bold;',
                            'color: #9b59b6; font-weight: bold;'
                        );
                        
                        // Verify pipeline store has the new workflow
                        const pipelineState = pipelineStore.getState();
                        console.log(
                            `%c🔍 PIPELINE STORE VERIFICATION\n` +
                            `%c📋 Pipeline currentStageId: ${pipelineState.currentStageId}\n` +
                            `%c📋 Pipeline currentStage: ${pipelineState.currentStage}\n` +
                            `%c📋 Pipeline workflow stages: ${pipelineState.workflowTemplate?.stages?.length || 0}`,
                            'color: #f39c12; font-weight: bold;',
                            'color: #34495e; font-weight: bold;',
                            'color: #34495e; font-weight: bold;',
                            'color: #34495e; font-weight: bold;'
                        );
                        
                        // Check if target stage exists in pipeline workflow template
                        const targetStageInPipeline = pipelineState.workflowTemplate?.stages?.find(s => s.id === targetStage.id);
                        console.log(
                            `%c🎯 TARGET STAGE VERIFICATION\n` +
                            `%c📋 Target stage in pipeline: ${targetStageInPipeline ? 'FOUND' : 'NOT FOUND'}\n` +
                            `%c📋 Target stage steps: ${targetStageInPipeline?.steps?.length || 0}\n` +
                            `%c📋 First step ID: ${targetStageInPipeline?.steps?.[0]?.step_id || targetStageInPipeline?.steps?.[0]?.id || 'NONE'}`,
                            'color: #e74c3c; font-weight: bold;',
                            'color: #34495e; font-weight: bold;',
                            'color: #34495e; font-weight: bold;',
                            'color: #34495e; font-weight: bold;'
                        );
                        
                        // Force reset state machine by directly setting state
                        const firstStepId = firstStep.step_id || firstStep.id;
                        set({
                            currentState: WORKFLOW_STATES.IDLE,
                            currentStageId: targetStage.id,
                            currentStepId: firstStepId, // Set the first step ID immediately
                            currentStepIndex: 0
                        });
                        
                        // Also ensure pipeline store is in sync
                        if (pipelineState.setStage) {
                            console.log(`%c🎯 SYNCING PIPELINE STAGE TO: ${targetStage.id}`, 'color: #9b59b6; font-weight: bold;');
                            pipelineState.setStage(targetStage.id, 'next');
                        }
                        
                        // Also ensure pipeline store has the correct current step
                        if (pipelineState.setCurrentStepId) {
                            console.log(`%c🎯 SYNCING PIPELINE STEP TO: ${firstStepId}`, 'color: #9b59b6; font-weight: bold;');
                            pipelineState.setCurrentStepId(firstStepId);
                        }
                        
                        setTimeout(() => {
                            console.log(`%c🎬 STARTING STEP AFTER STAGE TRANSITION`, 'color: #2ecc71; font-weight: bold;');
                            get().startStep(firstStepId, targetStage.id, 0);
                            
                            // Wait additional time for DynamicStageTemplate to re-render with new stage
                            setTimeout(() => {
                                console.log(`%c🎯 DISPATCHING STEP TRIGGER AFTER COMPONENT UPDATE`, 'color: #e74c3c; font-weight: bold;');
                                // Dispatch event to trigger step execution with longer delay
                                window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
                                    detail: { 
                                        stepId: firstStepId,
                                        stageId: targetStage.id,
                                        action: 'auto_execute_after_workflow_update',
                                        timestamp: Date.now()
                                    }
                                }));
                            }, 1500); // Wait for DynamicStageTemplate to re-render with new stage
                        }, 1000); // Wait for stage transition animation (800ms) + buffer
                    }
                }
            }
        } else {
            console.log(
                `%c⏳ NO AUTO-ADVANCE TRIGGERED\n` +
                `%c📋 Reason: Current state (${state.currentState}) or conditions not met`,
                'color: #f39c12; font-weight: bold;',
                'color: #95a5a6; font-weight: bold;'
            );
        }
    },
    
    // ==============================================
    // Auto-advance Logic
    // ==============================================
    
    autoAdvanceToNextStep: (): boolean => {
        // Check if there's a pending workflow update
        const pipelineStore = get().pipelineStore;
        if (pipelineStore) {
            const pipelineState = pipelineStore.getState();
            const currentStepId = get().currentStepId;
            const stepResult = pipelineState.stepResults?.[currentStepId];
            
            if (stepResult?.workflowUpdated && stepResult?.newWorkflow) {
                console.log(
                    `%c⚠️  BLOCKING AUTO-ADVANCE: Pending workflow update detected\n` +
                    `%c📋 Step: ${currentStepId}\n` +
                    `%c🔄 Workflow: ${stepResult.newWorkflow?.name || 'Unknown'}`,
                    'color: #ff6b6b; font-weight: bold; font-size: 12px;',
                    'color: #3498db; font-weight: bold;',
                    'color: #e67e22; font-weight: bold;'
                );
                return false; // Block auto-advance until workflow update is handled
            }
        }
        
        const nextStep = get().getNextStep();
        if (nextStep) {
            return get().startStep(nextStep.step_id, get().currentStageId, nextStep.index);
        }
        return false;
    },
    
    autoAdvanceToNextStage: (): boolean => {
        // Check if there's a pending workflow update in any recent step
        const pipelineStore = get().pipelineStore;
        if (pipelineStore) {
            const pipelineState = pipelineStore.getState();
            const recentSteps = get().completedSteps.slice(-3); // Check last 3 completed steps
            
            for (const stepId of recentSteps) {
                const stepResult = pipelineState.stepResults?.[stepId];
                if (stepResult?.workflowUpdated && stepResult?.newWorkflow) {
                    console.log(
                        `%c⚠️  BLOCKING STAGE AUTO-ADVANCE: Pending workflow update detected\n` +
                        `%c📋 Step: ${stepId}\n` +
                        `%c🔄 Workflow: ${stepResult.newWorkflow?.name || 'Unknown'}`,
                        'color: #ff6b6b; font-weight: bold; font-size: 12px;',
                        'color: #3498db; font-weight: bold;',
                        'color: #e67e22; font-weight: bold;'
                    );
                    return false; // Block auto-advance until workflow update is handled
                }
            }
        }
        
        const nextStage = get().getNextStage();
        if (nextStage) {
            const firstStep = nextStage.steps?.[0];
            if (firstStep) {
                const started = get().startStep(firstStep.step_id, nextStage.id, 0);
                
                if (started) {
                    // 发送事件触发步骤执行（类似于workflow update的逻辑）
                    setTimeout(() => {
                        console.log(`%c🎯 DISPATCHING STEP TRIGGER AFTER STAGE AUTO-ADVANCE`, 'color: #e74c3c; font-weight: bold;');
                        window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
                            detail: { 
                                stepId: firstStep.step_id || firstStep.id,
                                stageId: nextStage.id,
                                action: 'auto_execute_after_stage_advance',
                                timestamp: Date.now()
                            }
                        }));
                    }, 1500); // 等待DynamicStageTemplate重新渲染新的阶段
                }
                
                return started;
            }
        }
        return false;
    },
    
    // ==============================================
    // State Check Methods
    // ==============================================
    
    canAutoAdvanceToNextStep: (): boolean => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (!pipelineStore || !aiPlanningStore) return false;
        
        const currentStepId = get().currentStepId;
        if (!currentStepId) return false;
        
        const currentStepCompleted = get().completedSteps.includes(currentStepId);
        const nextStep = get().getNextStep();
        
        // Check if this step was completed due to stage steps update
        const pipelineState = pipelineStore.getState();
        const stepResult = pipelineState.stepResults?.[currentStepId];
        const isStageStepsUpdate = stepResult?.reason === 'stage_steps_updated';
        
        // For stage steps update, we don't need to check todo list
        if (isStageStepsUpdate) {
            return currentStepCompleted && !!nextStep;
        }
        
        // For normal step completion, only check if step is completed and has next step
        // Don't check todoList - it's used for progress tracking, not completion blocking
        return currentStepCompleted && !!nextStep;
    },
    
    canAutoAdvanceToNextStage: (): boolean => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (!pipelineStore || !aiPlanningStore) return false;
        
        const currentStageCompleted = get().isCurrentStageCompleted();
        const nextStage = get().getNextStage();
        
        // Only check if stage is completed and has next stage
        // Don't check todoList - it's used for progress tracking, not completion blocking
        return currentStageCompleted && !!nextStage;
    },
    
    isCurrentStageCompleted: (): boolean => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return false;
        
        const stageConfig = pipelineStore.getState().getCurrentStageConfig?.();
        if (!stageConfig) return false;
        
        return stageConfig.steps.every((step: WorkflowStep) => 
            get().completedSteps.includes(step.step_id)
        );
    },
    
    isWorkflowCompleted: (): boolean => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return false;
        
        const workflowTemplate = pipelineStore.getState().workflowTemplate;
        if (!workflowTemplate) return false;
        
        return workflowTemplate.stages.every((stage: WorkflowStage) => 
            get().completedStages.includes(stage.id)
        );
    },
    
    // ==============================================
    // Helper Methods
    // ==============================================
    
    getNextStep: (): (WorkflowStep & { index: number }) | null => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return null;
        
        const stageConfig = pipelineStore.getState().getCurrentStageConfig?.();
        if (!stageConfig) return null;
        
        const currentStepIndex = get().currentStepIndex;
        const nextStepIndex = currentStepIndex + 1;
        
        if (nextStepIndex < stageConfig.steps.length) {
            return {
                ...stageConfig.steps[nextStepIndex],
                index: nextStepIndex
            };
        }
        
        return null;
    },
    
    getNextStage: (): WorkflowStage | null => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return null;
        
        const workflowTemplate = pipelineStore.getState().workflowTemplate;
        const currentStageId = get().currentStageId;
        
        if (!workflowTemplate || !currentStageId) return null;
        
        const currentStageIndex = workflowTemplate.stages.findIndex(
            (stage: WorkflowStage) => stage.id === currentStageId
        );
        
        const nextStageIndex = currentStageIndex + 1;
        
        if (nextStageIndex < workflowTemplate.stages.length) {
            return workflowTemplate.stages[nextStageIndex];
        }
        
        return null;
    },
    
    // ==============================================
    // Integration Methods
    // ==============================================
    
    notifyStepStarted: (stepId: string, stageId?: string): void => {
        const pipelineStore = get().pipelineStore;
        if (pipelineStore && pipelineStore.getState().setCurrentStepId) {
            pipelineStore.getState().setCurrentStepId(stepId);
        }
    },
    
    notifyStepCompleted: (stepId: string, result?: StepResult): void => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (pipelineStore) {
            const state = pipelineStore.getState();
            if (state.markStepCompleted) {
                state.markStepCompleted(stepId);
            }
            if (result && state.updateStepResult) {
                state.updateStepResult(stepId, result);
            }
        }
        
        if (aiPlanningStore && aiPlanningStore.getState().setChecklist) {
            aiPlanningStore.getState().setChecklist([], []);
        }
    },
    
    notifyStepFailed: (stepId: string, error?: Error | string): void => {
        const pipelineStore = get().pipelineStore;
        
        if (pipelineStore && pipelineStore.getState().updateStepResult) {
            pipelineStore.getState().updateStepResult(stepId, {
                status: 'failed',
                error: typeof error === 'string' ? error : error?.message || 'Step execution failed',
                timestamp: new Date().toISOString()
            });
        }
    },
    
    notifyStageCompleted: (stageId: string): void => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (pipelineStore && pipelineStore.getState().markStageCompleted) {
            pipelineStore.getState().markStageCompleted(stageId);
        }
        
        if (aiPlanningStore && aiPlanningStore.getState().markStageAsComplete) {
            aiPlanningStore.getState().markStageAsComplete(stageId);
        }
    },
    
    notifyWorkflowCompleted: (): void => {
        console.log('[WorkflowStateMachine] Workflow completed!');
        window.dispatchEvent(new CustomEvent('workflowCompleted', {
            detail: {
                timestamp: Date.now(),
                completedStages: get().completedStages,
                completedSteps: get().completedSteps
            }
        }));
    },
    
    notifyCancelled: (): void => {
        console.log('[WorkflowStateMachine] Workflow cancelled');
        window.dispatchEvent(new CustomEvent('workflowCancelled', {
            detail: {
                timestamp: Date.now(),
                currentState: get().currentState
            }
        }));
    },
    
    // ==============================================
    // Store Integration
    // ==============================================
    
    setStoreReferences: (aiPlanningStore: StoreReference, pipelineStore: StoreReference): void => {
        set({
            aiPlanningStore,
            pipelineStore
        });
    },
    
    // ==============================================
    // Configuration Methods
    // ==============================================
    
    setAutoAdvanceEnabled: (enabled: boolean): void => {
        set({ autoAdvanceEnabled: enabled });
    },
    
    setAutoAdvanceDelay: (delay: number): void => {
        set({ autoAdvanceDelay: delay });
    },
    
    // ==============================================
    // Debug and Monitoring
    // ==============================================
    
    getCurrentContext: (): any => {
        const state = get();
        return {
            currentState: state.currentState,
            currentStageId: state.currentStageId,
            currentStepId: state.currentStepId,
            currentStepIndex: state.currentStepIndex,
            completedSteps: state.completedSteps,
            completedStages: state.completedStages,
            failedSteps: state.failedSteps,
            autoAdvanceEnabled: state.autoAdvanceEnabled,
            canAutoAdvanceStep: state.canAutoAdvanceToNextStep(),
            canAutoAdvanceStage: state.canAutoAdvanceToNextStage()
        };
    },
    
    getExecutionHistory: (): ExecutionHistoryEntry[] => {
        return get().executionHistory;
    }
}));

export default useWorkflowStateMachine;