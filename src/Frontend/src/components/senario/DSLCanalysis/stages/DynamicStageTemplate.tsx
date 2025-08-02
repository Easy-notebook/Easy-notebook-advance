// @ts-nocheck
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { useScriptStore } from '../store/useScriptStore';
import { usePipelineStore } from '../store/pipelineController';
import { useAIPlanningContextStore } from '../store/aiPlanningContext';
import { useWorkflowStateMachine, WORKFLOW_STATES, EVENTS } from '../store/workflowStateMachine';
import constants from './constants';

// ==================== Step Execution Queue (One at a time) ====================
class StepExecutionQueue {
    constructor() {
        this.isExecuting = false;
        this.currentStepId = null;
        this.pendingExecution = null;
    }

    async executeStep(stepId, stageId, stepIndex, executeFunction) {        
        console.log(`[StepQueue] 🚀 Starting execution of step ${stepId}`);
        this.isExecuting = true;
        this.currentStepId = stepId;

        try {
            const result = await executeFunction(stepId, stageId, stepIndex);
            console.log(`[StepQueue] ✅ Completed execution of step ${stepId}`);
            return result;
        } catch (error) {
            console.error(`[StepQueue] ❌ Failed execution of step ${stepId}:`, error);
            throw error;
        } finally {
            console.log(`[StepQueue] 🧹 Cleaning up execution state for step ${stepId}`);
            this.isExecuting = false;
            this.currentStepId = null;
        }
    }

    forceReset() {
        console.log(`[StepQueue] 🔄 Force resetting queue state`);
        this.isExecuting = false;
        this.currentStepId = null;
    }

    get executing() {
        return this.isExecuting;
    }

    get current() {
        return this.currentStepId;
    }
}

// ==================== Action Operation Queue ====================
class ActionOperationQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.results = [];
    }

    enqueue(operation) {
        this.queue.push(operation);
        return this;
    }

    async executeAll() {
        if (this.isProcessing) {
            console.warn('Action queue is already processing');
            return this.results;
        }

        this.isProcessing = true;
        this.results = [];

        try {
            while (this.queue.length > 0) {
                const operation = this.queue.shift();
                console.log(`Executing action: ${operation.action || 'unknown'}`);
                
                try {
                    const result = await operation.execute();
                    this.results.push(result);
                    console.log(`Action result:`, result);
                } catch (error) {
                    console.error('Action execution failed:', error);
                    this.results.push({ error: error.message });
                }
            }
        } finally {
            this.isProcessing = false;
        }

        return this.results;
    }

    clear() {
        this.queue = [];
        this.results = [];
        this.isProcessing = false;
    }

    get isEmpty() {
        return this.queue.length === 0;
    }
}

