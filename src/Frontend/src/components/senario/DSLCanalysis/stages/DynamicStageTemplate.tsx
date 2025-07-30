import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// ==================== Dynamic Stage Component ====================
const DynamicStageTemplate = ({ onComplete }) => {
    // Get stage configuration from pipeline store
    const { 
        getCurrentStageConfig,
        markStepCompleted,
        markStageCompleted: markPipelineStageCompleted
    } = usePipelineStore();
    
    const currentStageConfig = getCurrentStageConfig();
    
    const { id: stageId, steps, name: stageTitle } = currentStageConfig || { id: '', steps: [], name: '' };
    const config = {
        stageId,
        steps,
        stageTitle,
        initialVariables: {},
        initialChecklist: {}
    };

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepsLoaded, setStepsLoaded] = useState([]);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [streamCompleted, setStreamCompleted] = useState(false);
    const [uiLoaded, setUiLoaded] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(true);
    const [isReturnVisit, setIsReturnVisit] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

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
        markStageCompleted,
    } = useAIPlanningContextStore();

    // Use refs to store stable function references
    const loadStepRef = useRef(null);
    const markStageAsCompleteRef = useRef(markStageAsComplete);
    const markStageCompletedRef = useRef(markStageCompleted);

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
            
            // Check if this is a workflow update scenario
            const workflowPanelState = useWorkflowPanelStore.getState();
            const isWorkflowUpdate = streamCompleted || isCompleted || 
                                   workflowPanelState.showWorkflowConfirm || 
                                   workflowPanelState.workflowUpdated;
            
            setCurrentStepIndex(0);
            setStepsLoaded([]);
            setError(null);
            setErrorDetails(null);
            setIsLoading(false);
            setStreamCompleted(false);
            setUiLoaded(false);
            setIsCompleted(false);
            setAutoAdvance(true);
            setIsReturnVisit(false);
            setHistoryLoaded(false);
            initialLoadCalledRef.current = false;
            stageIdRef.current = stageId;
            stepsRef.current = steps;

            operationQueue.current.clear();
            
            // Only clear step if this is not a workflow update to preserve cell content
            if (currentStepRef.current && !isWorkflowUpdate) {
                console.log('Clearing step due to stage change (not workflow update)');
                clearStep(currentStepRef.current);
                currentStepRef.current = null;
            } else if (currentStepRef.current) {
                console.log('Preserving step content during workflow update');
                currentStepRef.current = null;
            }

            return;
        }

        const stepsChanged = JSON.stringify(stepsRef.current) !== JSON.stringify(steps);
        if (stepsChanged) {
            console.log('Steps configuration changed, updating...');
            stepsRef.current = steps;
            if (currentStepIndex >= steps.length) {
                setCurrentStepIndex(steps.length - 1);
            }
            setStepsLoaded(prevLoaded => prevLoaded.filter(index => index < steps.length));
            if (currentStepIndex < steps.length &&
                currentStepRef.current !== steps[currentStepIndex].step_id) {
                debouncedSwitchStep(steps[currentStepIndex].step_id);
            }
        }
    }, [stageId, steps, debouncedSwitchStep, clearStep]);

    const executeAction = useCallback(async (action) => {
        try {
            return await operationQueue.current.enqueue({
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
        
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, constants.DELAY.API_REQUEST_DELAY));

        const currentIsReturnVisit = isStageComplete || isReturnVisit;
        if (currentIsReturnVisit) {
            setUiLoaded(true);
            setStreamCompleted(true);
            setIsLoading(false);
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
            setError(`Step ${stepIndex + 1} request failed: ${errorObj.message}`);
            setErrorDetails(errorObj);
            setIsLoading(false);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let resultText = "";
        let firstDataReceived = false;

        try {
            while (true) {
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
                                    setUiLoaded(true);
                                    firstDataReceived = true;
                                }
                                if (message.action.state) {
                                    setContext(message.action.state);
                                }
                                // Handle workflow updates
                                if (message.action.updated_workflow) {
                                    const success = processWorkflowUpdate(message.action.updated_workflow);
                                    if (!success) {
                                        setError('Invalid workflow update received from backend');
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
                                            setCurrentStepIndex(stepIndex);
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
                                setError(`Data parsing error: ${e.message}`);
                            }
                        }
                    }
                }
                resultText = lines[lines.length - 1];
            }
        } catch (streamError) {
            console.error("Stream processing error:", streamError);
            setError(`Stream processing error: ${streamError.message}`);
            setErrorDetails({
                message: streamError.message,
                type: "Stream processing error",
                timestamp: new Date().toISOString()
            });
            setIsLoading(false);
            return;
        }

        if (resultText.trim()) {
            try {
                const message = JSON.parse(resultText);
                if (message.action) {
                    executeAction(message.action);
                    if (!firstDataReceived) {
                        setUiLoaded(true);
                        firstDataReceived = true;
                    }
                    // Handle workflow updates in last line
                    if (message.action.updated_workflow) {
                        const success = processWorkflowUpdate(message.action.updated_workflow);
                        if (!success) {
                            setError('Invalid workflow update received from backend');
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
                                setCurrentStepIndex(stepIndex);
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
            setStreamCompleted(true);
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
                if (retryCount < MAX_RETRIES) {
                    console.log(`Target not achieved, retrying step (${retryCount + 1}/${MAX_RETRIES})`);
                    await executeStepRequest(stepIndex, stepId, controller, retryCount + 1);
                    return;
                } else {
                    console.log('Max retries reached, marking step as failed');
                    setError(`Step failed after ${MAX_RETRIES} attempts: Target not achieved`);
                    setIsLoading(false);
                    return;
                }
            }

            console.log('Target achieved! Proceeding to next step');
            setStreamCompleted(true);
        } catch (error) {
            console.error("Feedback API error:", error);
            setError(`Feedback request error: ${error.message}`);
            setErrorDetails({
                message: error.message,
                type: "Feedback API error",
                timestamp: new Date().toISOString(),
                endpoint: constants.API.FEEDBACK_API_URL
            });
        } finally {
            setIsLoading(false);
        }
    }, [executeAction, stageId, isReturnVisit, isStageComplete, getContext, setContext]);

    // Update refs when functions change
    useEffect(() => {
        markStageAsCompleteRef.current = markStageAsComplete;
        markStageCompletedRef.current = markStageCompleted;
    }, [markStageAsComplete, markStageCompleted]);

    // ---------- loadStep: Pre-update the current step and mark it as loaded to ensure the new stepId takes effect promptly ----------
    const loadStep = useCallback(async (stepIndex) => {
        const currentSteps = stepsRef.current;
        if (stepIndex >= currentSteps.length) return;
        operationQueue.current.clear();
        if (currentLoadStepControllerRef.current) {
            currentLoadStepControllerRef.current.abort();
        }
        // Immediately update the current step and mark it as loaded
        setCurrentStepIndex(stepIndex);
        setStepsLoaded(prev => prev.includes(stepIndex) ? prev : [...prev, stepIndex]);

        setIsLoading(true);
        setStreamCompleted(false);
        setUiLoaded(false);
        setError(null);
        setErrorDetails(null);
        const stepId = currentSteps[stepIndex].step_id;
        debouncedSwitchStep(stepId);
        markStepIncomplete && markStepIncomplete(stepId);

        const controller = new AbortController();
        currentLoadStepControllerRef.current = controller;
        try {
            await executeStepRequest(stepIndex, stepId, controller);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Step loading aborted");
            } else {
                console.error(`Step ${stepIndex + 1} loading failed:`, err);
                const stepTitle = currentSteps[stepIndex].name || `Step ${stepIndex + 1}`;
                setError(`${stepTitle} loading failed: ${err.message}`);
                setErrorDetails({
                    message: err.message,
                    stack: err.stack,
                    type: "Step loading error",
                    timestamp: new Date().toISOString(),
                    context: {
                        step_index: stepIndex,
                        step_id: stepId
                    }
                });
                setIsLoading(false);
            }
        } finally {
            if (currentLoadStepControllerRef.current === controller) {
                currentLoadStepControllerRef.current = null;
            }
        }
    }, [debouncedSwitchStep, executeStepRequest, markStepIncomplete]);
    
    // Update loadStep ref
    useEffect(() => {
        loadStepRef.current = loadStep;
    }, [loadStep]);

    useEffect(() => {
        const currentSteps = stepsRef.current;
        if (streamCompleted) {
            setIsLoading(false);
            if (currentStepIndex === currentSteps.length - 1 && autoAdvance) {
                setIsCompleted(true);
                markStageAsCompleteRef.current(stageId);
                markStageCompletedRef.current(stageId);
            } else if (autoAdvance) {
                const timeoutId = setTimeout(() => {
                    loadStepRef.current(currentStepIndex + 1);
                }, 500);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [streamCompleted, autoAdvance, currentStepIndex, stageId]);

    useEffect(() => {
        if (isStageComplete && !historyLoaded) {
            const currentSteps = stepsRef.current;
            const lastStep = currentSteps[currentSteps.length - 1];
            debouncedSwitchStep(lastStep.step_id);
            setCurrentStepIndex(currentSteps.length - 1);
            setStepsLoaded(currentSteps.map((_, i) => i));
            setIsCompleted(true);
            setAutoAdvance(false);
            setHistoryLoaded(true);
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
            console.log('Triggering initial load for step 0');
            initialLoadCalledRef.current = true;
            // 直接调用 loadStep，不依赖引用
            const timeoutId = setTimeout(async () => {
                console.log('Executing initial loadStep(0) directly');
                try {
                    await loadStep(0);
                } catch (error) {
                    console.error('Initial loadStep(0) failed:', error);
                }
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [stepsLoaded.length, currentStepIndex, isStageComplete, stageId, steps.length, loadStep]);

    // Define stable handlers using useCallback with minimal dependencies
    const handleTerminate = useCallback(() => {
        console.log('DSLC Terminate handler called');
        operationQueue.current.clear();
        setIsCompleted(true);
        setAutoAdvance(false);
        setWorkflowGenerating(false);
    }, [setWorkflowGenerating]);

    const handleContinue = useCallback(() => {
        console.log('DSLC Continue handler called');
        // Mark stage as complete
        markStageAsComplete(stageId);
        markStageCompleted(stageId);
        
        // Call onComplete if provided for navigation
        if (onComplete && typeof onComplete === 'function') {
            console.log('Calling onComplete for stage navigation...');
            try {
                onComplete();
                
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
    }, [stageId, onComplete, markStageAsComplete, markStageCompleted, setWorkflowCompleted, setWorkflowGenerating, setContinueCountdown]);

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
        console.log('DynamicStageTemplate: Setting up WorkflowControl integration');
        
        // Set continue button text for DSLC stages
        setContinueButtonText('Continue to Next Stage');
        
        // Set stable handler wrappers
        setOnTerminate(() => handleTerminateRef.current());
        setOnContinue(() => handleContinueRef.current());
        setOnCancelCountdown(() => handleCancelCountdownRef.current());
        
        return () => {
            // Cleanup handlers when component unmounts
            setOnTerminate(null);
            setOnContinue(null);
            setOnCancelCountdown(null);
        };
    }, [stageId]); // Only depend on stageId

    // Update WorkflowControl state based on stage progress  
    useEffect(() => {
        setWorkflowGenerating(isLoading && !uiLoaded);
    }, [isLoading, uiLoaded]);

    useEffect(() => {
        setWorkflowCompleted(isCompleted);
    }, [isCompleted]);
    
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
            // Mark stage as complete for internal state
            markStageAsComplete(stageId);
            markStageCompleted(stageId);
        }
    }, [isCompleted, autoAdvance, isReturnVisit, stageId, markStageAsComplete, markStageCompleted]);

    const navigateToStep = useCallback((stepIndex) => {
        if (currentStepIndex === stepIndex) return;
        if (operationQueue.current.active) return;
        setAutoAdvance(false);
        setTimeout(() => {
            loadStepRef.current && loadStepRef.current(stepIndex);
        }, 0);
    }, [currentStepIndex]);

    // Set up the navigation handler in the workflow panel store
    useEffect(() => {
        setNavigationHandler(navigateToStep);
    }, [navigateToStep, setNavigationHandler]);

    const EmptyState = () => <SkeletonLoader count={1} />;

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
        return <SkeletonLoader count={3} />;
    }


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
                                setError(null);
                                setErrorDetails(null);
                                setTimeout(() => {
                                    loadStepRef.current && loadStepRef.current(currentStepIndex);
                                }, 0);
                            }}
                            onDismiss={() => {
                                setError(null);
                                setErrorDetails(null);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DynamicStageTemplate;