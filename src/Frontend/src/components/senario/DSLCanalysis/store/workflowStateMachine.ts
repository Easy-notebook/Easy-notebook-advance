/**
 * Workflow State Machine & Executor - Final Integrated Version
 *
 * This single file contains both the finite state machine for managing workflow state
 * and the executor responsible for carrying out the actual work of each step,
 * such as making API calls and running actions. This co-location simplifies the
 * architecture by centralizing the entire workflow lifecycle logic.
 *
 * Responsibilities:
 * 1.  WorkflowStateMachine: The "Commander". Manages states (IDLE, STEP_EXECUTING, etc.)
 * and transitions based on events. It decides *what* to do and *when*.
 *
 * 2.  WorkflowExecutor: The "Worker". Executes the commands from the state machine.
 * It knows *how* to perform tasks like fetching actions from the sequence API,
 * managing an action queue, and executing individual actions.
 *
 * Core Flow:
 * - State machine transitions to STEP_EXECUTING.
 * - Its side effect calls the WorkflowExecutor to start a new behaviour.
 * - The executor fetches actions, queues them, and executes them sequentially.
 * - When the executor finishes all actions for a behaviour, it notifies the state machine.
 * - The state machine transitions to STEP_FEEDBACK.
 * - Its side effect calls the feedback API to get the next command.
 * - It parses the command and transitions to the next appropriate state, creating a loop.
 *
 * @author Hu Silan (Integrated by Gemini AI based on user feedback)
 * @project Easy-notebook
 * @file workflowStateMachine.ts
 */
import { create } from 'zustand';
import workflowAPIClient from '../services/WorkflowAPIClient.js';
import constants from '../services/constants.js';
import { useScriptStore } from './useScriptStore'; // Executor dependency
// @ts-ignore
import { useAIPlanningContextStore } from './aiPlanningContext.js'; // Executor dependency
import { usePipelineStore } from './usePipelineStore';

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
    hierarchicalId?: string | null;
    stageId?: string | null;
    stepId?: string | null;
    stepIndex?: number;
    behaviourCounter?: number;
    actionCounter?: number;
}

export interface StepResult {
    status: string;
    reason?: string;
    error?: string;
    timestamp?: string;
    result?: any;
}

// ==============================================
// Constants (Refactored)
// ==============================================

export const WORKFLOW_STATES = {
    // start
    IDLE: 'idle',
    // Stage
    STAGE_RUNNING: 'stage_running',
    STAGE_COMPLETED: 'stage_completed',
    // Step
    STEP_RUNNING: 'step_running',
    STEP_COMPLETED: 'step_completed',
    // Behavior
    BEHAVIOR_RUNNING: 'behavior_running',
    BEHAVIOR_COMPLETED: 'behavior_completed',
    // Action
    ACTION_RUNNING: 'action_running',
    ACTION_COMPLETED: 'action_completed',
    // Workflow
    WORKFLOW_COMPLETED: 'workflow_completed',
    WORKFLOW_UPDATE_PENDING: 'workflow_update_pending',
    STEP_UPDATE_PENDING: 'step_update_pending',
    // General
    ERROR: 'error',
    CANCELLED: 'cancelled',
} as const;

export type WorkflowState = typeof WORKFLOW_STATES[keyof typeof WORKFLOW_STATES];