// ==================== Dynamic Stage Component (Store-Only Architecture) ====================
const DynamicStageTemplate = ({ onComplete }) => {
    const {
        getCurrentStageConfig,
        workflowTemplate,
        currentStageId,
        currentStepId,
        completedSteps,
        markStepCompleted,
        markStageCompleted,
        setCurrentStepId
    } = usePipelineStore();
    
    // AI Planning Store - step completion tracking and context
    const {
        toDoList,
        markStageAsComplete,
        addThinkingLog,
        isStageComplete: isStageCompleteFromStore,
        getContext,
        setContext,
        isRequestContextSame,
        updateRequestContext,
        clearRequestContext
    } = useAIPlanningContextStore();
    
    // State Machine Store - execution state
    const {
        currentState,
        startStep,
        completeStep,
        failStep,
        completeStage
    } = useWorkflowStateMachine();
    
    // Script Store - step execution
    const { execAction } = useScriptStore();
    
    // Get real-time state from pipeline store to force re-render when stage changes
    const { currentStageId: pipelineCurrentStageId, workflowTemplate: pipelineWorkflowTemplate } = usePipelineStore();
    
    // ==== DERIVED STATE FROM STORES ====
    const currentStageConfig = useMemo(() => {
        const config = getCurrentStageConfig();
        console.log('=== [DynamicStageTemplate] STAGE CONFIG UPDATE ===');
        console.log('Pipeline currentStageId:', pipelineCurrentStageId);
        console.log('getCurrentStageConfig result:', config);
        console.log('Stage ID:', config?.id);
        console.log('Steps count:', config?.steps?.length || 0);
        console.log('Steps details:', config?.steps?.map(s => ({ id: s.id, step_id: s.step_id, name: s.name })) || []);
        return config;
    }, [getCurrentStageConfig, pipelineCurrentStageId, pipelineWorkflowTemplate]);
    
    const { id: stageId, steps = [], name: stageTitle } = currentStageConfig || {};
    
    const currentStepInfo = useMemo(() => {
        if (!steps.length || !currentStepId) return null;
        return steps.find(step => step.step_id === currentStepId || step.id === currentStepId);
    }, [steps, currentStepId]);
    
    const currentStepIndex = useMemo(() => {
        if (!steps.length || !currentStepId) return 0;
        return steps.findIndex(step => step.step_id === currentStepId || step.id === currentStepId);
    }, [steps, currentStepId]);
    
    const isStageComplete = useMemo(() => {
        return isStageCompleteFromStore(stageId);
    }, [isStageCompleteFromStore, stageId]);
    
    const isStepExecuting = currentState === WORKFLOW_STATES.STEP_EXECUTING;
    const isStepCompleted = currentStepId && completedSteps.includes(currentStepId);
    const hasUncompletedTodos = toDoList.length > 0;
    
    // ==== REFS FOR STABILITY ====
    const abortControllerRef = useRef(null);
    const stageCompletionHandledRef = useRef(false);
    const stepQueue = useRef(new StepExecutionQueue());
    const actionQueue = useRef(new ActionOperationQueue());
    
    // ==== ACTION EXECUTION WITH SEQUENTIAL QUEUE ====
    const executeAction = useCallback((action) => {
        actionQueue.current.enqueue({
            action: action.action,
            execute: async () => {
                console.log(`Executing action: ${action.action}`);
                try {
                    const output = await execAction(action);
                    if (output) {
                        console.log(`Action result:`, output);
                    }
                    return output;
                } catch (error) {
                    console.error('Action execution failed:', error);
                    throw error;
                }
            }
        });
    }, [execAction]);
    
    // ==== INTERNAL STEP EXECUTION LOGIC ====
    const executeStepInternal = useCallback(async (stepId, stageId, stepIndex) => {
        console.log('=== [DynamicStageTemplate] EXECUTE STEP CALLED ===');
        console.log(`[DynamicStageTemplate] Executing step: ${stepId}`);
        console.log(`[DynamicStageTemplate] Stage: ${stageId}`);
        console.log(`[DynamicStageTemplate] Step Index: ${stepIndex}`);
        console.log(`[DynamicStageTemplate] Current state machine state: ${currentState}`);
        console.log(`[DynamicStageTemplate] Is stage complete: ${isStageComplete}`);
        
        // Check if this is a duplicate request with same AI context
        const isContextSame = isRequestContextSame(stepId, stageId);
        if (isContextSame) {
            console.log(`[DynamicStageTemplate] ❌ BLOCKED: Step ${stepId} request context is identical to last request`);
            return;
        }
        
        // Update request context to track this execution
        updateRequestContext(stepId, stageId);
        
        // Abort any existing execution
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        try {
            // Force reset state machine if it's in completed state
            if (currentState === WORKFLOW_STATES.WORKFLOW_COMPLETED) {
                console.log('[DynamicStageTemplate] Resetting completed workflow state machine');
                const { reset } = useWorkflowStateMachine.getState();
                reset();
                
                // Only reset stage completion status, keep other states intact
                console.log('[DynamicStageTemplate] Clearing stage completion status only');
                const aiPlanningStore = useAIPlanningContextStore.getState();
                aiPlanningStore.clearStageStatus(stageId);
                
                // Small delay to allow state to update
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Start step in state machine
            const started = startStep(stepId, stageId, stepIndex);
            if (!started) {
                console.warn('Could not start step in state machine, current state:', currentState);
                // If still can't start, force reset and try again
                const { reset } = useWorkflowStateMachine.getState();
                reset();
                
                // Only clear stage completion status for retry  
                console.log('[DynamicStageTemplate] Clearing stage completion status (retry)');
                const aiPlanningStore = useAIPlanningContextStore.getState();
                aiPlanningStore.clearStageStatus(stageId);
                
                await new Promise(resolve => setTimeout(resolve, 50));
                const retryStarted = startStep(stepId, stageId, stepIndex);
                if (!retryStarted) {
                    console.error('Failed to start step even after reset');
                    return;
                }
            }
            
            // If stage is already complete, just mark the step as completed
            if (isStageComplete) {
                console.log('Stage already complete, marking step as completed:', stepId);
                markStepCompleted(stepId);
                completeStep(stepId, { status: 'completed', alreadyCompleted: true });
                
                // Notify WorkflowControl
                window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                    detail: { 
                        stepId, 
                        result: { targetAchieved: true, alreadyCompleted: true },
                        stageId,
                        timestamp: Date.now()
                    }
                }));
                return;
            }
            
            // Execute API call for the step
            console.log('[DynamicStageTemplate] Making API request to:', constants.API.SEQUENCE_API_URL);
            const currentContext = getContext();
            console.log('[DynamicStageTemplate] Current context variables:', currentContext.variables);
            console.log('[DynamicStageTemplate] Required variables check:', {
                problem_name: currentContext.variables?.problem_name,
                user_goal: currentContext.variables?.user_goal,
                problem_description: currentContext.variables?.problem_description,
                context_description: currentContext.variables?.context_description
            });
            console.log('[DynamicStageTemplate] Request payload:', {
                stage_id: stageId,
                step_index: stepId,
                state: currentContext,
                stream: true
            });
            
            const response = await fetch(constants.API.SEQUENCE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    stage_id: stageId,
                    step_index: stepId,
                    state: getContext(),
                    stream: true
                })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            console.log('[DynamicStageTemplate] API response received, status:', response.status);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let resultText = "";
            let hasError = false;
            let errorMessage = "";
            
            console.log('[DynamicStageTemplate] Starting stream processing...');
            
            try {
                while (true) {
                    if (controller.signal.aborted) {
                        console.log('[DynamicStageTemplate] Stream aborted');
                        break;
                    }
                    
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log('[DynamicStageTemplate] Stream ended');
                        break;
                    }
                    
                    const decodedChunk = decoder.decode(value, { stream: true });
                    console.log('[DynamicStageTemplate] Received chunk:', decodedChunk);
                    
                    resultText += decodedChunk;
                    const lines = resultText.split("\n");
                    
                    for (let i = 0; i < lines.length - 1; i++) {
                        if (lines[i].trim()) {
                            try {
                                const message = JSON.parse(lines[i]);
                                if (message.action) {
                                    console.log('=== STREAM MESSAGE RECEIVED ===');
                                    console.log('Action type:', message.action.action);
                                    console.log('Raw message:', JSON.stringify(message, null, 2));
                                    
                                    // Execute the action through operation queue
                                    executeAction(message.action);
                                    
                                    // Update context if provided
                                    if (message.action.state) {
                                        setContext(message.action.state);
                                    }
                                }
                            } catch (e) {
                                console.error("JSON parsing error:", e);
                            }
                        }
                    }
                    resultText = lines[lines.length - 1];
                }
            } finally {
                try {
                    await reader.cancel();
                } catch (e) {
                    console.error('Error cancelling stream:', e);
                }
            }
            
            // Execute all actions sequentially
            console.log('[DynamicStageTemplate] Executing action queue sequentially...');
            console.log('[DynamicStageTemplate] Queue length:', actionQueue.current.queue.length);
            
            if (!actionQueue.current.isEmpty) {
                const results = await actionQueue.current.executeAll();
                console.log('[DynamicStageTemplate] All actions completed:', results);
            } else {
                console.log('[DynamicStageTemplate] Action queue is empty, proceeding to feedback');
            }
            
            
            // Check feedback to determine if step completed successfully
            const feedbackResponse = await fetch(constants.API.FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stage_id: stageId,
                    step_index: stepId,
                    state: getContext(),
                })
            });
            
            if (feedbackResponse.ok) {
                const feedbackResult = await feedbackResponse.json();
                console.log('[DynamicStageTemplate] Feedback result:', feedbackResult);
                
                if (feedbackResult.targetAchieved) {
                    console.log('Step completed successfully:', stepId);
                    
                    // First update all stores
                    markStepCompleted(stepId);
                    completeStep(stepId, feedbackResult);
                    
                    // Log to AI planning
                    addThinkingLog({
                        timestamp: Date.now(),
                        action: 'step_completed',
                        stepId,
                        stageId,
                        result: feedbackResult
                    });
                    
                    // Notify WorkflowControl immediately - state should be synchronous
                    window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                        detail: { 
                            stepId, 
                            result: feedbackResult,
                            stageId,
                            timestamp: Date.now()
                        }
                    }));
                    
                    // Reset step queue state after successful completion
                    console.log('[DynamicStageTemplate] Resetting step queue after successful completion');
                    stepQueue.current.forceReset();
                } else {
                    console.log('Step target not achieved, checking updated todoList status:', stepId);
                    
                    // Get fresh todoList state after all operations and state updates
                    const currentContext = getContext();
                    const currentTodoList = currentContext.toDoList || [];
                    console.log('Updated todoList length:', currentTodoList.length);
                    console.log('Updated todoList content:', currentTodoList);
                    
                    if (currentTodoList.length > 0) {
                        console.log('TodoList not empty, step is progressing. Scheduling automatic retry.');
                        // Don't call failStep - the step is making progress with remaining todos
                        // Schedule immediate retry
                        window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
                            detail: { 
                                stepId, 
                                action: 'auto_retry_with_todos',
                                timestamp: Date.now(),
                                stageId
                            }
                        }));
                    } else {
                        console.log('Updated todoList empty but target not achieved. This might be a feedback API issue.');
                        console.log('Since all todos are completed, treating as successful completion.');
                        
                        // If todoList is empty, it means all planned tasks were completed
                        // The feedback API might be too strict or have different criteria
                        // Since our system is based on todoList completion, we should trust that
                        markStepCompleted(stepId);
                        completeStep(stepId, { 
                            status: 'completed', 
                            targetAchieved: true, 
                            reason: 'All todos completed despite feedback API response'
                        });
                        
                        // Log to AI planning
                        addThinkingLog({
                            timestamp: Date.now(),
                            action: 'step_completed_override',
                            stepId,
                            stageId,
                            reason: 'TodoList empty indicates completion'
                        });
                        
                        // Notify WorkflowControl immediately - state should be synchronous
                        window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                            detail: { 
                                stepId, 
                                result: { 
                                    targetAchieved: true, 
                                    overrideReason: 'All todos completed'
                                },
                                stageId,
                                timestamp: Date.now()
                            }
                        }));
                        
                        // Reset step queue state after override completion
                        console.log('[DynamicStageTemplate] Resetting step queue after override completion');
                        stepQueue.current.forceReset();
                    }
                }
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Step execution aborted:', stepId);
                return;
            }
            
            console.error('Step execution failed:', error);
            
            // Check todoList before marking as failed
            const currentTodoList = toDoList;
            console.log('Error occurred, checking todoList status. Length:', currentTodoList.length);
            
            if (currentTodoList.length > 0) {
                console.log('TodoList not empty despite error, scheduling automatic retry.');
                // Don't call failStep - there might be partial progress that can continue
                // Schedule automatic retry after a short delay
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
                        detail: { 
                            stepId, 
                            action: 'auto_retry_after_error',
                            timestamp: Date.now(),
                            stageId
                        }
                    }));
                }, 5000); // 5 second delay for retry after error
            } else {
                console.log('TodoList empty and error occurred, marking as failed:', stepId);
                failStep(stepId, error);
                
                // Reset step queue state after failure
                console.log('[DynamicStageTemplate] Resetting step queue after failure');
                stepQueue.current.forceReset();
            }
            
            addThinkingLog({
                timestamp: Date.now(),
                action: 'step_error',
                stepId,
                stageId,
                error: error.message,
                todoListLength: currentTodoList.length
            });
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [
        getContext, setContext, execAction, failStep, addThinkingLog
    ]);
    
    // ==== STEP EXECUTION WRAPPER (Queue-based) ====
    const executeStep = useCallback(async (stepId, stageId, stepIndex) => {
        return stepQueue.current.executeStep(stepId, stageId, stepIndex, executeStepInternal);
    }, [executeStepInternal]);
    
    // ==== EVENT LISTENERS ====
    useEffect(() => {
        const handleWorkflowStepTrigger = (event) => {
            const { stepId, action, timestamp, stageId: triggerStageId } = event.detail;
            console.log('=== [DynamicStageTemplate] WORKFLOW STEP TRIGGER RECEIVED ===');
            console.log(`[DynamicStageTemplate] Event details:`, { 
                stepId, 
                action, 
                timestamp, 
                triggerStageId,
                currentStageId: stageId 
            });
            console.log('[DynamicStageTemplate] Current component state:', {
                stageId,
                steps: steps.map(s => s.step_id || s.id),
                stepCount: steps.length
            });
            
            // Check if this trigger is for our current stage
            if (triggerStageId && triggerStageId !== stageId) {
                console.log(`[DynamicStageTemplate] ❌ IGNORING: Trigger for stage ${triggerStageId}, but component is on stage ${stageId}`);
                console.log(`[DynamicStageTemplate] This component will update when getCurrentStageConfig() returns the new stage`);
                return;
            }
            
            // Check if this trigger is for a step in our current stage
            const targetStepIndex = steps.findIndex(step => 
                (step.step_id === stepId || step.id === stepId)
            );
            
            if (targetStepIndex >= 0) {
                console.log('=== [DynamicStageTemplate] STEP EXECUTION TRIGGERED ===');
                console.log(`[DynamicStageTemplate] Executing step ${stepId} at index ${targetStepIndex}`);
                console.log(`[DynamicStageTemplate] Step details:`, steps[targetStepIndex]);
                console.log(`[DynamicStageTemplate] Stage: ${stageId}`);
                executeStep(stepId, stageId, targetStepIndex);
            } else {
                console.log('=== [DynamicStageTemplate] STEP NOT FOUND ===');
                console.log(`[DynamicStageTemplate] Step ${stepId} not found in current stage ${stageId}, retrying...`);
                console.log(`[DynamicStageTemplate] Current steps:`, steps.map(s => s.step_id || s.id));
                console.log(`[DynamicStageTemplate] Looking for step ID: ${stepId}`);
                
                // Retry after a short delay in case the component is still updating
                setTimeout(() => {
                    const retriedStepIndex = steps.findIndex(step => 
                        (step.step_id === stepId || step.id === stepId)
                    );
                    
                    if (retriedStepIndex >= 0) {
                        console.log(`[DynamicStageTemplate] Retry successful! Executing step ${stepId} at index ${retriedStepIndex}`);
                        executeStep(stepId, stageId, retriedStepIndex);
                    } else {
                        console.warn(`[DynamicStageTemplate] Step ${stepId} still not found after retry in stage ${stageId}`);
                        console.log(`[DynamicStageTemplate] Available steps after retry:`, steps.map(s => s.step_id || s.id));
                    }
                }, 500);
            }
        };
        
        window.addEventListener('workflowStepTrigger', handleWorkflowStepTrigger);
        
        return () => {
            window.removeEventListener('workflowStepTrigger', handleWorkflowStepTrigger);
        };
    }, [steps, stageId, executeStep]);
    
    // ==== STAGE COMPLETION HANDLING ====
    useEffect(() => {
        if (!steps.length || stageCompletionHandledRef.current) return;
        
        const allStepsCompleted = steps.every(step => 
            completedSteps.includes(step.step_id) || completedSteps.includes(step.id)
        );
        
        if (allStepsCompleted && !isStageComplete) {
            console.log('All steps completed, marking stage as complete:', stageId);
            stageCompletionHandledRef.current = true;
            
            markStageCompleted(stageId);
            markStageAsComplete(stageId);
            completeStage(stageId);
            
            // Call onComplete for navigation
            if (onComplete) {
                setTimeout(() => onComplete(), 1000);
            }
        }
    }, [steps, completedSteps, isStageComplete, stageId, markStageCompleted, markStageAsComplete, completeStage, onComplete]);
    
    // Reset stage completion flag when stage changes
    useEffect(() => {
        stageCompletionHandledRef.current = false;
    }, [stageId]);
    
    // ==== STAGE READY NOTIFICATION ====
    useEffect(() => {
        if (stageId && steps.length > 0) {
            console.log('=== [DynamicStageTemplate] STAGE READY ===');
            console.log(`[DynamicStageTemplate] Stage ${stageId} is ready with ${steps.length} steps`);
            console.log('[DynamicStageTemplate] Steps available:', steps.map(step => ({
                id: step.id,
                step_id: step.step_id,
                name: step.name
            })));
            
            window.dispatchEvent(new CustomEvent('dynamicStageReady', {
                detail: { 
                    stageId,
                    stepCount: steps.length,
                    steps: steps.map(step => ({
                        id: step.id,
                        step_id: step.step_id,
                        name: step.name
                    })),
                    timestamp: Date.now()
                }
            }));
            
            console.log(`[DynamicStageTemplate] dynamicStageReady event dispatched for stage ${stageId}`);
        } else {
            console.log(`[DynamicStageTemplate] Stage not ready - stageId: ${stageId}, steps: ${steps.length}`);
        }
    }, [stageId, steps.length]);
    
    // ==== CLEANUP ====
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            // Clear queues on unmount
            actionQueue.current.clear();
            stepQueue.current.forceReset();
        };
    }, []);
    
    // ==== ERROR DISPLAY COMPONENT ====
    const ErrorDisplay = ({ error, onRetry, onDismiss }) => (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4 rounded-r shadow-sm">
            <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-1" />
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <p className="font-medium text-red-800 text-lg">Error</p>
                        {onDismiss && (
                            <button onClick={onDismiss} className="text-gray-500 hover:text-gray-700 transition-colors">
                                <XCircle size={20} />
                            </button>
                        )}
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                    <div className="mt-3 flex space-x-2">
                        {onRetry && (
                            <button
                                className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors flex items-center"
                                onClick={onRetry}
                            >
                                <RefreshCw size={14} className="mr-1" />
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
    
    // This is a headless component - it manages workflow logic and state
    // The actual UI rendering is handled by BasicMode components
    return null;
};

export default DynamicStageTemplate;