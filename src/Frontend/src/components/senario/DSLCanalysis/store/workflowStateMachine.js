/**
 * Workflow State Machine Store
 * 
 * This module provides a finite state machine for managing workflow execution states,
 * step transitions, stage completions, and auto-advance logic using Zustand.
 * 
 * States: IDLE -> STEP_EXECUTING -> STEP_COMPLETED -> STAGE_COMPLETED -> WORKFLOW_COMPLETED
 * 
 * @author Hu Silan
 * @project Easy-notebook
 * @file workflowStateMachine.js
 */
import { create } from 'zustand';

// Define workflow states
export const WORKFLOW_STATES = {
    IDLE: 'idle',
    STEP_EXECUTING: 'step_executing',
    STEP_COMPLETED: 'step_completed',
    STEP_FAILED: 'step_failed',
    STAGE_COMPLETED: 'stage_completed',
    WORKFLOW_COMPLETED: 'workflow_completed',
    CANCELLED: 'cancelled'
};

// Define transition events
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
    AUTO_ADVANCE_STAGE: 'AUTO_ADVANCE_STAGE'
};

// State transition rules
const STATE_TRANSITIONS = {
    [WORKFLOW_STATES.IDLE]: {
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
    },
    [WORKFLOW_STATES.STEP_EXECUTING]: {
        [EVENTS.COMPLETE_STEP]: WORKFLOW_STATES.STEP_COMPLETED,
        [EVENTS.FAIL_STEP]: WORKFLOW_STATES.STEP_FAILED,
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING, // Allow restart of current step
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
        [EVENTS.COMPLETE_WORKFLOW]: WORKFLOW_STATES.WORKFLOW_COMPLETED, // Allow idempotent completion
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE
    },
    [WORKFLOW_STATES.CANCELLED]: {
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE,
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_EXECUTING
    }
};

