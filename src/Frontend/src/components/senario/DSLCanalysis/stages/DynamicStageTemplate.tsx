import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import PersistentStepContainer from '../cells/GrowingCellContainer';
import { useScriptStore } from '../store/useScriptStore';
import { useAIPlanningContextStore } from '../store/aiPlanningContext';
import { usePipelineStore } from '../store/pipelineController';
import { useWorkflowControlStore } from '../../../Notebook/store/workflowControlStore';
import { useWorkflowManager } from '../../../Notebook/hooks/useWorkflowManager';
import { useWorkflowPanelStore } from '../../../Notebook/store/workflowPanelStore';
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
            // Check if operation was cancelled before execution
            if (operation.cancelled) {
                console.log('Skipping cancelled operation');
                operation._resolve({ cancelled: true, message: 'Operation was cancelled' });
                setTimeout(() => this.processNext(), constants.DELAY.OPERATION_BUFFER_DELAY);
                return;
            }
            
            if (operation.delay) {
                await new Promise(resolve => setTimeout(resolve, operation.delay));
            }
            
            // Check again after delay
            if (operation.cancelled) {
                console.log('Operation cancelled during delay');
                operation._resolve({ cancelled: true, message: 'Operation cancelled during delay' });
                setTimeout(() => this.processNext(), constants.DELAY.OPERATION_BUFFER_DELAY);
                return;
            }
            
            const result = await operation.execute();
            
            // Check if operation was cancelled during execution
            if (operation.cancelled) {
                console.log('Operation cancelled during execution');
                operation._resolve({ cancelled: true, message: 'Operation cancelled during execution', partialResult: result });
            } else {
                operation._resolve(result);
            }
            setTimeout(() => this.processNext(), constants.DELAY.OPERATION_BUFFER_DELAY);
        } catch (error) {
            console.error('Operation execution error:', error);
            if (operation.cancelled) {
                operation._resolve({ cancelled: true, message: 'Operation cancelled with error', error });
            } else {
                operation._reject(error);
            }
            setTimeout(() => this.processNext(), constants.DELAY.OPERATION_BUFFER_DELAY);
        } finally {
            this.currentOperation = null;
        }
    }

    clear() {
        console.log(`Clearing operation queue with ${this.queue.length} pending operations`);
        // Cancel current operation first
        if (this.currentOperation) {
            console.log('Cancelling current operation');
            this.currentOperation.cancelled = true;
        }
        
        // Resolve pending operations with cancellation signal
        this.queue.forEach((op, index) => {
            try {
                console.log(`Resolving cancelled operation ${index + 1}`);
                op._resolve({ cancelled: true, message: 'Operation cancelled due to queue clear' });
            } catch (error) {
                console.warn('Error resolving cleared operation:', error);
            }
        });
        this.queue = [];
        this.isProcessing = false;
        this.currentOperation = null;
    }

    setOnQueueEmpty(callback) {
        this.onQueueEmpty = callback;
    }

    get active() {
        return this.isProcessing || this.queue.length > 0;
    }
}

// ==================== Countdown Hook removed - now handled by MainContainer ====================

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

// ==================== State Management ====================
const initialStageState = {
    currentStepIndex: 0,
    stepsLoaded: [],
    error: null,
    errorDetails: null,
    isLoading: false,
    streamCompleted: false,
    uiLoaded: false,
    isCompleted: false,
    autoAdvance: true,
    isReturnVisit: false,
    historyLoaded: false
};

