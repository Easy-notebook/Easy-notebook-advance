// @ts-nocheck
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import PersistentStepContainer from '../cells/GrowingCellContainer';
import { useScriptStore } from '../store/useScriptStore';
import { usePipelineStore } from '../store/pipelineController';
import { useAIPlanningContextStore } from '../store/aiPlanningContext';
import { useWorkflowStateMachine, WORKFLOW_STATES, EVENTS } from '../store/workflowStateMachine';
import constants from './constants';

// ==================== Operation Queue Class (Plan Executor) ====================
class OperationQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentOperation = null;
        this.onQueueEmpty = null;
    }

    enqueue(operation) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                ...operation,
                _resolve: resolve,
                _reject: reject
            });
            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }

    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            if (this.onQueueEmpty) this.onQueueEmpty();
            return;
        }
        this.isProcessing = true;
        const operation = this.queue.shift();
        this.currentOperation = operation;
        try {
            if (operation.delay) {
                await new Promise(resolve => setTimeout(resolve, operation.delay));
            }
            const result = await operation.execute();
            operation._resolve(result);
            setTimeout(() => this.processNext(), constants.DELAY.OPERATION_BUFFER_DELAY);
        } catch (error) {
            console.error('Operation execution error:', error);
            operation._reject(error);
            setTimeout(() => this.processNext(), constants.DELAY.OPERATION_BUFFER_DELAY);
        }
    }

    clear() {
        // Silently resolve pending operations instead of rejecting them
        this.queue.forEach(op => {
            try {
                op._resolve(null); // Resolve with null instead of rejecting
            } catch (error) {
                // Ignore any errors from resolving
                console.warn('Error resolving cleared operation:', error);
            }
        });
        this.queue = [];
        this.isProcessing = false;
    }

    setOnQueueEmpty(callback) {
        this.onQueueEmpty = callback;
    }

    get active() {
        return this.isProcessing || this.queue.length > 0;
    }
}

// ==================== Skeleton Loader ====================
const SkeletonLoader = ({ count = 2 }) => (
    <div className="animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="mb-6">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-11/12 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                {i === 1 && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-11/12"></div>
                    </div>
                )}
            </div>
        ))}
    </div>
);