export const EVENTS = {
    // ==============================================
    // 1. Lifecycle: START Events
    // ==============================================

    /**
     * @description Starts the entire workflow.
     * @transition IDLE -> STAGE_RUNNING
     */
    START_WORKFLOW: 'START_WORKFLOW',

    /**
     * @description Starts the next step within the current stage.
     * @transition STAGE_RUNNING -> STEP_RUNNING
     */
    START_STEP: 'START_STEP',

    /**
     * @description Starts the next behavior within the current step.
     * @transition STEP_RUNNING -> BEHAVIOR_RUNNING
     */
    START_BEHAVIOR: 'START_BEHAVIOR',

    /**
     * @description Starts the next action within the current behavior.
     * @transition BEHAVIOR_RUNNING -> ACTION_RUNNING
     */
    START_ACTION: 'START_ACTION',

    // ==============================================
    // 2. Lifecycle: COMPLETE Events
    // ==============================================

    /**
     * @description Declares the current action has finished.
     * @transition ACTION_RUNNING -> BEHAVIOR_RUNNING (to decide next action or finish)
     */
    COMPLETE_ACTION: 'COMPLETE_ACTION',

    /**
     * @description Declares the current behavior has completed execution and feedback, ready for next step.
     * @transition BEHAVIOR_RUNNING -> BEHAVIOR_COMPLETED (after feedback evaluation)
     */
    COMPLETE_BEHAVIOR: 'COMPLETE_BEHAVIOR',

    /**
     * @description Declares the current step has finished all its behaviors.
     * @transition STEP_RUNNING -> STEP_COMPLETED
     */
    COMPLETE_STEP: 'COMPLETE_STEP',

    /**
     * @description Declares the current stage has finished all its steps.
     * @transition STAGE_RUNNING -> STAGE_COMPLETED
     */
    COMPLETE_STAGE: 'COMPLETE_STAGE',

    /**
     * @description Declares the final stage is complete, finishing the workflow.
     * @transition STAGE_COMPLETED -> WORKFLOW_COMPLETED
     */
    COMPLETE_WORKFLOW: 'COMPLETE_WORKFLOW',


    // ==============================================
    // 3. Feedback & Looping Events
    // ==============================================
    /**
     * @description After a behavior is completed, this starts the next behavior in the same step.
     * @transition ACTION_COMPLETED -> ACTION_RUNNING
     */
    NEXT_ACTION: 'NEXT_ACTION',

    /**
     * @description After a behavior is completed, this starts the next behavior in the same step.
     * @transition BEHAVIOR_COMPLETED -> BEHAVIOR_RUNNING
     */
    NEXT_BEHAVIOR: 'NEXT_BEHAVIOR',

    /**
     * @description After a behavior is completed, this starts the next behavior in the same step.
     * @transition STEP_COMPLETED -> STEP_RUNNING
     */
    NEXT_STEP: 'NEXT_STEP',

    /**
     * @description After a step is completed, this starts the next stage (auto-advance).
     * @transition STEP_COMPLETED -> STAGE_RUNNING
     */
    NEXT_STAGE: 'NEXT_STAGE',

    // ==============================================
    // 4. Update Events
    // ==============================================

    /**
     * @description Requests a full workflow update.
     * @transition any_running_state -> WORKFLOW_UPDATE_PENDING
     */
    UPDATE_WORKFLOW: 'UPDATE_WORKFLOW',

    /**
     * @description Confirms the workflow update, resetting the flow.
     * @transition WORKFLOW_UPDATE_PENDING -> IDLE
     */
    UPDATE_WORKFLOW_CONFIRMED: 'UPDATE_WORKFLOW_CONFIRMED',

    /**
     * @description Rejects the workflow update, returning to the previous state.
     * @transition WORKFLOW_UPDATE_PENDING -> (previous_state)
     */
    UPDATE_WORKFLOW_REJECTED: 'UPDATE_WORKFLOW_REJECTED',

    /**
     * @description Requests an update to the steps of a stage.
     * @transition any_running_state -> STEP_UPDATE_PENDING
     */
    UPDATE_STEP: 'UPDATE_STEP',

    /**
     * @description Confirms the step update.
     * @transition STEP_UPDATE_PENDING -> (previous_state)
     */
    UPDATE_STEP_CONFIRMED: 'UPDATE_STEP_CONFIRMED',

    /**
     * @description Rejects the step update.
     * @transition STEP_UPDATE_PENDING -> (previous_state)
     */
    UPDATE_STEP_REJECTED: 'UPDATE_STEP_REJECTED',

    // ==============================================
    // 5. General Control Events
    // ==============================================

    /**
     * @description A non-recoverable error occurred.
     * @transition * -> ERROR
     */
    FAIL: 'FAIL',

    /**
     * @description The user or system cancels the workflow.
     * @transition * -> CANCELLED
     */
    CANCEL: 'CANCEL',

    /**
     * @description Resets the machine from a terminal state.
     * @transition WORKFLOW_COMPLETED | ERROR | CANCELLED -> IDLE
     */
    RESET: 'RESET',
};

