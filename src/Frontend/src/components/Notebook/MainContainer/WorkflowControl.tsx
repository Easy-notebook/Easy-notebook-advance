import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FaStopCircle, FaRedo, FaPlay, FaPause } from 'react-icons/fa';
import { usePipelineStore } from '../../senario/DSLCanalysis/store/pipelineController';
import { useWorkflowPanelStore } from '../store/workflowPanelStore';
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

interface StepInfo {
  name: string;
  id: string;
  description?: string;
}

interface WorkflowState {
  isExecuting: boolean;
  hasUncompletedSteps: boolean;
  isStageCompleted: boolean;
  uncompletedSteps?: any[];
  totalSteps: number;
  completedStepsCount: number;
}

interface StepStateRecord {
  timestamp: number;
  action: string;
  stepId: string;
  stageId: string | null;
  executionContext: {
    isPaused: boolean;
    isAutoExecuting: boolean;
    currentStepInfo: StepInfo | null;
  };
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
  const [stepStateHistory, setStepStateHistory] = useState<Map<string, StepStateRecord>>(new Map());
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    workflowTemplate,
    currentStageId,
    currentStepId,
    isWorkflowActive,
    completedSteps,
    completedStages,
    setStage,
    setCurrentStepId,
    markStepCompleted,
    markStageCompleted: markPipelineStageCompleted,
  } = usePipelineStore();

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
    const isExecuting = (hasUncompletedSteps && !isPaused) || (isAutoExecuting && !isPaused);
    
    return {
      isExecuting,
      hasUncompletedSteps,
      isStageCompleted,
      uncompletedSteps: uncompletedStepsInStage,
      totalSteps: currentStageInfo.steps.length,
      completedStepsCount: currentStageInfo.steps.length - uncompletedStepsInStage.length
    };
  }, [isWorkflowActive, workflowTemplate, currentStageInfo, completedSteps, isPaused, isAutoExecuting]);

  const recordStepState = useCallback((stepId: string, action: string = 'execute') => {
    const currentState: StepStateRecord = {
      timestamp: Date.now(),
      action,
      stepId,
      stageId: currentStageId,
      executionContext: {
        isPaused,
        isAutoExecuting,
        currentStepInfo: currentStepInfo ? {
          name: currentStepInfo.name,
          id: currentStepInfo.step_id || currentStepInfo.id,
          description: currentStepInfo.description
        } : null
      }
    };
    
    setStepStateHistory(prev => new Map(prev.set(`${stepId}_${action}_${Date.now()}`, currentState)));
  }, [currentStageId, isPaused, isAutoExecuting, currentStepInfo]);

  const handleAutoStageTransition = useCallback(() => {
    if (!workflowTemplate?.stages || !currentStageId || !workflowState.isStageCompleted) return;
    
    const currentStageIndex = workflowTemplate.stages.findIndex(stage => stage.id === currentStageId);
    const nextStage = workflowTemplate.stages[currentStageIndex + 1];
    
    if (nextStage) {
      recordStepState(currentStageId, 'stage_completed');
      markPipelineStageCompleted(currentStageId);
      
      const { setStage: setPipelineStage } = usePipelineStore.getState();
      setPipelineStage(nextStage.id);
      
      if (nextStage.steps?.length > 0) {
        const firstStep = nextStage.steps[0];
        const firstStepId = firstStep.step_id || firstStep.id;
        setCurrentStepId(firstStepId);
        recordStepState(firstStepId, 'stage_transition');
        
        setTimeout(() => {
          setIsAutoExecuting(true);
          setIsPaused(false);
        }, EXECUTION_DELAYS.STAGE_TRANSITION);
      }
    } else {
      recordStepState('workflow', 'completed');
      setIsAutoExecuting(false);
    }
  }, [workflowTemplate, currentStageId, workflowState.isStageCompleted, setCurrentStepId, recordStepState, markPipelineStageCompleted]);

  // Step control handlers
  const handlePause = useCallback(() => {
    setIsPaused(true);
    setIsAutoExecuting(false);
    
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
      executionTimeoutRef.current = null;
    }
    
    if (currentStepId) {
      recordStepState(currentStepId, 'paused');
    }
  }, [currentStepId, recordStepState]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    setIsAutoExecuting(true);
    
    if (currentStepId) {
      recordStepState(currentStepId, 'resumed');
      
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
  }, [currentStepId, recordStepState]);

  const handleRetryStep = useCallback(() => {
    if (!currentStepId) return;
    
    recordStepState(currentStepId, 'retry');
    setIsPaused(false);
    setIsAutoExecuting(true);
    
    executionTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
        detail: { 
          stepId: currentStepId, 
          action: 'retry',
          timestamp: Date.now()
        }
      }));
    }, EXECUTION_DELAYS.RETRY);
  }, [currentStepId, recordStepState]);

  const handleRestartStep = useCallback(() => {
    if (!currentStepId) return;
    
    const currentState = Array.from(stepStateHistory.entries())
      .filter(([key]) => key.includes(currentStepId))
      .pop()?.[1];
    if (currentState) {
      setStepStateHistory(prev => new Map(prev.set(`${currentStepId}_backup_${Date.now()}`, currentState)));
    }
    
    recordStepState(currentStepId, 'restart');
    
    const updatedCompletedSteps = completedSteps.filter(stepId => stepId !== currentStepId);
    usePipelineStore.setState({ completedSteps: updatedCompletedSteps });
    
    setIsPaused(false);
    setIsAutoExecuting(true);
    
    executionTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workflowStepTrigger', {
        detail: { 
          stepId: currentStepId, 
          action: 'restart',
          timestamp: Date.now(),
          clearPreviousResults: true
        }
      }));
    }, EXECUTION_DELAYS.RESTART);
  }, [currentStepId, stepStateHistory, recordStepState, completedSteps]);


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

  useEffect(() => {
    if (!isWorkflowActive || !workflowState.hasUncompletedSteps || isPaused || !prerequisitesMet.bothMet) return;
    
    if (!currentStepId && workflowState.uncompletedSteps?.length > 0) {
      const firstUncompletedStep = workflowState.uncompletedSteps[0];
      const stepId = firstUncompletedStep.step_id || firstUncompletedStep.id;
      setCurrentStepId(stepId);
      recordStepState(stepId, 'auto_start');
      setIsAutoExecuting(true);
      
      triggerStepExecution(stepId, 'auto_execute', EXECUTION_DELAYS.AUTO_START);
    }
    else if (currentStepId && workflowState.hasUncompletedSteps && !isAutoExecuting) {
      setIsAutoExecuting(true);
      triggerStepExecution(currentStepId, 'resume_execute', EXECUTION_DELAYS.RESUME);
    }
  }, [isWorkflowActive, workflowState.hasUncompletedSteps, workflowState.uncompletedSteps, currentStepId, setCurrentStepId, isPaused, recordStepState, isAutoExecuting, prerequisitesMet.bothMet, triggerStepExecution]);

  useEffect(() => {
    if (workflowState.isStageCompleted && !isPaused && isWorkflowActive && prerequisitesMet.bothMet) {
      setTimeout(handleAutoStageTransition, 2000);
    }
  }, [workflowState.isStageCompleted, handleAutoStageTransition, isPaused, isWorkflowActive, prerequisitesMet.bothMet]);

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
      }
      
      setIsAutoExecuting(true);
      setIsPaused(false);
    }
  }, [isWorkflowActive, workflowTemplate, currentStageId, currentStepId, setStage, setCurrentStepId, recordStepState, prerequisitesMet.bothMet]);

  useEffect(() => {
    const handleStepCompletion = (event: CustomEvent) => {
      const { stepId } = event.detail;
      
      if (stepId === currentStepId && isAutoExecuting && !isPaused) {
        markStepCompleted(stepId);
        recordStepState(stepId, 'completed');
      }
    };
    
    const handleStageReady = (event: CustomEvent) => {
      const { stageId } = event.detail;
      
      if (stageId === currentStageId && isAutoExecuting && !isPaused && workflowState.hasUncompletedSteps) {
        const firstUncompletedStep = workflowState.uncompletedSteps?.[0];
        if (firstUncompletedStep) {
          const stepId = firstUncompletedStep.step_id || firstUncompletedStep.id;
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
  }, [currentStepId, isAutoExecuting, isPaused, markStepCompleted, recordStepState, currentStageId, workflowState.hasUncompletedSteps, workflowState.uncompletedSteps, triggerStepExecution]);

  useEffect(() => {
    return () => {
      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentStepId || !completedSteps.includes(currentStepId) || !workflowState.hasUncompletedSteps || isPaused || !isAutoExecuting) {
      return;
    }
      
    const nextUncompletedStep = workflowState.uncompletedSteps?.[0];
    if (nextUncompletedStep) {
      const nextStepId = nextUncompletedStep.step_id || nextUncompletedStep.id;
      if (nextStepId !== currentStepId) {
        recordStepState(nextStepId, 'auto_advance');
        setCurrentStepId(nextStepId);
        triggerStepExecution(nextStepId, 'auto_advance', EXECUTION_DELAYS.STEP_ADVANCE);
      }
    }
  }, [currentStepId, completedSteps, workflowState.hasUncompletedSteps, workflowState.uncompletedSteps, isPaused, isAutoExecuting, recordStepState, setCurrentStepId, triggerStepExecution]);

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
        isPaused={isPaused}
        isAutoExecuting={isAutoExecuting}
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