// ==================== Dynamic Stage Component (Store-Only Architecture) ====================
const DynamicStageTemplate = ({ onComplete }) => {
    console.log('DynamicStageTemplate mounted with onComplete:', !!onComplete);
    
    // ==== ALL DATA FROM STORES ONLY ====
    // Pipeline Store - workflow template and stage/step management
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
        setContext
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
    const { execAction, switchStep, clearStep } = useScriptStore();
    
    // ==== DERIVED STATE FROM STORES ====
    const currentStageConfig = useMemo(() => {
        const config = getCurrentStageConfig();
        console.log('getCurrentStageConfig result:', config);
        return config;
    }, [getCurrentStageConfig]);
    
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
    const operationQueue = useRef(new OperationQueue());
    const executingStepRef = useRef(null);
    
    // ==== ACTION EXECUTION WITH QUEUE ====
    const executeAction = useCallback(async (action) => {
        try {
            return await operationQueue.current.enqueue({
                execute: async () => {
                    console.log(`Executing operation: ${action.action}`);
                    try {
                        const output = await execAction(action);
                        if (output) {
                            console.log(`Operation result:`, output);
                        }
                        return output;
                    } catch (error) {
                        console.error('Operation execution failed:', error);
                        throw error;
                    }
                },
                delay: action.delay || 0
            });
        } catch (error) {
            // Handle queue cleared or other queue-related errors silently
            if (error.message === 'Queue cleared') {
                console.log('Operation cancelled due to queue clear');
                return null;
            }
            throw error;
        }
    }, [execAction]);
    
    // ==== STEP EXECUTION LOGIC ====
    const executeStep = useCallback(async (stepId, stageId, stepIndex) => {
        console.log(`[DynamicStageTemplate] Executing step: ${stepId}`);
        
        // Prevent duplicate execution
        if (executingStepRef.current === stepId) {
            console.log(`[DynamicStageTemplate] Step ${stepId} is already executing, skipping duplicate`);
            return;
        }
        
        executingStepRef.current = stepId;
        
        // Abort any existing execution
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        try {
            // Switch to the step in the UI
            switchStep(stepId);
            
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
                    // Ignore cleanup errors
                }
            }
            
            // Wait for all operations to complete before checking feedback
            console.log('[DynamicStageTemplate] Waiting for operation queue to complete...');
            console.log('[DynamicStageTemplate] Queue active:', operationQueue.current.active);
            console.log('[DynamicStageTemplate] Queue length:', operationQueue.current.queue.length);
            
            await new Promise(resolve => {
                if (!operationQueue.current.active) {
                    console.log('[DynamicStageTemplate] Queue already empty, proceeding to feedback');
                    resolve();
                } else {
                    console.log('[DynamicStageTemplate] Waiting for queue to empty...');
                    const originalOnQueueEmpty = operationQueue.current.onQueueEmpty;
                    operationQueue.current.setOnQueueEmpty(() => {
                        console.log('[DynamicStageTemplate] Queue emptied, proceeding to feedback');
                        resolve();
                        operationQueue.current.setOnQueueEmpty(originalOnQueueEmpty);
                    });
                }
            });
            
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
                
                if (feedbackResult.targetAchieved) {
                    console.log('Step completed successfully:', stepId);
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
                    
                    // Notify WorkflowControl
                    window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                        detail: { 
                            stepId, 
                            result: feedbackResult,
                            stageId,
                            timestamp: Date.now()
                        }
                    }));
                } else {
                    console.log('Step target not achieved, may need retry:', stepId);
                    failStep(stepId, { message: 'Target not achieved' });
                }
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Step execution aborted:', stepId);
                return;
            }
            
            console.error('Step execution failed:', error);
            failStep(stepId, error);
            
            addThinkingLog({
                timestamp: Date.now(),
                action: 'step_failed',
                stepId,
                stageId,
                error: error.message
            });
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
            // Clear executing step reference
            if (executingStepRef.current === stepId) {
                executingStepRef.current = null;
            }
        }
    }, [
        switchStep, startStep, isStageComplete, markStepCompleted, completeStep,
        getContext, setContext, execAction, failStep, addThinkingLog
    ]);
    
    // ==== EVENT LISTENERS ====
    useEffect(() => {
        const handleWorkflowStepTrigger = (event) => {
            const { stepId, action, timestamp } = event.detail;
            console.log(`[DynamicStageTemplate] Received workflowStepTrigger:`, { stepId, action, timestamp, currentStageId: stageId });
            
            // Check if this trigger is for a step in our current stage
            const targetStepIndex = steps.findIndex(step => 
                (step.step_id === stepId || step.id === stepId)
            );
            
            if (targetStepIndex >= 0) {
                console.log(`[DynamicStageTemplate] Executing step ${stepId} at index ${targetStepIndex}`);
                executeStep(stepId, stageId, targetStepIndex);
            } else {
                console.log(`[DynamicStageTemplate] Step ${stepId} not found in current stage ${stageId}`);
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
            console.log(`[DynamicStageTemplate] Stage ${stageId} is ready with ${steps.length} steps`);
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
        }
    }, [stageId, steps.length]);
    
    // ==== CLEANUP ====
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            // Clear operation queue on unmount
            operationQueue.current.clear();
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
    
    // ==== RENDER LOGIC ====
    if (!currentStageConfig) {
        console.log('DynamicStageTemplate: No stage config available, showing skeleton');
        return <SkeletonLoader count={3} />;
    }
    
    const shouldShowContent = currentStepInfo && (isStepExecuting || isStepCompleted);
    const showLoading = isStepExecuting && hasUncompletedTodos;
    
    console.log('DynamicStageTemplate render state:', {
        stageId,
        currentStepId,
        currentStepIndex,
        stepsLength: steps.length,
        isStepExecuting,
        isStepCompleted,
        hasUncompletedTodos,
        shouldShowContent
    });
    
    return (
        <div className="w-full h-full overflow-y-auto">
            <div className="flex w-full">
                <div className="max-w-screen-xl w-full mx-auto">
                    <div className="flex-1 h-full w-full">
                        <div className="p-2 h-full w-full">
                            {showLoading ? (
                                <div className="p-1">
                                    <div className="text-xs text-gray-500 mb-2">
                                        Loading step {currentStepIndex + 1}: {currentStepInfo?.name}...
                                    </div>
                                    <SkeletonLoader count={3} />
                                </div>
                            ) : shouldShowContent ? (
                                <div className="overflow-y-auto">
                                    <PersistentStepContainer
                                        showRemoveButton={false}
                                        autoScroll={true}
                                        className="content-start"
                                        emptyState={
                                            <div className="p-4 text-center">
                                                <div className="text-sm text-gray-600">
                                                    Step completed but no content generated
                                                </div>
                                            </div>
                                        }
                                        stepId={currentStepId}
                                    />
                                </div>
                            ) : (
                                <div className="p-4 text-center">
                                    <div className="text-xs text-gray-500 mb-2">
                                        Waiting for step execution...
                                    </div>
                                    <SkeletonLoader count={1} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DynamicStageTemplate;