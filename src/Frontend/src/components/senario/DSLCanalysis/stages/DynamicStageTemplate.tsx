import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import PersistentStepContainer from '../cells/GrowingCellContainer';
import { useScriptStore } from '../store/useScriptStore';
import { useAIPlanningContextStore } from '../store/aiPlanningContext';
import { usePipelineStore } from '../store/pipelineController';
import { useWorkflowControlStore } from '../../../Notebook/store/workflowControlStore';
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
        this.queue.forEach(op => op._reject(new Error('Queue cleared')));
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

// ==================== Countdown Hook ====================
const useCountdown = (initialCount, onFinish) => {
    const [count, setCount] = useState(initialCount);
    const timerRef = useRef(null);
    const onFinishRef = useRef(onFinish);

    // 更新引用，避免依赖项变化
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);

    // 仅在 count 从0变为正数时启动计时器
    useEffect(() => {
        if (count > 0) {
            timerRef.current = setInterval(() => {
                setCount(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        onFinishRef.current();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [count]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setCount(0);
        }
    }, []);

    return [count, cancel, setCount];
};

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
        markStageCompleted
    } = usePipelineStore();
    
    const currentStageConfig = getCurrentStageConfig();
    
    // If no stage config available, show loading
    if (!currentStageConfig) {
        return <SkeletonLoader count={3} />;
    }

    const { id: stageId, steps, name: stageTitle } = currentStageConfig;
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
    } = useAIPlanningContextStore();

    // WorkflowControl store
    const {
        setIsGenerating: setWorkflowGenerating,
        setIsCompleted: setWorkflowCompleted,
        setContinueCountdown: setWorkflowCountdown,
        setIsReturnVisit: setWorkflowReturnVisit,
        setContinueButtonText,
        setOnTerminate,
        setOnContinue,
        setOnCancelCountdown,
        reset: resetWorkflowControl
    } = useWorkflowControlStore();

    const { clearStep, switchStep, execAction, markStepIncomplete } = useScriptStore();

    // Get stage completion status for use as an effect dependency
    const isStageComplete = useAIPlanningContextStore(state => state.isStageComplete(stageId));
    const toDoList = useAIPlanningContextStore(state => state.toDoList);

    // Pre-fetch methods from store
    const getContext = useAIPlanningContextStore(state => state.getContext);
    const setContext = useAIPlanningContextStore(state => state.setContext);
    const addEffect = useAIPlanningContextStore(state => state.addEffect);

    // Retrieve variable state
    const variables = useAIPlanningContextStore(state => state.variables);

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
            if (currentStepRef.current) {
                clearStep(currentStepRef.current);
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
    }, [stageId, steps, debouncedSwitchStep, clearStep, currentStepIndex, addVariable, setChecklist]);

    const executeAction = useCallback(async (action) => {
        return operationQueue.current.enqueue({
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
    }, [execAction, addEffect]);

    // ---------- Stream Request Processing (current step already updated in loadStep) ----------
    const executeStepRequest = useCallback(async (stepIndex, stepId, controller) => {
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
                    step_index: stepIndex,
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
                    step_index: stepIndex
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
                            if (message.action) {
                                executeAction(message.action);
                                if (!firstDataReceived) {
                                    setUiLoaded(true);
                                    firstDataReceived = true;
                                }
                                if (message.action.state) {
                                    setContext(message.action.state);
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
                    step_index: stepIndex,
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
                console.log('Target not achieved, retrying step');
                await executeStepRequest(stepIndex, stepId, controller);
                return;
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

    useEffect(() => {
        const currentSteps = stepsRef.current;
        if (streamCompleted) {
            setIsLoading(false);
            if (currentStepIndex === currentSteps.length - 1 && autoAdvance) {
                setIsCompleted(true);
                markStageAsComplete(stageId);
                markStageCompleted(stageId);
            } else if (autoAdvance) {
                setTimeout(() => {
                    loadStep(currentStepIndex + 1);
                }, 500);
            }
        }
    }, [streamCompleted, autoAdvance, currentStepIndex, loadStep, markStageAsComplete, markStageCompleted, stageId]);

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
        if (!isStageComplete &&
            stepsLoaded.length === 0 &&
            currentStepIndex === 0 &&
            !initialLoadCalledRef.current &&
            toDoList.length === 0) {
            initialLoadCalledRef.current = true;
            // Use setTimeout to ensure this call is not executed within the rendering cycle
            setTimeout(() => {
                loadStep(0);
            }, 0);
        }
    }, [stepsLoaded.length, currentStepIndex, loadStep, toDoList, isStageComplete, stageId]);

    const handleContinue = useCallback(() => {
        console.log('handleContinue called:', { 
            stageId, 
            onComplete: !!onComplete,
            hasOnComplete: typeof onComplete === 'function',
            isStageComplete,
            isCompleted 
        });
        
        // Always mark stage as complete first
        markStageAsComplete(stageId);
        
        // If onComplete exists, call it
        if (onComplete && typeof onComplete === 'function') {
            console.log('Calling onComplete function...');
            try {
                onComplete();
                console.log('onComplete function called successfully');
            } catch (error) {
                console.error('Error calling onComplete:', error);
            }
        } else {
            console.log('No onComplete function provided or not in DCLS mode');
        }
    }, [markStageAsComplete, onComplete, stageId, isStageComplete, isCompleted]);

    const [continueCountdown, cancelCountdown, setContinueCountdown] = useCountdown(0, handleContinue);

    useEffect(() => {
        if (isCompleted && autoAdvance && !isReturnVisit) {
            setContinueCountdown(constants.UI.DEFAULT_COUNTDOWN);
        }
    }, [isCompleted, autoAdvance, isReturnVisit, setContinueCountdown]);

    const navigateToStep = (stepIndex) => {
        if (currentStepIndex === stepIndex) return;
        if (operationQueue.current.active) return;
        setAutoAdvance(false);
        setTimeout(() => {
            loadStep(stepIndex);
        }, 0);
    };

    const handleTerminate = useCallback(() => {
        console.log('handleTerminate called');
        operationQueue.current.clear();
        setIsCompleted(true);
        setAutoAdvance(false);
    }, []);

    const handleCancelCountdown = useCallback(() => {
        cancelCountdown();
        setAutoAdvance(false);
    }, [cancelCountdown]);

    // Use refs to store latest function references to avoid infinite loops
    const handleTerminateRef = useRef(handleTerminate);
    const handleContinueRef = useRef(handleContinue);
    const handleCancelCountdownRef = useRef(handleCancelCountdown);

    // Update refs when functions change
    useEffect(() => {
        handleTerminateRef.current = handleTerminate;
        handleContinueRef.current = handleContinue;
        handleCancelCountdownRef.current = handleCancelCountdown;
    });

    // Sync state with WorkflowControl store - combined to reduce useEffect calls
    useEffect(() => {
        setWorkflowGenerating(isLoading && !isCompleted);
        setWorkflowCompleted(isCompleted);
        setWorkflowCountdown(continueCountdown);
        setWorkflowReturnVisit(isReturnVisit);
        setContinueButtonText(onComplete ? 'Continue to Next Stage' : `End ${config.stageTitle || 'Current Stage'}`);
    }, [isLoading, isCompleted, continueCountdown, isReturnVisit, onComplete, config.stageTitle]);

    // Set event handlers using stable wrapper functions
    useEffect(() => {
        console.log('DynamicStageTemplate: Setting WorkflowControl handlers', {
            stageId,
            hasOnComplete: !!onComplete,
            hasHandleTerminate: !!handleTerminateRef.current,
            hasHandleContinue: !!handleContinueRef.current,
            hasHandleCancelCountdown: !!handleCancelCountdownRef.current
        });
        
        setOnTerminate(() => handleTerminateRef.current());
        setOnContinue(() => handleContinueRef.current());  
        setOnCancelCountdown(() => handleCancelCountdownRef.current());
        
        console.log('DynamicStageTemplate: WorkflowControl handlers set successfully');
    }, []); // Empty dependency array is safe now

    // Don't reset WorkflowControl store on unmount - let NotebookApp manage it
    // useEffect(() => {
    //     return () => {
    //         console.log('DynamicStageTemplate unmounting, resetting WorkflowControl store');
    //         resetWorkflowControl();
    //     };
    // }, []);

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

    return (
        <div className="w-full h-full overflow-y-auto">
            {(
                <div className="sticky top-4 z-50 bg-blue-50 bg-opacity-20 backdrop-blur-lg">
                    <div className="border-b border-gray-100 mb-4">
                        <div className="max-w-screen-xl mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                            <div className="flex">
                                {currentSteps.map((step, index) => (
                                    <button
                                        key={step.id}
                                        onClick={() => { if (isCompleted) { navigateToStep(index) } }}
                                        className={`
                                        flex items-center py-3 px-4 
                                        transition-colors whitespace-nowrap 
                                        focus:outline-none
                                        ${currentStepIndex === index
                                                ? 'text-theme-600 border-b-2 border-theme-500 bg-theme-50/50'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            } 
                                ${!isCompleted ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                        aria-selected={currentStepIndex === index}
                                        disabled={!isCompleted}
                                    >
                                        <div
                                            className={`
                                            w-6 h-6 
                                            flex items-center justify-center 
                                            rounded-full mr-2
                                            ${currentStepIndex === index
                                                    ? 'bg-theme-100 text-theme-600'
                                                    : 'bg-gray-200 text-gray-600'
                                                }
                                        `}
                                        >
                                            {stepsLoaded.includes(index) ? (
                                                <CheckCircle size={14} />
                                            ) : (
                                                <span className="text-xs font-semibold">{index + 1}</span>
                                            )}
                                        </div>
                                        <div className="text-sm font-medium">{step.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex w-full">
                <div className="max-w-screen-xl w-full mx-auto">
                    <div className="flex-1 h-full w-full">
                        <div className="p-2 h-full w-full">
                            {(isLoading && !uiLoaded) ? (
                                <div className="p-1">
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
                                        <EmptyState />
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
                                    loadStep(currentStepIndex);
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