export type WorkflowEvent = typeof EVENTS[keyof typeof EVENTS];

// State transition rules (Refactored)
const STATE_TRANSITIONS: Record<WorkflowState, Partial<Record<WorkflowEvent, WorkflowState>>> = {
    /**
     * The machine is idle, waiting for the workflow to begin.
     */
    [WORKFLOW_STATES.IDLE]: {
        [EVENTS.START_WORKFLOW]: WORKFLOW_STATES.STAGE_RUNNING,
    },

    /**
     * A stage is active, ready to execute its steps.
     */
    [WORKFLOW_STATES.STAGE_RUNNING]: {
        [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_RUNNING,
        [EVENTS.COMPLETE_STAGE]: WORKFLOW_STATES.STAGE_COMPLETED,
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
    },

    /**
     * A step is active, ready to execute its behaviors.
     */
    [WORKFLOW_STATES.STEP_RUNNING]: {
        [EVENTS.START_BEHAVIOR]: WORKFLOW_STATES.BEHAVIOR_RUNNING,
        [EVENTS.COMPLETE_STEP]: WORKFLOW_STATES.STEP_COMPLETED,
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * A behavior is active, managing the execution of its actions. This is the main action loop.
     */
    [WORKFLOW_STATES.BEHAVIOR_RUNNING]: {
        [EVENTS.START_ACTION]: WORKFLOW_STATES.ACTION_RUNNING,
        [EVENTS.COMPLETE_BEHAVIOR]: WORKFLOW_STATES.BEHAVIOR_COMPLETED,
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * A single, atomic action is being executed.
     */
    [WORKFLOW_STATES.ACTION_RUNNING]: {
        // Corrected: Upon completion, an action moves to the ACTION_COMPLETED state.
        [EVENTS.COMPLETE_ACTION]: WORKFLOW_STATES.ACTION_COMPLETED,
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
        [EVENTS.UPDATE_WORKFLOW]: WORKFLOW_STATES.WORKFLOW_UPDATE_PENDING,
        [EVENTS.UPDATE_STEP]: WORKFLOW_STATES.STEP_UPDATE_PENDING,
    },

    /**
     * An action has just completed. The machine is waiting for the next command
     * from the parent behavior: either start the next action or finish.
     */
    [WORKFLOW_STATES.ACTION_COMPLETED]: {
        [EVENTS.NEXT_ACTION]: WORKFLOW_STATES.ACTION_RUNNING,
        [EVENTS.NEXT_BEHAVIOR]: WORKFLOW_STATES.BEHAVIOR_RUNNING,
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * A behavior has successfully completed after passing feedback.
     */
    [WORKFLOW_STATES.BEHAVIOR_COMPLETED]: {
        [EVENTS.NEXT_BEHAVIOR]: WORKFLOW_STATES.BEHAVIOR_RUNNING, // Start the next behavior in the same step
        [EVENTS.NEXT_STEP]: WORKFLOW_STATES.STEP_RUNNING,     // All behaviors for this step are done
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * A step has successfully completed all its behaviors.
     */
    [WORKFLOW_STATES.STEP_COMPLETED]: {
        [EVENTS.NEXT_STEP]: WORKFLOW_STATES.STEP_RUNNING,       // Auto-advance to the next stage
        [EVENTS.NEXT_STAGE]: WORKFLOW_STATES.STAGE_RUNNING,   // This was the last step of the stage
        [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * A stage has successfully completed all its steps.
     */
    [WORKFLOW_STATES.STAGE_COMPLETED]: {
        [EVENTS.NEXT_STAGE]: WORKFLOW_STATES.STAGE_RUNNING,             // Start the first step of the next stage
        [EVENTS.COMPLETE_WORKFLOW]: WORKFLOW_STATES.WORKFLOW_COMPLETED, // This was the last stage
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * The entire workflow has finished successfully.
     */
    [WORKFLOW_STATES.WORKFLOW_COMPLETED]: {
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE,
    },
    
    /**
     * Waiting for user confirmation on a major workflow update.
     */
    [WORKFLOW_STATES.WORKFLOW_UPDATE_PENDING]: {
        [EVENTS.UPDATE_WORKFLOW_CONFIRMED]: WORKFLOW_STATES.ACTION_COMPLETED,
        [EVENTS.UPDATE_WORKFLOW_REJECTED]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * Waiting for user confirmation on a minor step update.
     */
    [WORKFLOW_STATES.STEP_UPDATE_PENDING]: {
        [EVENTS.UPDATE_STEP_CONFIRMED]: WORKFLOW_STATES.ACTION_COMPLETED,
        [EVENTS.UPDATE_STEP_REJECTED]: WORKFLOW_STATES.ERROR,
        [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED,
    },

    /**
     * A terminal error state.
     */
    [WORKFLOW_STATES.ERROR]: {
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE,
    },

    /**
     * A terminal cancelled state.
     */
    [WORKFLOW_STATES.CANCELLED]: {
        [EVENTS.RESET]: WORKFLOW_STATES.IDLE,
    },
};


// ==============================================
// 3. TYPES & INTERFACES
// ==============================================

interface FeedbackResponse {
    targetAchieved: boolean;
    stepCompleted?: boolean;
    nextBehaviorId?: string;
}

interface WorkflowContext {
    currentStageId: string | null;
    currentStepId: string | null;
    currentBehaviorId: string | null;
    currentBehaviorActions: any[];
    currentActionIndex: number;
}

interface PendingUpdateData {
    workflowTemplate: any;
    nextStageId?: string;
}

interface WorkflowStateMachineState {
    currentState: WorkflowState;
    context: WorkflowContext;
    executionHistory: any[];
    pendingWorkflowData: PendingUpdateData | null;
}

interface WorkflowStateMachineActions {
    transition: (event: WorkflowEvent, payload?: any) => void;
    startWorkflow: (initialContext: { stageId: string, stepId: string }) => void;
    fail: (error: Error, message?: string) => void;
    cancel: () => void;
    reset: () => void;
    requestWorkflowUpdate: (payload: PendingUpdateData) => void;
    confirmWorkflowUpdate: () => void;
    rejectWorkflowUpdate: () => void;
}

export type WorkflowStateMachine = WorkflowStateMachineState & WorkflowStateMachineActions;

// ==============================================
// 4. STATE EFFECTS (The Engine Logic)
// ==============================================

async function executeStateEffects(state: WorkflowState, payload: any) {
    const { transition, context } = useWorkflowStateMachine.getState();
    const { execAction } = useScriptStore.getState();
    const { getContext } = useAIPlanningContextStore.getState();

    console.log(`[FSM Effect] Executing for state: ${state}`, { context, payload });

    try {
        switch (state) {
            /**
             * [WORKFLOW_STATES.STAGE_RUNNING]: {
             *    [EVENTS.START_STEP]: WORKFLOW_STATES.STEP_RUNNING,
             *    [EVENTS.COMPLETE_STAGE]: WORKFLOW_STATES.STAGE_COMPLETED,
             *    [EVENTS.FAIL]: WORKFLOW_STATES.ERROR,
             *    [EVENTS.CANCEL]: WORKFLOW_STATES.CANCELLED
             * },
             */
            case WORKFLOW_STATES.STAGE_RUNNING: {
                const pipeline = usePipelineStore.getState();
                const stage = pipeline.workflowTemplate?.stages.find(s => s.id === context.currentStageId);
                const firstStepId = stage?.steps[0]?.id;

                if (firstStepId) {
                    useWorkflowStateMachine.setState(s => ({ context: { ...s.context, currentStepId: firstStepId } }));
                    transition(EVENTS.START_STEP);
                } else {
                    transition(EVENTS.FAIL, { error: new Error(`No steps found in stage ${context.currentStageId}`) });
                }
                break;
            }

            case WORKFLOW_STATES.STEP_RUNNING: {
                const firstBehaviorId = 'behavior_1'; // Placeholder
                
                if (firstBehaviorId) {
                    useWorkflowStateMachine.setState(s => ({ context: { ...s.context, currentBehaviorId: firstBehaviorId } }));
                    transition(EVENTS.START_BEHAVIOR);
                } else {
                    transition(EVENTS.FAIL, { error: new Error(`No behaviors found for step ${context.currentStepId}`) });
                }
                break;
            }

            case WORKFLOW_STATES.BEHAVIOR_RUNNING: {
                console.log(`[FSM Effect] Fetching actions for behavior: ${context.currentBehaviorId}`);
                const response = await fetch(constants.API.SEQUENCE_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        stage_id: context.currentStageId,
                        step_index: context.currentStepId,
                        state: getContext(),
                        stream: true,
                    }),
                });
                if (!response.ok) throw new Error(`Sequence API failed: ${response.status}`);

                const reader = response.body!.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = "";
                const actions: any[] = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        if (line.trim()) {
                            const message = JSON.parse(line);
                            if (message.action) actions.push(message.action);
                        }
                    }
                }                
                useWorkflowStateMachine.setState(s => ({ context: { ...s.context, currentBehaviorActions: actions, currentActionIndex: 0 }}));

                if (actions.length > 0) {
                    transition(EVENTS.START_ACTION);
                } else {
                    // No actions to execute, directly move to feedback
                    transition(EVENTS.COMPLETE_BEHAVIOR);
                }
                break;
            }

            case WORKFLOW_STATES.ACTION_RUNNING: {
                const currentAction = context.currentBehaviorActions[context.currentActionIndex];
                console.log(`[FSM Effect] Executing action #${context.currentActionIndex + 1}:`, currentAction.action);
                await execAction(currentAction); 
                transition(EVENTS.COMPLETE_ACTION);
                break;
            }

            case WORKFLOW_STATES.ACTION_COMPLETED: {
                const nextActionIndex = context.currentActionIndex + 1;
                if (nextActionIndex < context.currentBehaviorActions.length) {
                    useWorkflowStateMachine.setState(s => ({ context: { ...s.context, currentActionIndex: nextActionIndex }}));
                    transition(EVENTS.START_ACTION);
                } else {
                    transition(EVENTS.COMPLETE_BEHAVIOR);
                }
                break;
            }
            
            case WORKFLOW_STATES.BEHAVIOR_COMPLETED: {
                const feedbackResponse: FeedbackResponse = await workflowAPIClient.sendFeedback({
                    stage_id: context.currentStageId!,
                    step_index: context.currentStepId!,
                    state: getContext() || {},
                });

                if (feedbackResponse.targetAchieved) {
                    if (feedbackResponse.stepCompleted) {
                        transition(EVENTS.COMPLETE_BEHAVIOR);
                    } else if (feedbackResponse.nextBehaviorId) {
                        useWorkflowStateMachine.setState(s => ({ context: { ...s.context, currentBehaviorId: feedbackResponse.nextBehaviorId! }}));
                        transition(EVENTS.NEXT_BEHAVIOR);
                    } else {
                        transition(EVENTS.COMPLETE_STEP);
                    }
                } else {
                    transition(EVENTS.NEXT_BEHAVIOR);
                }
                break;
            }

            case WORKFLOW_STATES.STEP_COMPLETED: {
                const pipeline = usePipelineStore.getState();
                const stage = pipeline.workflowTemplate?.stages.find(s => s.id === context.currentStageId);
                const currentStepIndex = stage?.steps.findIndex(st => st.id === context.currentStepId) ?? -1;
                const isLastStep = currentStepIndex === (stage?.steps.length ?? 0) - 1;

                if (isLastStep) {
                    transition(EVENTS.COMPLETE_STAGE);
                } else {
                    // Auto-advance to the next step in the same stage
                    const nextStep = stage?.steps[currentStepIndex + 1];
                    if (nextStep && nextStep.id) {
                        const nextStepId: string = nextStep.id;
                        useWorkflowStateMachine.setState(state => ({
                            ...state,
                            context: { ...state.context, currentStepId: nextStepId }
                        }));
                        transition(EVENTS.START_STEP);
                    } else {
                        transition(EVENTS.FAIL, { error: new Error(`Could not find next step after ${context.currentStepId}`) });
                    }
                }
                break;
            }

            case WORKFLOW_STATES.STAGE_COMPLETED: {
                const pipeline = usePipelineStore.getState();
                const currentStageIndex = pipeline.workflowTemplate?.stages.findIndex(s => s.id === context.currentStageId) ?? -1;
                const isLastStage = currentStageIndex === (pipeline.workflowTemplate?.stages.length ?? 0) - 1;

                if (isLastStage) {
                    transition(EVENTS.COMPLETE_WORKFLOW);
                } else {
                    const nextStage = pipeline.workflowTemplate?.stages[currentStageIndex + 1];
                    if (nextStage) {
                        useWorkflowStateMachine.setState(state => ({
                            ...state,
                            context: { ...state.context, currentStageId: nextStage.id, currentStepId: null }
                        }));
                        transition(EVENTS.START_WORKFLOW); // Re-enter the running state for the new stage
                    } else {
                        transition(EVENTS.FAIL, { error: new Error(`Could not find next stage after ${context.currentStageId}`) });
                    }
                }
                break;
            }
        }
    } catch (error) {
        console.error(`[FSM Effect] Unhandled error in state ${state}:`, error);
        useWorkflowStateMachine.getState().transition(EVENTS.FAIL, { error: error instanceof Error ? error.message : String(error) });
    }
}

// ==============================================
// 5. ZUSTAND STORE DEFINITION
// ==============================================

export const useWorkflowStateMachine = create<WorkflowStateMachine>((set, get) => ({
    currentState: WORKFLOW_STATES.IDLE,
    context: {
        currentStageId: null,
        currentStepId: null,
        currentBehaviorId: null,
        currentBehaviorActions: [],
        currentActionIndex: 0,
    },
    executionHistory: [],
    pendingWorkflowData: null,

    transition: (event, payload = {}) => {
        const fromState = get().currentState;
        const toState = STATE_TRANSITIONS[fromState]?.[event];
        if (!toState) {
            console.warn(`[FSM] Invalid transition: From ${fromState} via ${event}`);
            return;
        }
        console.log(`[FSM] Transition: ${fromState} -> ${toState} (Event: ${event})`, payload);
        
        set(state => ({
            executionHistory: [...state.executionHistory, { from: fromState, to: toState, event, payload, timestamp: new Date() }],
            currentState: toState
        }));
        
        setTimeout(() => executeStateEffects(toState, payload), 0);
    },

    startWorkflow: (initialContext) => {
        set({
            context: {
                currentStageId: initialContext.stageId,
                currentStepId: null, // Start with stage, step will be determined by effect
                currentBehaviorId: null,
                currentBehaviorActions: [],
                currentActionIndex: 0,
            }
        });
        get().transition(EVENTS.START_WORKFLOW);
    },
    
    fail: (error, message) => get().transition(EVENTS.FAIL, { error, message }),
    cancel: () => get().transition(EVENTS.CANCEL),
    reset: () => {
        set({
            currentState: WORKFLOW_STATES.IDLE,
            context: { currentStageId: null, currentStepId: null, currentBehaviorId: null, currentBehaviorActions: [], currentActionIndex: 0 },
            executionHistory: [],
            pendingWorkflowData: null,
        });
    },
    
    requestWorkflowUpdate: (payload) => get().transition(EVENTS.UPDATE_WORKFLOW, payload),
    confirmWorkflowUpdate: () => get().transition(EVENTS.UPDATE_WORKFLOW_CONFIRMED),
    rejectWorkflowUpdate: () => get().transition(EVENTS.UPDATE_WORKFLOW_REJECTED),
}));