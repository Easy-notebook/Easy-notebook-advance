import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useWorkflowPanelStore } from '../store/workflowPanelStore';
import { usePipelineStore } from '../../senario/DSLCanalysis/store/pipelineController';

interface WorkflowPanelProps {
  // Props are now optional since we use store for state management
  showWorkflowConfirm?: boolean;
  pendingWorkflowUpdate?: any;
  onConfirmWorkflowUpdate?: () => void;
  onRejectWorkflowUpdate?: () => void;
  currentSteps?: any[];
  currentStepIndex?: number;
  stepsLoaded?: number[];
  isCompleted?: boolean;
  onNavigateToStep?: (stepIndex: number) => void;
}

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  // Fallback props for backward compatibility
  showWorkflowConfirm: fallbackShowWorkflowConfirm,
  pendingWorkflowUpdate: fallbackPendingWorkflowUpdate,
  onConfirmWorkflowUpdate: fallbackOnConfirmWorkflowUpdate,
  onRejectWorkflowUpdate: fallbackOnRejectWorkflowUpdate,
  currentSteps: fallbackCurrentSteps,
  currentStepIndex: fallbackCurrentStepIndex,
  stepsLoaded: fallbackStepsLoaded,
  isCompleted: fallbackIsCompleted,
  onNavigateToStep: fallbackOnNavigateToStep
}) => {
  // Use store state as primary, fallback to props for backward compatibility
  const {
    showWorkflowConfirm: storeShowWorkflowConfirm,
    pendingWorkflowUpdate: storePendingWorkflowUpdate,
    currentSteps: storeCurrentSteps,
    stepsLoaded: storeStepsLoaded,
    isCompleted: storeIsCompleted,
    isAutoTracking,
    confirmWorkflowUpdate,
    rejectWorkflowUpdate,
    navigateToStep,
    toggleAutoTracking,
    setCurrentStage
  } = useWorkflowPanelStore();

  // Get real-time workflow state from pipeline store
  const {
    workflowTemplate,
    currentStageId,
    currentStepId,
    completedSteps
  } = usePipelineStore();

  // Use store values or fallback to props
  const showWorkflowConfirm = storeShowWorkflowConfirm ?? fallbackShowWorkflowConfirm ?? false;
  const pendingWorkflowUpdate = storePendingWorkflowUpdate ?? fallbackPendingWorkflowUpdate;
  
  // Extract steps from CURRENT STAGE only for proper tracking
  const currentStageSteps = React.useMemo(() => {
    if (!workflowTemplate?.stages || !currentStageId) return fallbackCurrentSteps ?? [];
    
    // Find the current stage
    const currentStage = workflowTemplate.stages.find(stage => stage.id === currentStageId);
    if (!currentStage?.steps) return fallbackCurrentSteps ?? [];
    
    // Return only the steps from current stage
    return currentStage.steps.map(step => ({
      ...step,
      stageName: currentStage.name,
      stageId: currentStage.id
    }));
  }, [workflowTemplate, currentStageId, fallbackCurrentSteps]);
  
  // Find current step index within current stage based on currentStepId
  const realCurrentStepIndex = React.useMemo(() => {
    if (!currentStepId || currentStageSteps.length === 0) return fallbackCurrentStepIndex ?? 0;
    
    const index = currentStageSteps.findIndex(step => step.id === currentStepId || step.step_id === currentStepId);
    return index >= 0 ? index : fallbackCurrentStepIndex ?? 0;
  }, [currentStepId, currentStageSteps, fallbackCurrentStepIndex]);
  
  // Use current stage steps or fallback to props
  const currentSteps = currentStageSteps.length > 0 ? currentStageSteps : (storeCurrentSteps.length > 0 ? storeCurrentSteps : (fallbackCurrentSteps ?? []));
  const currentStepIndex = realCurrentStepIndex;
  
  // Only show completion status for steps in current stage
  const stepsLoaded = completedSteps
    .map(stepId => currentStageSteps.findIndex(step => step.id === stepId || step.step_id === stepId))
    .filter(index => index >= 0);
  
  const isCompleted = storeIsCompleted ?? fallbackIsCompleted ?? true; // Default to true so steps are clickable

  // Use store methods or fallback to props
  const handleConfirmWorkflowUpdate = () => {
    if (confirmWorkflowUpdate) {
      confirmWorkflowUpdate();
    } else if (fallbackOnConfirmWorkflowUpdate) {
      fallbackOnConfirmWorkflowUpdate();
    }
  };

  const handleRejectWorkflowUpdate = () => {
    if (rejectWorkflowUpdate) {
      rejectWorkflowUpdate();
    } else if (fallbackOnRejectWorkflowUpdate) {
      fallbackOnRejectWorkflowUpdate();
    }
  };

  const handleNavigateToStep = (stepIndex: number) => {
    // Disable tracking when manually navigating
    if (isAutoTracking) {
      toggleAutoTracking();
    }
    
    if (navigateToStep) {
      navigateToStep(stepIndex);
    } else if (fallbackOnNavigateToStep) {
      fallbackOnNavigateToStep(stepIndex);
    }
  };
  return (
    <>
      {/* Workflow Update Confirmation Dialog */}
      {showWorkflowConfirm && pendingWorkflowUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={handleRejectWorkflowUpdate} />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-xl mx-4">
            <div className="sticky top-0 bg-white border-b z-10">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-theme-600" />
                  <h3 className="text-xl font-bold text-gray-800">
                    Workflow Update Available
                  </h3>
                </div>
                <button
                  onClick={handleRejectWorkflowUpdate}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close Dialog"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg text-gray-600 mb-4">
                  According to your goal, PCS Agent has updated the TO-DO list:
                </p>
                
                <div className="bg-gray-50 rounded-3xl p-6 max-h-60 overflow-y-auto">
                  {pendingWorkflowUpdate.stages && pendingWorkflowUpdate.stages.length > 0 ? (
                    <ul className="space-y-4">
                      {pendingWorkflowUpdate.stages.map((stage: any, index: number) => (
                        <li key={stage.id || index} className="flex items-center">
                          <span className="w-8 h-8 bg-theme-100 text-theme-600 rounded-full flex items-center justify-center text-sm font-medium mr-4">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-lg font-medium text-gray-900">
                              {stage.name || stage.id || `Stage ${index + 1}`}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-lg text-gray-500">No stages information available</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleRejectWorkflowUpdate}
                  className="px-6 py-3 text-lg font-medium text-gray-600 border border-gray-300 rounded-3xl hover:bg-gray-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleConfirmWorkflowUpdate}
                  className="px-6 py-3 text-lg font-medium bg-theme-500 text-white rounded-3xl hover:bg-theme-600 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-500 focus:ring-offset-2"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Step Navigation Bar - Only show if we have steps */}
      {currentSteps.length > 0 && (
        <div className="sticky top-4 z-40 bg-blue-50 bg-opacity-20 backdrop-blur-lg">
          {/* Current Stage Header */}
          {currentStageSteps.length > 0 && currentStageSteps[0]?.stageName && (
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 font-medium">
                    Agents are working on {currentStageSteps[0].stageName}
                  </span>
                  <span className="text-gray-500">
                    Step {currentStepIndex + 1} of {currentSteps.length}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Step Navigation */}
          <div className="border-b border-gray-100 mb-4">
            <div className="max-w-screen-xl mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              <div className="flex">
                {currentSteps.map((step: any, index: number) => (
                  <button
                    key={step.id || index}
                    onClick={() => { 
                      if (isCompleted) { 
                        handleNavigateToStep(index);
                      } 
                    }}
                    onMouseEnter={() => {
                      // Preview step on hover
                      if (index !== currentStepIndex) {
                        setCurrentStage(`Preview: ${step.name || `Step ${index + 1}`}`);
                      }
                    }}
                    onMouseLeave={() => {
                      // Reset to current step
                      const currentStep = currentSteps[currentStepIndex];
                      setCurrentStage(currentStep?.name || `Step ${currentStepIndex + 1}`);
                    }}
                    className={`
                      flex items-center py-3 px-4 
                      transition-colors whitespace-nowrap 
                      focus:outline-none group relative
                      ${currentStepIndex === index
                          ? `text-theme-600 border-b-2 border-theme-500 bg-theme-50/50 ${
                              isAutoTracking ? 'ring-1 ring-green-300' : ''
                            }`
                          : 'text-gray-600 hover:bg-gray-100'
                        } 
                      ${!isCompleted ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isAutoTracking && index === currentSteps.length - 1 ? 'ring-1 ring-green-200' : ''}
                    `}
                    aria-selected={currentStepIndex === index}
                    disabled={!isCompleted}
                    title={step.description || step.name}
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
                    <div className="flex items-center">
                      <div className="text-sm font-medium">{step.name}</div>
                      {isAutoTracking && currentStepIndex === index && (
                        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                             title="Auto-tracking active" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkflowPanel;