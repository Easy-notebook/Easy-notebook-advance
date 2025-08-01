import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FaStopCircle, FaRedo, FaPlay, FaPause } from 'react-icons/fa';
import { usePipelineStore } from '../../senario/DSLCanalysis/store/pipelineController';
import { useAIPlanningContextStore } from '../../senario/DSLCanalysis/store/aiPlanningContext';
import { useWorkflowStateMachine, WORKFLOW_STATES, EVENTS } from '../../senario/DSLCanalysis/store/workflowStateMachine';
import usePreStageStore from '../../senario/DSLCanalysis/store/preStageStore';

const EXECUTION_DELAYS = {
  AUTO_START: 2000,
  RESUME: 1500,
  STAGE_TRANSITION: 3000,
  STEP_ADVANCE: 20,
  RETRY: 500,
  RESTART: 500,
  STAGE_READY: 500
} as const;

interface WorkflowControlProps {
  fallbackViewMode?: string;
}

interface WorkflowState {
  isExecuting: boolean;
  hasUncompletedSteps: boolean;
  isStageCompleted: boolean;
  uncompletedSteps?: any[];
  totalSteps: number;
  completedStepsCount: number;
}


interface AutoWorkflowControlsProps {
  isExecuting: boolean;
  isPaused: boolean;
  isAutoExecuting: boolean;
  currentStepInfo: { name: string; progress?: string } | null;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onRestart: () => void;
}

const AutoWorkflowControls: React.FC<AutoWorkflowControlsProps> = ({ 
  isExecuting,
  isPaused,
  isAutoExecuting,
  currentStepInfo,
  onPause,
  onResume,
  onRetry,
  onRestart
}) => {
  const [ellipsis, setEllipsis] = useState('...');

  useEffect(() => {
    if (!isExecuting || isPaused) return;
    
    const interval = setInterval(() => {
      setEllipsis(prev => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isExecuting, isPaused]);

  return (
    <div className="flex items-center gap-3">
      {/* Current Step Status */}
      {currentStepInfo && (
        <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isPaused ? 'bg-yellow-500' : 
              isExecuting ? 'bg-blue-500 animate-pulse' : 
              'bg-green-500'
            }`} />
            <span className="text-sm font-medium text-gray-700">
              {currentStepInfo.name}
              {isPaused ? ' (Paused)' : isExecuting ? ellipsis : ' ✓'}
              {currentStepInfo.progress && (
                <span className="ml-1 text-xs text-gray-500">({currentStepInfo.progress})</span>
              )}
              {isAutoExecuting && !isPaused && (
                <span className="ml-1 text-xs text-blue-600 font-semibold">[Auto]</span>
              )}
            </span>
          </div>
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Pause/Resume Button */}
        {isExecuting && !isPaused && (
          <button
            onClick={onPause}
            className="group flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg hover:bg-opacity-30"
          >
            <FaPause size={16} className="text-yellow-500" />
            <span className="text-yellow-500 text-sm font-medium">Pause</span>
          </button>
        )}
        
        {/* Resume Button */}
        {isPaused && (
          <button
            onClick={onResume}
            className="group flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg hover:bg-opacity-30"
          >
            <FaPlay size={16} className="text-green-500" />
            <span className="text-green-500 text-sm font-medium">Resume</span>
          </button>
        )}
        
        {/* Retry Current Step Button */}
        {!isExecuting || isPaused ? (
          <button
            onClick={onRetry}
            className="group flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg hover:bg-opacity-30"
          >
            <FaRedo size={16} className="text-orange-500" />
            <span className="text-orange-500 text-sm font-medium">Retry Step</span>
          </button>
        ) : null}
        
        {/* Restart Current Step Button */}
        {!isExecuting || isPaused ? (
          <button
            onClick={onRestart}
            className="group flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg hover:bg-opacity-30"
          >
            <FaStopCircle size={16} className="text-red-500" />
            <span className="text-red-500 text-sm font-medium">Restart Step</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

const WorkflowControl: React.FC<WorkflowControlProps> = ({
  fallbackViewMode = 'complete'
}) => {
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pipeline store integration
  const {
    workflowTemplate,
    currentStageId,
    currentStepId,
    isWorkflowActive,
    completedSteps,
    setStage,
    setCurrentStepId,
    markStepCompleted,
    markStageCompleted: markPipelineStageCompleted,
    initializeStateMachine,
  } = usePipelineStore();

  // AI Planning store integration
  const {
    toDoList,
    canAutoAdvanceToNextStage,
    isWorkflowUpdateConfirmed,
    markStageAsComplete,
    addChecklistCompletedItem,
    addThinkingLog,
  } = useAIPlanningContextStore();

  // State machine integration
  const {
    currentState,
    transition,
    startStep,
    completeStep,
    failStep,
    completeStage,
    reset,
    canAutoAdvanceToNextStage: stateMachineCanAdvanceStage,
    setStoreReferences
  } = useWorkflowStateMachine();

  const currentStageInfo = useMemo(() => {
    if (!workflowTemplate?.stages || !currentStageId) return null;
    return workflowTemplate.stages.find(stage => stage.id === currentStageId);
  }, [workflowTemplate, currentStageId]);

  const currentStepInfo = useMemo(() => {
    if (!currentStageInfo?.steps || !currentStepId) return null;
    return currentStageInfo.steps.find(step => 
      step.id === currentStepId || step.step_id === currentStepId
    );
  }, [currentStageInfo, currentStepId]);

  // Initialize state machine integration on mount
  useEffect(() => {
    setStoreReferences(
      { getState: () => useAIPlanningContextStore.getState() },
      { getState: () => usePipelineStore.getState() }
    );
    initializeStateMachine({ getState: () => useWorkflowStateMachine.getState() });
    
    // Reset all states when workflow becomes active
    if (isWorkflowActive) {
      const aiPlanningStore = useAIPlanningContextStore.getState();
      aiPlanningStore.resetAIPlanningContext();
      
      // Reset state machine if it's in completed state
      if (currentState === WORKFLOW_STATES.WORKFLOW_COMPLETED) {
        reset();
      }
    }
  }, [isWorkflowActive]); // React to workflow activation

  const workflowState: WorkflowState = useMemo(() => {
    if (!isWorkflowActive || !workflowTemplate?.stages || !currentStageInfo) {
      return {
        isExecuting: false,
        hasUncompletedSteps: false,
        isStageCompleted: false,
        totalSteps: 0,
        completedStepsCount: 0
      };
    }
    
    const uncompletedStepsInStage = currentStageInfo.steps.filter(step =>
      !completedSteps.includes(step.id) && !completedSteps.includes(step.step_id)
    );
    
    const isStageCompleted = uncompletedStepsInStage.length === 0;
    const hasUncompletedSteps = uncompletedStepsInStage.length > 0;
    const isExecuting = currentState === WORKFLOW_STATES.STEP_EXECUTING;
    const isPaused = currentState === WORKFLOW_STATES.STEP_FAILED || 
                    (currentState === WORKFLOW_STATES.STEP_EXECUTING && toDoList.length > 0);
    
    return {
      isExecuting,
      hasUncompletedSteps,
      isStageCompleted,
      uncompletedSteps: uncompletedStepsInStage,
      totalSteps: currentStageInfo.steps.length,
      completedStepsCount: currentStageInfo.steps.length - uncompletedStepsInStage.length
    };
  }, [isWorkflowActive, workflowTemplate, currentStageInfo, completedSteps, currentState, toDoList]);

  const recordStepState = useCallback((stepId: string, action: string = 'execute') => {
    // Log to AI planning context
    addThinkingLog({
      timestamp: Date.now(),
      action,
      stepId,
      stageId: currentStageId,
      stateMachineState: currentState
    });
  }, [currentStageId, currentState, addThinkingLog]);

  const handleAutoStageTransition = useCallback(() => {
    if (!workflowTemplate?.stages || !currentStageId || !workflowState.isStageCompleted) return;
    
    // Check if stage can transition using all three stores
    if (!stateMachineCanAdvanceStage || !canAutoAdvanceToNextStage(currentStageId) || !isWorkflowUpdateConfirmed()) {
      return;
    }
    
    const currentStageIndex = workflowTemplate.stages.findIndex(stage => stage.id === currentStageId);
    const nextStage = workflowTemplate.stages[currentStageIndex + 1];
    
    if (nextStage) {
      recordStepState(currentStageId, 'stage_completed');
      
      // Complete stage through state machine
      completeStage(currentStageId);
      
      // Mark stage completed in pipeline and AI planning stores
      markPipelineStageCompleted(currentStageId);
      markStageAsComplete(currentStageId);
      
      // Transition to next stage
      setStage(nextStage.id);
      
      if (nextStage.steps?.length > 0) {
        const firstStep = nextStage.steps[0];
        const firstStepId = firstStep.step_id || firstStep.id;
        setCurrentStepId(firstStepId);
        recordStepState(firstStepId, 'stage_transition');
        
        // Start first step of next stage through state machine
        setTimeout(() => {
          startStep(firstStepId, nextStage.id, 0);
        }, EXECUTION_DELAYS.STAGE_TRANSITION);
      }
    } else {
      recordStepState('workflow', 'completed');
      // Complete workflow through state machine only if not already completed
      if (currentState !== WORKFLOW_STATES.WORKFLOW_COMPLETED) {
        transition(EVENTS.COMPLETE_WORKFLOW);
      }
    }
  }, [workflowTemplate, currentStageId, workflowState.isStageCompleted, setCurrentStepId, recordStepState, 
      markPipelineStageCompleted, markStageAsComplete, setStage, completeStage, startStep, transition,
      stateMachineCanAdvanceStage, canAutoAdvanceToNextStage, isWorkflowUpdateConfirmed]);

  // Step control handlers using state machine
  const handlePause = useCallback(() => {
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
      executionTimeoutRef.current = null;
    }
    
    if (currentStepId) {
      recordStepState(currentStepId, 'paused');
      // Transition to failed state to pause execution
      failStep(currentStepId, { message: 'Paused by user' });
    }
  }, [currentStepId, recordStepState, failStep]);

  const handleResume = useCallback(() => {
    if (currentStepId) {
      recordStepState(currentStepId, 'resumed');
      
      // Resume step execution through state machine
      startStep(currentStepId, currentStageId, workflowState.completedStepsCount);
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
          detail: { 
            stepId: currentStepId, 
            action: 'resume',
            timestamp: Date.now()
          }
        }));
      }, 100);
    }
  }, [currentStepId, currentStageId, workflowState.completedStepsCount, recordStepState, startStep]);

  const handleRetryStep = useCallback(() => {
    if (!currentStepId) return;
    
    recordStepState(currentStepId, 'retry');
    
    // Retry step through state machine
    startStep(currentStepId, currentStageId, workflowState.completedStepsCount);
    
    executionTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
        detail: { 
          stepId: currentStepId, 
          action: 'retry',
          timestamp: Date.now()
        }
      }));
    }, EXECUTION_DELAYS.RETRY);
  }, [currentStepId, currentStageId, workflowState.completedStepsCount, recordStepState, startStep]);

  const handleRestartStep = useCallback(() => {
    if (!currentStepId) return;
    
    recordStepState(currentStepId, 'restart');
    
    // Reset step completion in all stores
    const updatedCompletedSteps = completedSteps.filter(stepId => stepId !== currentStepId);
    usePipelineStore.setState({ completedSteps: updatedCompletedSteps });
    
    // Reset state machine and restart step
    reset();
    
    executionTimeoutRef.current = setTimeout(() => {
      startStep(currentStepId, currentStageId, workflowState.completedStepsCount);
      
      window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
        detail: { 
          stepId: currentStepId, 
          action: 'restart',
          timestamp: Date.now(),
          clearPreviousResults: true
        }
      }));
    }, EXECUTION_DELAYS.RESTART);
  }, [currentStepId, currentStageId, workflowState.completedStepsCount, recordStepState, 
      completedSteps, reset, startStep]);


  const prerequisitesMet = useMemo(() => {
    const preStageState = usePreStageStore.getState();
    const problemConfirmed = !!(preStageState.problem_description && preStageState.currentFile);
    const workflowActive = isWorkflowActive && !!workflowTemplate;
    
    return {
      problemConfirmed,
      workflowActive,
      bothMet: problemConfirmed && workflowActive
    };
  }, [isWorkflowActive, workflowTemplate]);

  const triggerStepExecution = useCallback((stepId: string, action: string, delay: number = 0) => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
        detail: { 
          stepId, 
          action,
          timestamp: Date.now()
        }
      }));
    }, delay);
  }, []);

  // Auto-execution logic with loop prevention
  const hasTriggeredExecution = useRef(false);
  
  useEffect(() => {
    const isPaused = currentState === WORKFLOW_STATES.STEP_FAILED;
    
    if (!isWorkflowActive || !workflowState.hasUncompletedSteps || isPaused || !prerequisitesMet.bothMet) {
      hasTriggeredExecution.current = false;
      return;
    }
    
    // Prevent multiple triggers of the same execution
    if (hasTriggeredExecution.current) return;
    
    if (!currentStepId && workflowState.uncompletedSteps?.length > 0) {
      const firstUncompletedStep = workflowState.uncompletedSteps[0];
      const stepId = firstUncompletedStep.step_id || firstUncompletedStep.id;
      setCurrentStepId(stepId);
      recordStepState(stepId, 'auto_start');
      
      // Only start step if not already executing
      if (currentState === WORKFLOW_STATES.IDLE) {
        startStep(stepId, currentStageId, 0);
      }
      
      hasTriggeredExecution.current = true;
      triggerStepExecution(stepId, 'auto_execute', EXECUTION_DELAYS.AUTO_START);
    }
    else if (currentStepId && workflowState.hasUncompletedSteps && currentState === WORKFLOW_STATES.IDLE) {
      hasTriggeredExecution.current = true;
      startStep(currentStepId, currentStageId, workflowState.completedStepsCount);
      triggerStepExecution(currentStepId, 'resume_execute', EXECUTION_DELAYS.RESUME);
    }
  }, [isWorkflowActive, workflowState.hasUncompletedSteps, workflowState.uncompletedSteps, workflowState.completedStepsCount,
      currentStepId, currentStageId, setCurrentStepId, recordStepState, prerequisitesMet.bothMet, 
      triggerStepExecution, startStep, currentState]);

  useEffect(() => {
    const isPaused = currentState === WORKFLOW_STATES.STEP_FAILED;
    
    if (workflowState.isStageCompleted && !isPaused && isWorkflowActive && prerequisitesMet.bothMet) {
      setTimeout(handleAutoStageTransition, 2000);
    }
  }, [workflowState.isStageCompleted, handleAutoStageTransition, currentState, isWorkflowActive, prerequisitesMet.bothMet]);

  useEffect(() => {
    if (!isWorkflowActive || !workflowTemplate || !prerequisitesMet.bothMet) return;
    if (currentStageId && currentStepId) return;
    
    const firstStage = workflowTemplate.stages?.[0];
    if (!firstStage) return;
    
    if (!currentStageId || currentStageId !== firstStage.id) {
      setStage(firstStage.id);
    }
    
    if (firstStage.steps?.length > 0) {
      const firstStep = firstStage.steps[0];
      const firstStepId = firstStep.step_id || firstStep.id;
      
      if (!currentStepId || currentStepId !== firstStepId) {
        setCurrentStepId(firstStepId);
        recordStepState(firstStepId, 'workflow_start');
        
        // Initialize state machine with first step only if idle
        if (currentState === WORKFLOW_STATES.IDLE) {
          startStep(firstStepId, firstStage.id, 0);
          // Trigger immediate execution for the initial step
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
              detail: { 
                stepId: firstStepId, 
                action: 'auto_execute',
                timestamp: Date.now()
              }
            }));
          }, 500);
        }
      }
    }
  }, [isWorkflowActive, workflowTemplate, currentStageId, currentStepId, setStage, setCurrentStepId, 
      recordStepState, prerequisitesMet.bothMet, startStep, currentState]);

  useEffect(() => {
    const handleStepCompletion = (event: CustomEvent) => {
      const { stepId } = event.detail;
      
      if (stepId === currentStepId && currentState === WORKFLOW_STATES.STEP_EXECUTING) {
        // Complete step through all stores
        markStepCompleted(stepId);
        recordStepState(stepId, 'completed');
        
        // Complete step through state machine
        completeStep(stepId, { status: 'completed', timestamp: Date.now() });
        
        // Add to AI planning checklist
        addChecklistCompletedItem(`step_${stepId}_completed`);
      }
    };
    
    const handleStageReady = (event: CustomEvent) => {
      const { stageId } = event.detail;
      
      if (stageId === currentStageId && currentState !== WORKFLOW_STATES.STEP_FAILED && workflowState.hasUncompletedSteps) {
        const firstUncompletedStep = workflowState.uncompletedSteps?.[0];
        if (firstUncompletedStep) {
          const stepId = firstUncompletedStep.step_id || firstUncompletedStep.id;
          startStep(stepId, stageId, workflowState.completedStepsCount);
          triggerStepExecution(stepId, 'stage_ready_execute', EXECUTION_DELAYS.STAGE_READY);
        }
      }
    };
    
    window.addEventListener('workflowStepCompleted', handleStepCompletion as EventListener);
    window.addEventListener('dynamicStageReady', handleStageReady as EventListener);
    
    return () => {
      window.removeEventListener('workflowStepCompleted', handleStepCompletion as EventListener);
      window.removeEventListener('dynamicStageReady', handleStageReady as EventListener);
    };
  }, [currentStepId, currentState, markStepCompleted, recordStepState, completeStep, addChecklistCompletedItem,
      currentStageId, workflowState.hasUncompletedSteps, workflowState.uncompletedSteps, workflowState.completedStepsCount,
      triggerStepExecution, startStep]);

  useEffect(() => {
    return () => {
      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
      }
    };
  }, []);

  // Step advancement logic with loop prevention
  const lastAdvancedStep = useRef(null);
  
  useEffect(() => {
    const isPaused = currentState === WORKFLOW_STATES.STEP_FAILED;
    const isAutoExecuting = currentState === WORKFLOW_STATES.STEP_EXECUTING;
    
    if (!currentStepId || !completedSteps.includes(currentStepId) || !workflowState.hasUncompletedSteps || isPaused || !isAutoExecuting) {
      return;
    }
      
    const nextUncompletedStep = workflowState.uncompletedSteps?.[0];
    if (nextUncompletedStep) {
      const nextStepId = nextUncompletedStep.step_id || nextUncompletedStep.id;
      if (nextStepId !== currentStepId && nextStepId !== lastAdvancedStep.current) {
        lastAdvancedStep.current = nextStepId;
        recordStepState(nextStepId, 'auto_advance');
        setCurrentStepId(nextStepId);
        
        // Start next step through state machine only if idle
        if (currentState === WORKFLOW_STATES.IDLE || currentState === WORKFLOW_STATES.STEP_COMPLETED) {
          startStep(nextStepId, currentStageId, workflowState.completedStepsCount);
        }
        triggerStepExecution(nextStepId, 'auto_advance', EXECUTION_DELAYS.STEP_ADVANCE);
      }
    }
  }, [currentStepId, currentStageId, completedSteps, workflowState.hasUncompletedSteps, workflowState.uncompletedSteps, 
      workflowState.completedStepsCount, currentState, recordStepState, setCurrentStepId, triggerStepExecution, startStep]);

  // Show WorkflowControl with different states based on prerequisites
  if (!prerequisitesMet.bothMet) {
    let statusMessage = '';
    let statusColor = 'bg-gray-500';
    
    if (!prerequisitesMet.problemConfirmed) {
      statusMessage = 'Waiting for problem confirmation...';
      statusColor = 'bg-yellow-500';
    } else if (!prerequisitesMet.workflowActive) {
      statusMessage = 'Generating workflow...';
      statusColor = 'bg-orange-500';
    }
    
    return (
      <div className="fixed bottom-72 right-36 flex items-center gap-3" style={{ zIndex: 1000 }}>
        <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
            <span className="text-sm font-medium text-gray-700">
              {statusMessage}
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  // Show initialization status if workflow is not yet active but prerequisites are met
  if (!isWorkflowActive) {
    return (
      <div className="fixed bottom-72 right-36 flex items-center gap-3" style={{ zIndex: 1000 }}>
        <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">
              Initializing workflow...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-72 right-36 flex items-center gap-3" style={{ zIndex: (fallbackViewMode === 'demo' || fallbackViewMode === 'create') ? 9999 : 1000 }}>
      {/* Auto-executing Workflow Controls */}
      <AutoWorkflowControls
        isExecuting={workflowState.isExecuting}
        isPaused={currentState === WORKFLOW_STATES.STEP_FAILED}
        isAutoExecuting={currentState === WORKFLOW_STATES.STEP_EXECUTING}
        currentStepInfo={currentStepInfo ? {
          name: currentStepInfo.name || `Step ${currentStepInfo.step_id || currentStepInfo.id}`,
          progress: `${workflowState.completedStepsCount}/${workflowState.totalSteps}`
        } : null}
        onPause={handlePause}
        onResume={handleResume}
        onRetry={handleRetryStep}
        onRestart={handleRestartStep}
      />
    </div>
  );
};

export default WorkflowControl;