export const useWorkflowStateMachine = create((set, get) => ({
    // Current state machine state
    currentState: WORKFLOW_STATES.IDLE,
    
    // Current execution context
    currentStageId: null,
    currentStepId: null,
    currentStepIndex: 0,
    
    // Execution history and tracking
    executionHistory: [],
    completedSteps: [],
    completedStages: [],
    failedSteps: [],
    
    // Auto-advance settings
    autoAdvanceEnabled: true,
    autoAdvanceDelay: 1000,
    
    // Integration with other stores
    aiPlanningStore: null,
    pipelineStore: null,
    
    // State transition function
    transition: (event, payload = {}) => {
        const currentState = get().currentState;
        const nextState = STATE_TRANSITIONS[currentState]?.[event];
        
        if (!nextState) {
            console.warn(`Invalid transition: ${event} from state ${currentState}`);
            return false;
        }
        
        console.log(`State transition: ${currentState} --${event}--> ${nextState}`, payload);
        
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
    
    // Execute side effects when entering a new state
    executeStateEffects: (state, payload) => {
        const effects = {
            [WORKFLOW_STATES.STEP_EXECUTING]: () => {
                const { stepId, stageId, stepIndex } = payload;
                set({
                    currentStepId: stepId,
                    currentStageId: stageId || get().currentStageId,
                    currentStepIndex: stepIndex !== undefined ? stepIndex : get().currentStepIndex
                });
                
                // Notify other stores
                get().notifyStepStarted(stepId, stageId);
            },
            
            [WORKFLOW_STATES.STEP_COMPLETED]: () => {
                const { stepId, result } = payload;
                const currentStepId = get().currentStepId;
                const stepToComplete = stepId || currentStepId;
                
                set(state => ({
                    completedSteps: state.completedSteps.includes(stepToComplete) 
                        ? state.completedSteps 
                        : [...state.completedSteps, stepToComplete]
                }));
                
                // Notify other stores
                get().notifyStepCompleted(stepToComplete, result);
                
                // Check for auto-advance to next step
                if (get().autoAdvanceEnabled && get().canAutoAdvanceToNextStep()) {
                    setTimeout(() => {
                        get().autoAdvanceToNextStep();
                    }, get().autoAdvanceDelay);
                }
                
                // Check if stage is completed
                if (get().isCurrentStageCompleted()) {
                    get().transition(EVENTS.COMPLETE_STAGE, { stageId: get().currentStageId });
                }
            },
            
            [WORKFLOW_STATES.STEP_FAILED]: () => {
                const { stepId, error } = payload;
                const currentStepId = get().currentStepId;
                const stepToFail = stepId || currentStepId;
                
                set(state => ({
                    failedSteps: state.failedSteps.includes(stepToFail)
                        ? state.failedSteps
                        : [...state.failedSteps, stepToFail]
                }));
                
                // Notify other stores
                get().notifyStepFailed(stepToFail, error);
            },
            
            [WORKFLOW_STATES.STAGE_COMPLETED]: () => {
                const { stageId } = payload;
                const currentStageId = get().currentStageId;
                const stageToComplete = stageId || currentStageId;
                
                set(state => ({
                    completedStages: state.completedStages.includes(stageToComplete)
                        ? state.completedStages
                        : [...state.completedStages, stageToComplete]
                }));
                
                // Notify other stores
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
                // Notify other stores
                get().notifyWorkflowCompleted();
            },
            
            [WORKFLOW_STATES.CANCELLED]: () => {
                // Notify other stores
                get().notifyCancelled();
            }
        };
        
        const effect = effects[state];
        if (effect) {
            effect();
        }
    },
    
    // Public API methods
    startStep: (stepId, stageId, stepIndex) => {
        const currentState = get().currentState;
        const currentStepId = get().currentStepId;
        
        // If already executing the same step, just return true
        if (currentState === WORKFLOW_STATES.STEP_EXECUTING && currentStepId === stepId) {
            console.log(`Step ${stepId} is already executing, skipping duplicate start`);
            return true;
        }
        
        return get().transition(EVENTS.START_STEP, { stepId, stageId, stepIndex });
    },
    
    completeStep: (stepId, result) => {
        return get().transition(EVENTS.COMPLETE_STEP, { stepId, result });
    },
    
    failStep: (stepId, error) => {
        return get().transition(EVENTS.FAIL_STEP, { stepId, error });
    },
    
    completeStage: (stageId) => {
        return get().transition(EVENTS.COMPLETE_STAGE, { stageId });
    },
    
    cancel: () => {
        return get().transition(EVENTS.CANCEL);
    },
    
    reset: () => {
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
    
    // Auto-advance logic
    autoAdvanceToNextStep: () => {
        const nextStep = get().getNextStep();
        if (nextStep) {
            return get().startStep(nextStep.step_id, get().currentStageId, nextStep.index);
        }
        return false;
    },
    
    autoAdvanceToNextStage: () => {
        const nextStage = get().getNextStage();
        if (nextStage) {
            const firstStep = nextStage.steps?.[0];
            if (firstStep) {
                return get().startStep(firstStep.step_id, nextStage.id, 0);
            }
        }
        return false;
    },
    
    // State check methods
    canAutoAdvanceToNextStep: () => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (!pipelineStore || !aiPlanningStore) return false;
        
        // Check if current step is completed and there's a next step
        const currentStepCompleted = get().completedSteps.includes(get().currentStepId);
        const nextStep = get().getNextStep();
        const todoListEmpty = aiPlanningStore.getState().toDoList.length === 0;
        
        return currentStepCompleted && nextStep && todoListEmpty;
    },
    
    canAutoAdvanceToNextStage: () => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (!pipelineStore || !aiPlanningStore) return false;
        
        // Check if current stage is completed and there's a next stage
        const currentStageCompleted = get().isCurrentStageCompleted();
        const nextStage = get().getNextStage();
        const todoListEmpty = aiPlanningStore.getState().toDoList.length === 0;
        
        return currentStageCompleted && nextStage && todoListEmpty;
    },
    
    isCurrentStageCompleted: () => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return false;
        
        const stageConfig = pipelineStore.getState().getCurrentStageConfig();
        if (!stageConfig) return false;
        
        // Check if all steps in current stage are completed
        return stageConfig.steps.every(step => 
            get().completedSteps.includes(step.step_id)
        );
    },
    
    isWorkflowCompleted: () => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return false;
        
        const workflowTemplate = pipelineStore.getState().workflowTemplate;
        if (!workflowTemplate) return false;
        
        // Check if all stages are completed
        return workflowTemplate.stages.every(stage => 
            get().completedStages.includes(stage.id)
        );
    },
    
    // Helper methods
    getNextStep: () => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return null;
        
        const stageConfig = pipelineStore.getState().getCurrentStageConfig();
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
    
    getNextStage: () => {
        const pipelineStore = get().pipelineStore;
        if (!pipelineStore) return null;
        
        const workflowTemplate = pipelineStore.getState().workflowTemplate;
        const currentStageId = get().currentStageId;
        
        if (!workflowTemplate || !currentStageId) return null;
        
        const currentStageIndex = workflowTemplate.stages.findIndex(
            stage => stage.id === currentStageId
        );
        
        const nextStageIndex = currentStageIndex + 1;
        
        if (nextStageIndex < workflowTemplate.stages.length) {
            return workflowTemplate.stages[nextStageIndex];
        }
        
        return null;
    },
    
    // Integration methods - notifications to other stores
    notifyStepStarted: (stepId, stageId) => {
        const pipelineStore = get().pipelineStore;
        if (pipelineStore) {
            pipelineStore.getState().setCurrentStepId(stepId);
        }
    },
    
    notifyStepCompleted: (stepId, result) => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (pipelineStore) {
            pipelineStore.getState().markStepCompleted(stepId);
            if (result) {
                pipelineStore.getState().updateStepResult(stepId, result);
            }
        }
        
        if (aiPlanningStore) {
            // Clear todo list when step is completed
            aiPlanningStore.getState().setChecklist([], []);
        }
    },
    
    notifyStepFailed: (stepId, error) => {
        const pipelineStore = get().pipelineStore;
        
        if (pipelineStore) {
            pipelineStore.getState().updateStepResult(stepId, {
                status: 'failed',
                error: error?.message || 'Step execution failed',
                timestamp: new Date().toISOString()
            });
        }
    },
    
    notifyStageCompleted: (stageId) => {
        const pipelineStore = get().pipelineStore;
        const aiPlanningStore = get().aiPlanningStore;
        
        if (pipelineStore) {
            pipelineStore.getState().markStageCompleted(stageId);
        }
        
        if (aiPlanningStore) {
            aiPlanningStore.getState().markStageAsComplete(stageId);
        }
    },
    
    notifyWorkflowCompleted: () => {
        console.log('Workflow completed!');
        // Dispatch global event for workflow completion
        window.dispatchEvent(new CustomEvent('workflowCompleted', {
            detail: {
                timestamp: Date.now(),
                completedStages: get().completedStages,
                completedSteps: get().completedSteps
            }
        }));
    },
    
    notifyCancelled: () => {
        console.log('Workflow cancelled');
        // Dispatch global event for workflow cancellation
        window.dispatchEvent(new CustomEvent('workflowCancelled', {
            detail: {
                timestamp: Date.now(),
                currentState: get().currentState
            }
        }));
    },
    
    // Store integration setup
    setStoreReferences: (aiPlanningStore, pipelineStore) => {
        set({
            aiPlanningStore,
            pipelineStore
        });
    },
    
    // Configuration methods
    setAutoAdvanceEnabled: (enabled) => {
        set({ autoAdvanceEnabled: enabled });
    },
    
    setAutoAdvanceDelay: (delay) => {
        set({ autoAdvanceDelay: delay });
    },
    
    // Debug and monitoring methods
    getCurrentContext: () => {
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
    
    getExecutionHistory: () => {
        return get().executionHistory;
    }
}));