const stageStateReducer = (state, action) => {
    switch (action.type) {
        case 'RESET_STATE':
            return { ...initialStageState };
        case 'SET_CURRENT_STEP_INDEX':
            return { ...state, currentStepIndex: action.payload };
        case 'ADD_LOADED_STEP':
            return { 
                ...state, 
                stepsLoaded: state.stepsLoaded.includes(action.payload) 
                    ? state.stepsLoaded 
                    : [...state.stepsLoaded, action.payload] 
            };
        case 'FILTER_LOADED_STEPS':
            return { 
                ...state, 
                stepsLoaded: state.stepsLoaded.filter(index => index < action.payload) 
            };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { 
                ...state, 
                error: action.payload.error, 
                errorDetails: action.payload.errorDetails 
            };
        case 'CLEAR_ERROR':
            return { ...state, error: null, errorDetails: null };
        case 'SET_STREAM_COMPLETED':
            return { ...state, streamCompleted: action.payload };
        case 'SET_UI_LOADED':
            return { ...state, uiLoaded: action.payload };
        case 'SET_COMPLETED':
            return { ...state, isCompleted: action.payload };
        case 'SET_AUTO_ADVANCE':
            return { ...state, autoAdvance: action.payload };
        case 'SET_RETURN_VISIT':
            return { ...state, isReturnVisit: action.payload };
        case 'SET_HISTORY_LOADED':
            return { ...state, historyLoaded: action.payload };
        case 'SET_MULTIPLE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

// ==================== Dynamic Stage Component ====================
const DynamicStageTemplate = ({ onComplete }) => {
    console.log('DynamicStageTemplate mounted with onComplete:', !!onComplete);
    
    // Get stage configuration from pipeline store with memoization
    const { 
        getCurrentStageConfig,
        markStepCompleted,
        markStageCompleted: markPipelineStageCompleted,
        currentStepId: pipelineCurrentStepId,
        setCurrentStepId: setPipelineCurrentStepId,
        workflowTemplate,
        currentStageId
    } = usePipelineStore();
    
    const currentStageConfig = useMemo(() => {
        const config = getCurrentStageConfig();
        console.log('getCurrentStageConfig result:', config);
        return config;
    }, [workflowTemplate, currentStageId]);
    
    const { id: stageId, steps, name: stageTitle } = currentStageConfig || { id: '', steps: [], name: '' };
    
    console.log('Mount state:', { stageId, stepsLength: steps?.length || 0 });
    const config = useMemo(() => ({
        stageId,
        steps,
        stageTitle,
        initialVariables: {},
        initialChecklist: {}
    }), [stageId, JSON.stringify(steps), stageTitle]);

    // Use reducer for main state management
    const [stageState, dispatch] = useReducer(stageStateReducer, initialStageState);
    const {
        currentStepIndex,
        stepsLoaded,
        error,
        errorDetails,
        isLoading,
        streamCompleted,
        uiLoaded,
        isCompleted,
        autoAdvance,
        isReturnVisit,
        historyLoaded
    } = stageState;
    
    // Timeout tracking refs to prevent overlapping timeouts
    const autoAdvanceTimeoutRef = useRef(null);
    const initialLoadTimeoutRef = useRef(null);
    const navigationTimeoutRef = useRef(null);

    // Save the latest step configuration and stageId
    const stepsRef = useRef(steps);
    const stageIdRef = useRef(stageId);
    const initialLoadCalledRef = useRef(false);
    const currentLoadStepControllerRef = useRef(null);
    const currentStepRef = useRef(null);
    const stepSwitchCounterRef = useRef(0);
    const operationQueue = useRef(new OperationQueue());
    
    // Global AI Planning Context
    const {
        markStageAsComplete,
        setChecklist,
        addVariable,
    } = useAIPlanningContextStore();

    // Use refs to store stable function references
    const loadStepRef = useRef(null);
    const markStageAsCompleteRef = useRef(markStageAsComplete);

    // WorkflowControl integration for DSLC stages
    const {
        setIsGenerating: setWorkflowGenerating,
        setIsCompleted: setWorkflowCompleted,
        setContinueCountdown,
        setOnTerminate,
        setOnContinue,
        setOnCancelCountdown,
        setContinueButtonText
    } = useWorkflowControlStore();

    const { clearStep, switchStep, execAction, markStepIncomplete } = useScriptStore();

    // Pre-fetch methods from store
    const getContext = useAIPlanningContextStore(state => state.getContext);
    const setContext = useAIPlanningContextStore(state => state.setContext);
    const addEffect = useAIPlanningContextStore(state => state.addEffect);

    // Get stage completion status for use as an effect dependency
    const isStageComplete = useAIPlanningContextStore(state => state.isStageComplete(stageId));
    const toDoList = useAIPlanningContextStore(state => state.toDoList);

    // Retrieve variable state
    const variables = useAIPlanningContextStore(state => state.variables);

    // Removed: useWorkflowPanelStore setCurrentStepIndex - now using pipeline store directly

    // Use workflow manager hook to handle workflow-related logic
    const {
        processWorkflowUpdate,
        processStageStepsUpdate,
        setNavigationHandler
    } = useWorkflowManager(stageId, currentStepIndex, stepsLoaded, isCompleted, steps);

    // ---------- step Switching Logic ----------
    const debouncedSwitchStep = useCallback((stepId) => {
        if (currentStepRef.current === stepId) return;
        stepSwitchCounterRef.current += 1;
        currentStepRef.current = stepId;
        switchStep(stepId);
    }, [switchStep]);

    // ---------- Monitor Configuration Changes ----------
    useEffect(() => {
        if (stageIdRef.current !== stageId) {
            console.log(`Stage ID changed from ${stageIdRef.current} to ${stageId}, resetting state`);
            
            // Abort any ongoing requests first
            if (currentLoadStepControllerRef.current) {
                console.log('Aborting ongoing request due to stage change');
                currentLoadStepControllerRef.current.abort();
                currentLoadStepControllerRef.current = null;
            }
            
            // Check if this is a workflow update scenario
            const workflowPanelState = useWorkflowPanelStore.getState();
            const isWorkflowUpdate = streamCompleted || isCompleted || 
                                   workflowPanelState.showWorkflowConfirm || 
                                   workflowPanelState.workflowUpdated;
            
            dispatch({ type: 'RESET_STATE' });
            initialLoadCalledRef.current = false;
            stageIdRef.current = stageId;
            stepsRef.current = steps;

            operationQueue.current.clear();
            
            // Force initial load for new stage if steps are available
            if (steps.length > 0) {
                console.log('Stage changed - scheduling immediate initial load for new stage');
                setTimeout(() => {
                    if (loadStepRef.current && !initialLoadCalledRef.current) {
                        console.log('Executing forced initial load for stage change');
                        initialLoadCalledRef.current = true;
                        loadStepRef.current(0);
                    }
                }, 150); // Delay to ensure component state is fully reset
            }
            
            // Only clear step if this is not a workflow update to preserve cell content
            if (currentStepRef.current && !isWorkflowUpdate) {
                console.log('Clearing step due to stage change (not workflow update)');
                clearStep(currentStepRef.current);
                currentStepRef.current = null;
            } else if (currentStepRef.current) {
                console.log('Preserving step content during workflow update');
                currentStepRef.current = null;
            }
            
            // Clear timeouts when stage changes
            if (autoAdvanceTimeoutRef.current) {
                clearTimeout(autoAdvanceTimeoutRef.current);
                autoAdvanceTimeoutRef.current = null;
            }
            if (initialLoadTimeoutRef.current) {
                clearTimeout(initialLoadTimeoutRef.current);
                initialLoadTimeoutRef.current = null;
            }
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
                navigationTimeoutRef.current = null;
            }

            return;
        }

        const stepsChanged = JSON.stringify(stepsRef.current) !== JSON.stringify(steps);
        if (stepsChanged) {
            console.log('Steps configuration changed, updating...');
            stepsRef.current = steps;
            if (currentStepIndex >= steps.length) {
                dispatch({ type: 'SET_CURRENT_STEP_INDEX', payload: steps.length - 1 });
            }
            dispatch({ type: 'FILTER_LOADED_STEPS', payload: steps.length });
            if (currentStepIndex < steps.length &&
                currentStepRef.current !== steps[currentStepIndex].step_id) {
                debouncedSwitchStep(steps[currentStepIndex].step_id);
            }
            
            // If this is a new stage with steps but no steps loaded yet, trigger initial load
            if (steps.length > 0 && stepsLoaded.length === 0 && currentStepIndex === 0 && !initialLoadCalledRef.current) {
                console.log('Steps changed for new stage - triggering initial load');
                setTimeout(() => {
                    if (loadStepRef.current && !initialLoadCalledRef.current) {
                        console.log('Executing initial load due to steps change');
                        initialLoadCalledRef.current = true;
                        loadStepRef.current(0);
                    }
                }, 100);
            }
        }
    }, [stageId, steps?.length, debouncedSwitchStep, clearStep, streamCompleted, isCompleted]);

    const executeAction = useCallback(async (action) => {
        try {
            const result = await operationQueue.current.enqueue({
                execute: async () => {
                    console.log(`Executing operation: ${action.action}`);
                    try {
                        const output = await execAction(action);
                        if (output) {
                            console.log(`Operation result:`, output);
                            addEffect(output);
                        }
                        return output;
                    } catch (error) {
                        console.error('Operation execution failed:', error);
                        throw error;
                    }
                },
                delay: action.delay || 0
            });
            
            // Handle cancelled operations
            if (result && result.cancelled) {
                console.log('Operation was cancelled:', result.message);
                return null;
            }
            
            return result;
        } catch (error) {
            // Handle queue cleared or other queue-related errors silently
            if (error.message === 'Queue cleared') {
                console.log('Operation cancelled due to queue clear');
                return null;
            }
            throw error;
        }
    }, [execAction, addEffect]);

    // ---------- Stream Request Processing (current step already updated in loadStep) ----------
    const executeStepRequest = useCallback(async (stepIndex, stepId, controller, retryCount = 0) => {
        const MAX_RETRIES = 10; // 添加重试次数限制避免无限递归
        
        // Check if request was aborted before starting
        if (controller.signal.aborted) {
            console.log('Request aborted before execution');
            return;
        }
        
        dispatch({ type: 'SET_LOADING', payload: true });
        await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, constants.DELAY.API_REQUEST_DELAY);
            // Handle abortion during delay
            controller.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                resolve();
            });
        });

        // Check again after delay
        if (controller.signal.aborted) {
            console.log('Request aborted during delay');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        const currentIsReturnVisit = isStageComplete || isReturnVisit;
        if (currentIsReturnVisit) {
            dispatch({ 
                type: 'SET_MULTIPLE', 
                payload: {
                    uiLoaded: true,
                    streamCompleted: true,
                    isLoading: false
                }
            });
            return;
        }

        let response;
        try {
            response = await fetch(constants.API.SEQUENCE_API_URL, {
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
                // Attempt to parse error response
                let errorMessage = `Request failed (Status code: ${response.status})`;
                let errorData = null;

                try {
                    // Attempt to parse JSON error message from response body
                    errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (parseError) {
                    console.log('parseError', parseError);
                    // If the response is not in JSON format, attempt to retrieve the text
                    try {
                        const textError = await response.text();
                        if (textError) errorMessage += `: ${textError}`;
                    } catch (textError) {
                        console.error("Unable to parse error response text:", textError);
                    }
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            if (!response.body) throw new Error("Empty response body");
        } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
                console.log("Request aborted");
                return;
            }

            const errorObj = {
                message: fetchError.message || "Sequence request failed",
                status: fetchError.status,
                data: fetchError.data,
                type: "API Error",
                timestamp: new Date().toISOString(),
                endpoint: constants.API.SEQUENCE_API_URL,
                context: {
                    stage_id: stageId,
                    step_index: stepId
                }
            };

            console.error("API request error:", errorObj);
            dispatch({ type: 'SET_ERROR', payload: { error: `Step ${stepIndex + 1} request failed: ${errorObj.message}`, errorDetails: errorObj } });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let resultText = "";
        let firstDataReceived = false;

        // Handle abortion during stream reading
        const abortHandler = () => {
            reader.cancel();
        };
        controller.signal.addEventListener('abort', abortHandler);

        try {
            while (true) {
                // Check for abortion before each read
                if (controller.signal.aborted) {
                    console.log('Stream reading aborted');
                    break;
                }
                
                const { done, value } = await reader.read();
                if (done) break;
                resultText += decoder.decode(value, { stream: true });
                const lines = resultText.split("\n");
                for (let i = 0; i < lines.length - 1; i++) {
                    if (lines[i].trim()) {
                        try {
                            const message = JSON.parse(lines[i]);
                            console.log('=== STREAM MESSAGE RECEIVED ===');
                            console.log('Raw message:', JSON.stringify(message, null, 2));
                            
                            if (message.action) {
                                console.log('Action type:', message.action.action);
                                executeAction(message.action);
                                if (!firstDataReceived) {
                                    dispatch({ type: 'SET_UI_LOADED', payload: true });
                                    firstDataReceived = true;
                                }
                                if (message.action.state) {
                                    setContext(message.action.state);
                                }
                                // Handle workflow updates
                                if (message.action.updated_workflow) {
                                    const success = processWorkflowUpdate(message.action.updated_workflow);
                                    if (!success) {
                                        dispatch({ type: 'SET_ERROR', payload: { error: 'Invalid workflow update received from backend', errorDetails: null } });
                                        return;
                                    }
                                }
                                
                                // Handle current stage steps update
                                if (message.action.action === 'update_stage_steps') {
                                    processStageStepsUpdate(
                                        message.action.stage_id,
                                        message.action.updated_steps,
                                        message.action.next_step_id,
                                        (stepIndex, stepId) => {
                                            // Update both local state and pipeline store
                                            dispatch({ type: 'SET_CURRENT_STEP_INDEX', payload: stepIndex });
                                            setPipelineCurrentStepId(stepId);
                                            debouncedSwitchStep(stepId);
                                        }
                                    );
                                }
                            }
                            // Check for errors in message
                            if (message.error) {
                                throw new Error(message.error.message || "Error occurred during stream processing");
                            }
                        } catch (e) {
                            console.error("JSON parsing error:", e);
                            if (e.message !== "Unexpected end of JSON input") {
                                dispatch({ type: 'SET_ERROR', payload: { error: `Data parsing error: ${e.message}`, errorDetails: null } });
                            }
                        }
                    }
                }
                resultText = lines[lines.length - 1];
            }
        } catch (streamError) {
            if (streamError.name === 'AbortError' || controller.signal.aborted) {
                console.log('Stream processing aborted');
                return;
            }
            console.error("Stream processing error:", streamError);
            dispatch({ type: 'SET_ERROR', payload: { error: `Stream processing error: ${streamError.message}`, errorDetails: { message: streamError.message, type: "Stream processing error", timestamp: new Date().toISOString() } } });
            // Error details already set in dispatch above
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        } finally {
            // Cleanup abort handler
            controller.signal.removeEventListener('abort', abortHandler);
            // Ensure reader is properly closed
            try {
                await reader.cancel();
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        if (resultText.trim()) {
            try {
                const message = JSON.parse(resultText);
                if (message.action) {
                    executeAction(message.action);
                    if (!firstDataReceived) {
                        dispatch({ type: 'SET_UI_LOADED', payload: true });
                        firstDataReceived = true;
                    }
                    // Handle workflow updates in last line
                    if (message.action.updated_workflow) {
                        const success = processWorkflowUpdate(message.action.updated_workflow);
                        if (!success) {
                            dispatch({ type: 'SET_ERROR', payload: { error: 'Invalid workflow update received from backend', errorDetails: null } });
                            return;
                        }
                    }
                    
                    // Handle current stage steps update (final)
                    if (message.action.action === 'update_stage_steps') {
                        processStageStepsUpdate(
                            message.action.stage_id,
                            message.action.updated_steps,
                            message.action.next_step_id,
                            (stepIndex, stepId) => {
                                // Update both local state and pipeline store
                                dispatch({ type: 'SET_CURRENT_STEP_INDEX', payload: stepIndex });
                                setPipelineCurrentStepId(stepId);
                                debouncedSwitchStep(stepId);
                            }
                        );
                    }
                }
            } catch (e) {
                console.error("Last line JSON parsing error:", e);
            }
        }

        await new Promise(resolve => {
            if (!operationQueue.current.active) {
                resolve();
            } else {
                const originalOnQueueEmpty = operationQueue.current.onQueueEmpty;
                operationQueue.current.setOnQueueEmpty(() => {
                    resolve();
                    operationQueue.current.setOnQueueEmpty(originalOnQueueEmpty);
                });
            }
        });

        if (isStageComplete) {
            // CRITICAL FIX: Even when stage is complete, mark current step as completed for pipeline store
            console.log('Stage is complete, but ensuring current step is marked as completed:', stepId);
            markStepCompleted(stepId);
            
            // Notify WorkflowControl that step is completed (for already completed stages)
            window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                detail: { 
                    stepId, 
                    result: { targetAchieved: true, alreadyCompleted: true },
                    stageId,
                    timestamp: Date.now()
                }
            }));
            
            dispatch({ type: 'SET_STREAM_COMPLETED', payload: true });
            return;
        }

        try {
            const res = await fetch(constants.API.FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stage_id: stageId,
                    step_index: stepId,
                    state: getContext(),
                })
            });

            if (!res.ok) {
                let errorMessage = `Feedback request failed (Status code: ${res.status})`;
                let errorData = null;

                try {
                    errorData = await res.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (parseError) {
                    console.log('parseError', parseError);
                    try {
                        const textError = await res.text();
                        if (textError) errorMessage += `: ${textError}`;
                    } catch (textError) {
                        console.error("Unable to parse feedback error response text:", textError);
                    }
                }

                throw new Error(errorMessage);
            }

            const feedbackResult = await res.json();
            console.log('feedbackResult', feedbackResult);

            if (!feedbackResult.targetAchieved) {
                if (retryCount < MAX_RETRIES && !controller.signal.aborted) {
                    console.log(`Target not achieved, retrying step (${retryCount + 1}/${MAX_RETRIES})`);
                    // Create new controller for retry to avoid abort signal inheritance
                    const newController = new AbortController();
                    // Link to parent controller
                    controller.signal.addEventListener('abort', () => {
                        newController.abort();
                    });
                    await executeStepRequest(stepIndex, stepId, newController, retryCount + 1);
                    return;
                } else {
                    const reason = controller.signal.aborted ? 'Request aborted' : 'Max retries reached';
                    console.log(`${reason}, marking step as failed`);
                    if (!controller.signal.aborted) {
                        dispatch({ type: 'SET_ERROR', payload: { error: `Step failed after ${MAX_RETRIES} attempts: Target not achieved`, errorDetails: null } });
                    }
                    dispatch({ type: 'SET_LOADING', payload: false });
                    return;
                }
            }

            console.log('Target achieved! Proceeding to next step');
            
            // CRITICAL FIX: Mark step as completed in pipeline store
            console.log('Marking step as completed in pipeline store:', stepId);
            markStepCompleted(stepId);
            
            // Notify WorkflowControl that step is completed
            window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
                detail: { 
                    stepId, 
                    result: feedbackResult,
                    stageId,
                    timestamp: Date.now()
                }
            }));
            
            dispatch({ type: 'SET_STREAM_COMPLETED', payload: true });
        } catch (error) {
            console.error("Feedback API error:", error);
            dispatch({ type: 'SET_ERROR', payload: { 
                error: `Feedback request error: ${error.message}`, 
                errorDetails: {
                    message: error.message,
                    type: "Feedback API error", 
                    timestamp: new Date().toISOString(),
                    endpoint: constants.API.FEEDBACK_API_URL
                }
            }});
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [executeAction, stageId, isReturnVisit, isStageComplete, getContext, setContext]);

    // Update refs when functions change
    useEffect(() => {
        markStageAsCompleteRef.current = markStageAsComplete;
    }, [markStageAsComplete]);

    // ---------- loadStep: Pre-update the current step and mark it as loaded to ensure the new stepId takes effect promptly ----------
    const loadStep = useCallback(async (stepIndex) => {
        console.log(`loadStep called with stepIndex: ${stepIndex}`);
        const currentSteps = stepsRef.current;
        console.log(`currentSteps.length: ${currentSteps.length}`);
        if (stepIndex >= currentSteps.length) {
            console.log('stepIndex >= currentSteps.length, returning early');
            return;
        }
        
        // Prevent concurrent step loading
        if (currentLoadStepControllerRef.current) {
            console.log('Aborting previous step loading');
            currentLoadStepControllerRef.current.abort();
            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        operationQueue.current.clear();
        // Immediately update the current step and mark it as loaded
        dispatch({ type: 'SET_CURRENT_STEP_INDEX', payload: stepIndex });
        dispatch({ type: 'ADD_LOADED_STEP', payload: stepIndex });
        dispatch({ 
            type: 'SET_MULTIPLE', 
            payload: {
                isLoading: true,
                streamCompleted: false,
                uiLoaded: false,
                error: null,
                errorDetails: null
            }
        });
        const stepId = currentSteps[stepIndex].step_id;
        
        // CRITICAL FIX: Update pipeline store with current step
        console.log('LoadStep: Updating pipeline store currentStepId to:', stepId);
        setPipelineCurrentStepId(stepId);
        
        debouncedSwitchStep(stepId);
        markStepIncomplete && markStepIncomplete(stepId);

        const controller = new AbortController();
        currentLoadStepControllerRef.current = controller;
        
        // Add cleanup on component unmount
        const cleanup = () => {
            if (currentLoadStepControllerRef.current === controller) {
                controller.abort();
                currentLoadStepControllerRef.current = null;
            }
        };
        
        try {
            await executeStepRequest(stepIndex, stepId, controller);
        } catch (err) {
            if (err.name === 'AbortError' || controller.signal.aborted) {
                console.log("Step loading aborted");
            } else {
                console.error(`Step ${stepIndex + 1} loading failed:`, err);
                const stepTitle = currentSteps[stepIndex].name || `Step ${stepIndex + 1}`;
                if (!controller.signal.aborted) {
                    dispatch({ 
                        type: 'SET_ERROR', 
                        payload: {
                            error: `${stepTitle} loading failed: ${err.message}`,
                            errorDetails: {
                                message: err.message,
                                stack: err.stack,
                                type: "Step loading error",
                                timestamp: new Date().toISOString(),
                                context: {
                                    step_index: stepIndex,
                                    step_id: stepId
                                }
                            }
                        }
                    });
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        } finally {
            cleanup();
        }
    }, [debouncedSwitchStep, executeStepRequest, markStepIncomplete]);
    
    // Update loadStep ref and setup cleanup on unmount
    useEffect(() => {
        loadStepRef.current = loadStep;
        
        // Cleanup function for component unmount
        return () => {
            console.log('DynamicStageTemplate unmounting, cleaning up...');
            // Abort any ongoing requests
            if (currentLoadStepControllerRef.current) {
                currentLoadStepControllerRef.current.abort();
                currentLoadStepControllerRef.current = null;
            }
            // Clear operation queue
            operationQueue.current.clear();
            // Clear all timeouts
            if (autoAdvanceTimeoutRef.current) {
                clearTimeout(autoAdvanceTimeoutRef.current);
                autoAdvanceTimeoutRef.current = null;
            }
            if (initialLoadTimeoutRef.current) {
                clearTimeout(initialLoadTimeoutRef.current);
                initialLoadTimeoutRef.current = null;
            }
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
                navigationTimeoutRef.current = null;
            }
            // Reset initial load flag so it can be triggered again on remount
            initialLoadCalledRef.current = false;
        };
    }, [loadStep]);

    useEffect(() => {
        const currentSteps = stepsRef.current;
        console.log('Auto-advance effect triggered:', {
            streamCompleted,
            autoAdvance,
            currentStepIndex,
            totalSteps: currentSteps.length,
            stageId
        });
        
        if (streamCompleted) {
            dispatch({ type: 'SET_LOADING', payload: false });
            if (currentStepIndex === currentSteps.length - 1 && autoAdvance) {
                console.log('Last step completed, marking stage as complete');
                dispatch({ type: 'SET_COMPLETED', payload: true });
                
                // CRITICAL FIX: Mark stage as completed in pipeline store  
                console.log('Marking stage as completed in pipeline store:', stageId);
                markPipelineStageCompleted(stageId);
                markStageAsCompleteRef.current(stageId);
            } else if (autoAdvance && currentStepIndex < currentSteps.length - 1) {
                console.log(`Auto-advancing from step ${currentStepIndex} to step ${currentStepIndex + 1}`);
                // Clear any existing timeout
                if (autoAdvanceTimeoutRef.current) {
                    clearTimeout(autoAdvanceTimeoutRef.current);
                }
                autoAdvanceTimeoutRef.current = setTimeout(() => {
                    autoAdvanceTimeoutRef.current = null;
                    console.log('Executing auto-advance to next step:', currentStepIndex + 1);
                    if (loadStepRef.current) {
                        loadStepRef.current(currentStepIndex + 1);
                    } else {
                        console.error('loadStepRef.current is null, cannot auto-advance');
                    }
                }, 500);
                return () => {
                    if (autoAdvanceTimeoutRef.current) {
                        clearTimeout(autoAdvanceTimeoutRef.current);
                        autoAdvanceTimeoutRef.current = null;
                    }
                };
            } else {
                console.log('Auto-advance conditions not met:', {
                    autoAdvance,
                    isLastStep: currentStepIndex === currentSteps.length - 1,
                    hasMoreSteps: currentStepIndex < currentSteps.length - 1
                });
            }
        }
    }, [streamCompleted, autoAdvance, currentStepIndex, stageId, markPipelineStageCompleted]);

    useEffect(() => {
        if (isStageComplete && !historyLoaded) {
            const currentSteps = stepsRef.current;
            const lastStep = currentSteps[currentSteps.length - 1];
            debouncedSwitchStep(lastStep.step_id);
            dispatch({ 
                type: 'SET_MULTIPLE', 
                payload: {
                    currentStepIndex: currentSteps.length - 1,
                    stepsLoaded: currentSteps.map((_, i) => i),
                    isCompleted: true,
                    autoAdvance: false,
                    historyLoaded: true
                }
            });
        }
    }, [historyLoaded, debouncedSwitchStep, isStageComplete]);

    useEffect(() => {
        console.log('Initial load effect triggered:', {
            isStageComplete,
            stepsLoadedLength: stepsLoaded.length,
            currentStepIndex,
            initialLoadCalled: initialLoadCalledRef.current,
            stageId,
            currentStepsLength: stepsRef.current.length,
            hasSteps: stepsRef.current.length > 0
        });
        
        if (!isStageComplete &&
            stepsLoaded.length === 0 &&
            currentStepIndex === 0 &&
            !initialLoadCalledRef.current &&
            stepsRef.current.length > 0) {  // 确保有steps才执行
            console.log('Triggering initial load for step 0 - stage:', stageId);
            initialLoadCalledRef.current = true;
            
            // Clear any existing timeout
            if (initialLoadTimeoutRef.current) {
                clearTimeout(initialLoadTimeoutRef.current);
            }
            
            initialLoadTimeoutRef.current = setTimeout(async () => {
                initialLoadTimeoutRef.current = null;
                console.log('Executing initial loadStep(0) via ref');
                try {
                    // Use ref to avoid dependency cycle
                    if (loadStepRef.current) {
                        console.log('About to call loadStepRef.current(0)');
                        await loadStepRef.current(0);
                        console.log('loadStepRef.current(0) completed');
                    } else {
                        console.log('loadStepRef.current is null, cannot load step');
                    }
                } catch (error) {
                    console.error('Initial loadStep(0) failed:', error);
                }
            }, 100); // Increased delay to ensure loadStep ref is set
            
            return () => {
                if (initialLoadTimeoutRef.current) {
                    clearTimeout(initialLoadTimeoutRef.current);
                    initialLoadTimeoutRef.current = null;
                }
            };
        }
    }, [stepsLoaded.length, currentStepIndex, isStageComplete, stageId, steps.length]);

    // Backup initialization effect - ensures loading happens even if other effects miss it
    useEffect(() => {
        // Check if we have a valid stage with steps but nothing is loading or loaded
        if (stageId && steps.length > 0 && stepsLoaded.length === 0 && !isLoading && !initialLoadCalledRef.current) {
            console.log('Backup initialization triggered for stage:', stageId);
            const timeoutId = setTimeout(() => {
                if (loadStepRef.current && !initialLoadCalledRef.current) {
                    console.log('Executing backup initial load');
                    initialLoadCalledRef.current = true;
                    loadStepRef.current(0);
                }
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [stageId, steps.length, stepsLoaded.length, isLoading]);

    // Define stable handlers using useCallback with minimal dependencies
    const handleTerminate = useCallback(() => {
        console.log('DSLC Terminate handler called');
        operationQueue.current.clear();
        dispatch({ 
            type: 'SET_MULTIPLE', 
            payload: {
                isCompleted: true,
                autoAdvance: false
            }
        });
        setWorkflowGenerating(false);
    }, [setWorkflowGenerating]);

    const handleContinue = useCallback(async () => {
        console.log('DSLC Continue handler called');
        // Mark stage as complete in both stores
        console.log('Marking stage as completed in both stores:', stageId);
        markPipelineStageCompleted(stageId);
        markStageAsComplete(stageId);
        
        // Call onComplete if provided for navigation
        if (onComplete && typeof onComplete === 'function') {
            console.log('Calling onComplete for stage navigation...');
            try {
                // If onComplete is async, await it
                await onComplete();
                console.log('onComplete finished successfully');
                
                // Reset the workflow state after successful navigation
                setTimeout(() => {
                    setWorkflowCompleted(false);
                    setWorkflowGenerating(false);
                    setContinueCountdown(0);
                }, 100);
            } catch (error) {
                console.error('Error calling onComplete:', error);
                // Still reset state even if navigation fails
                setWorkflowCompleted(false);
                setWorkflowGenerating(false);
                setContinueCountdown(0);
            }
        } else {
            console.log('No onComplete handler - stage marked complete but no navigation');
            // Reset state anyway
            setWorkflowCompleted(false);
            setWorkflowGenerating(false);
            setContinueCountdown(0);
        }
    }, [stageId, onComplete, markStageAsComplete, setWorkflowCompleted, setWorkflowGenerating, setContinueCountdown]);

    const handleCancelCountdown = useCallback(() => {
        console.log('DSLC Cancel countdown handler called');
        setAutoAdvance(false);
    }, []);

    // Use refs to store the latest handler functions
    const handleTerminateRef = useRef(handleTerminate);
    const handleContinueRef = useRef(handleContinue);
    const handleCancelCountdownRef = useRef(handleCancelCountdown);
    
    // Update refs when handlers change
    useEffect(() => {
        handleTerminateRef.current = handleTerminate;
        handleContinueRef.current = handleContinue;
        handleCancelCountdownRef.current = handleCancelCountdown;
    }, [handleTerminate, handleContinue, handleCancelCountdown]);

    // WorkflowControl integration - set stable handler references
    useEffect(() => {
        console.log('DynamicStageTemplate: Setting up WorkflowControl integration for stage:', stageId);
        
        // Set continue button text for DSLC stages
        setContinueButtonText('Continue to Next Stage');
        
        // Set stable handler wrappers
        console.log('Setting onTerminate, handleTerminateRef.current exists:', !!handleTerminateRef.current);
        console.log('Setting onContinue, handleContinueRef.current exists:', !!handleContinueRef.current);
        console.log('Setting onCancelCountdown, handleCancelCountdownRef.current exists:', !!handleCancelCountdownRef.current);
        
        setOnTerminate(() => {
            console.log('onTerminate wrapper called, invoking handleTerminateRef.current');
            if (handleTerminateRef.current) {
                handleTerminateRef.current();
            } else {
                console.log('handleTerminateRef.current is null');
            }
        });
        setOnContinue(() => {
            console.log('onContinue wrapper called, invoking handleContinueRef.current');
            if (handleContinueRef.current) {
                handleContinueRef.current();
            } else {
                console.log('handleContinueRef.current is null');
            }
        });
        setOnCancelCountdown(() => {
            console.log('onCancelCountdown wrapper called, invoking handleCancelCountdownRef.current');
            if (handleCancelCountdownRef.current) {
                handleCancelCountdownRef.current();
            } else {
                console.log('handleCancelCountdownRef.current is null');
            }
        });
        
        return () => {
            // Cleanup handlers when stage changes or component unmounts
            console.log('DynamicStageTemplate: Cleaning up WorkflowControl integration for stage:', stageId);
            setOnTerminate(null);
            setOnContinue(null);
            setOnCancelCountdown(null);
            setContinueButtonText('Continue'); // Reset to default
        };
    }, [stageId]); // Only depend on stageId to reduce re-runs

    // Ensure handlers are set after component is fully initialized
    useEffect(() => {
        if (isCompleted && stageId) {
            console.log('Stage completed, ensuring WorkflowControl handlers are properly set');
            const timeoutId = setTimeout(() => {
                console.log('Re-setting WorkflowControl handlers after stage completion');
                setOnContinue(() => {
                    console.log('Post-completion onContinue wrapper called');
                    if (handleContinueRef.current) {
                        handleContinueRef.current();
                    } else {
                        console.log('handleContinueRef.current is null in post-completion handler');
                    }
                });
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [isCompleted, stageId, setOnContinue]);

    // Update WorkflowControl state based on stage progress  
    useEffect(() => {
        setWorkflowGenerating(isLoading && !uiLoaded);
    }, [isLoading, uiLoaded]);

    useEffect(() => {
        setWorkflowCompleted(isCompleted);
    }, [isCompleted]);
    
    // Listen for WorkflowControl step trigger events
    useEffect(() => {
        const handleWorkflowStepTrigger = (event) => {
            const { stepId, action, timestamp } = event.detail;
            console.log(`[DynamicStageTemplate] Received workflowStepTrigger:`, { stepId, action, timestamp, currentStageId: stageId });
            
            // Check if this trigger is for a step in our current stage
            const currentSteps = stepsRef.current;
            const targetStepIndex = currentSteps.findIndex(step => 
                (step.step_id === stepId || step.id === stepId)
            );
            
            if (targetStepIndex >= 0) {
                console.log(`[DynamicStageTemplate] Triggering action ${action} for step ${stepId} at index ${targetStepIndex}`);
                
                switch (action) {
                    case 'auto_execute':
                    case 'auto_start':
                    case 'resume_execute':
                    case 'auto_advance':
                    case 'stage_ready_execute':
                        // Execute the step
                        if (loadStepRef.current) {
                            console.log(`[DynamicStageTemplate] Executing step ${targetStepIndex} via ${action}`);
                            loadStepRef.current(targetStepIndex);
                        } else {
                            console.error('[DynamicStageTemplate] loadStepRef.current is null, cannot execute step');
                        }
                        break;
                        
                    case 'retry':
                        // Retry current step - clear error state and re-execute
                        dispatch({ type: 'CLEAR_ERROR' });
                        if (loadStepRef.current) {
                            setTimeout(() => {
                                loadStepRef.current(targetStepIndex);
                            }, 100);
                        }
                        break;
                        
                    case 'restart':
                        // Restart step - clear all state and re-execute
                        dispatch({ 
                            type: 'SET_MULTIPLE', 
                            payload: {
                                error: null,
                                errorDetails: null,
                                streamCompleted: false,
                                uiLoaded: false
                            }
                        });
                        if (loadStepRef.current) {
                            setTimeout(() => {
                                loadStepRef.current(targetStepIndex);
                            }, 100);
                        }
                        break;
                        
                    case 'resume':
                        // Resume from pause - continue execution
                        if (loadStepRef.current && targetStepIndex === currentStepIndex) {
                            loadStepRef.current(targetStepIndex);
                        }
                        break;
                        
                    default:
                        console.log(`[DynamicStageTemplate] Unknown action: ${action}`);
                }
            } else {
                console.log(`[DynamicStageTemplate] Step ${stepId} not found in current stage ${stageId}`);
            }
        };
        
        window.addEventListener('workflowStepTrigger', handleWorkflowStepTrigger);
        
        return () => {
            window.removeEventListener('workflowStepTrigger', handleWorkflowStepTrigger);
        };
    }, [stageId, currentStepIndex]);
    
    // Notify WorkflowControl when DynamicStageTemplate is ready
    useEffect(() => {
        if (stageId && stepsRef.current.length > 0) {
            console.log(`[DynamicStageTemplate] Stage ${stageId} is ready with ${stepsRef.current.length} steps`);
            // Notify WorkflowControl that this stage is ready for execution
            window.dispatchEvent(new CustomEvent('dynamicStageReady', {
                detail: { 
                    stageId,
                    stepCount: stepsRef.current.length,
                    steps: stepsRef.current.map(step => ({
                        id: step.id,
                        step_id: step.step_id,
                        name: step.name
                    })),
                    timestamp: Date.now()
                }
            }));
        }
    }, [stageId, steps.length]); // Depend on steps.length to notify when steps are available
    
    useEffect(() => {
        // Set countdown if stage is completed and auto advance is enabled
        if (isCompleted && autoAdvance && !isReturnVisit) {
            setContinueCountdown(constants.UI.DEFAULT_COUNTDOWN);
        } else {
            setContinueCountdown(0);
        }
    }, [isCompleted, autoAdvance, isReturnVisit]);

    // Stage completion handling - core logic only (simplified) 
    useEffect(() => {
        if (isCompleted && autoAdvance && !isReturnVisit) {
            // Mark stage as complete for both internal state and pipeline store
            console.log('Auto-advance stage completion - marking in both stores:', stageId);
            markPipelineStageCompleted(stageId);
            markStageAsComplete(stageId);
        }
    }, [isCompleted, autoAdvance, isReturnVisit, stageId, markStageAsComplete, markPipelineStageCompleted]);

    const navigateToStep = useCallback((stepIndex) => {
        if (currentStepIndex === stepIndex) return;
        if (operationQueue.current.active) {
            console.log('Navigation blocked - operation queue active');
            return;
        }
        dispatch({ type: 'SET_AUTO_ADVANCE', payload: false });
        
        // Clear any existing navigation timeout
        if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
        }
        
        navigationTimeoutRef.current = setTimeout(() => {
            navigationTimeoutRef.current = null;
            if (loadStepRef.current) {
                loadStepRef.current(stepIndex);
            }
        }, 0);
    }, [currentStepIndex]);

    // Set up the navigation handler in the workflow panel store
    useEffect(() => {
        setNavigationHandler(navigateToStep);
    }, [navigateToStep, setNavigationHandler]);

    const EmptyState = useMemo(() => React.memo(() => <SkeletonLoader count={1} />), []);

    const currentSteps = stepsRef.current;

    // Error display component
    const ErrorDisplay = ({ error, errorDetails, onRetry, onDismiss }) => {
        const [showDetails, setShowDetails] = useState(false);

        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4 rounded-r shadow-sm">
                <div className="flex items-start">
                    <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <p className="font-medium text-red-800 text-lg">Error</p>
                            {onDismiss && (
                                <button
                                    onClick={onDismiss}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                    aria-label="Close"
                                >
                                    <XCircle size={20} />
                                </button>
                            )}
                        </div>
                        <p className="text-red-700 mt-1">{error}</p>

                        {errorDetails && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="text-sm text-red-700 hover:text-red-900 flex items-center transition-colors"
                                >
                                    {showDetails ? "Hide Details" : "Show Details"}
                                </button>

                                {showDetails && (
                                    <div className="mt-2 bg-red-100 p-3 rounded text-xs font-mono overflow-auto max-h-48">
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(errorDetails, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        )}

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
    };

    // If no stage config available, show loading
    if (!currentStageConfig) {
        console.log('DynamicStageTemplate: No stage config available, showing skeleton');
        console.log('Debug info:', {
            stageId: stageId,
            steps: steps?.length || 0,
            currentStageConfig: !!currentStageConfig
        });
        return <SkeletonLoader count={3} />;
    }

    console.log('DynamicStageTemplate: Stage config available:', {
        stageId,
        stepsLength: steps.length,
        stageTitle
    });


    // Debug logging
    console.log('DynamicStageTemplate render state:', {
        isLoading,
        uiLoaded,
        currentStepIndex,
        stepsLoaded,
        currentStepsLength: currentSteps.length,
        stageId,
        initialLoadCalled: initialLoadCalledRef.current,
        autoAdvance
    });

    return (
        <div className="w-full h-full overflow-y-auto">

            <div className="flex w-full">
                <div className="max-w-screen-xl w-full mx-auto">
                    <div className="flex-1 h-full w-full">
                        <div className="p-2 h-full w-full">
                            {(isLoading && !uiLoaded) ? (
                                <div className="p-1">
                                    <div className="text-xs text-gray-500 mb-2">Loading step {currentStepIndex + 1}...</div>
                                    <SkeletonLoader count={3} />
                                </div>
                            ) : (
                                <div className="overflow-y-auto">
                                    {stepsLoaded.includes(currentStepIndex) && currentStepIndex < currentSteps.length ? (
                                        <PersistentStepContainer
                                            showRemoveButton={false}
                                            autoScroll={true}
                                            className="content-start"
                                            emptyState={<EmptyState />}
                                            stepId={currentSteps[currentStepIndex].step_id}
                                        />
                                    ) : (
                                        <div className="p-4 text-center">
                                            <div className="text-xs text-gray-500 mb-2">
                                                Debug: stepIndex={currentStepIndex}, stepsLoaded={JSON.stringify(stepsLoaded)}, stepsLength={currentSteps.length}
                                            </div>
                                            <EmptyState />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {error && (
                        <ErrorDisplay
                            error={error}
                            errorDetails={errorDetails}
                            onRetry={() => {
                                dispatch({ type: 'CLEAR_ERROR' });
                                setTimeout(() => {
                                    loadStepRef.current && loadStepRef.current(currentStepIndex);
                                }, 0);
                            }}
                            onDismiss={() => {
                                dispatch({ type: 'CLEAR_ERROR' });
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DynamicStageTemplate;