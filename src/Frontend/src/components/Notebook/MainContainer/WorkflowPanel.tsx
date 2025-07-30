import React from 'react';
import { CheckCircle, AlertCircle, Target} from 'lucide-react';
import { useWorkflowPanelStore } from '../store/workflowPanelStore';

interface WorkflowPanelProps {
  // Props are now optional since we use store for state management
  showWorkflowConfirm?: boolean;
  pendingWorkflowUpdate?: any;
  onConfirmWorkflowUpdate?: () => void;
  onRejectWorkflowUpdate?: () => void;
  workflowUpdated?: boolean;
  workflowUpdateCount?: number;
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
  workflowUpdated: fallbackWorkflowUpdated,
  workflowUpdateCount: fallbackWorkflowUpdateCount,
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
    workflowUpdated: storeWorkflowUpdated,
    workflowUpdateCount: storeWorkflowUpdateCount,
    currentSteps: storeCurrentSteps,
    currentStepIndex: storeCurrentStepIndex,
    stepsLoaded: storeStepsLoaded,
    isCompleted: storeIsCompleted,
    isAutoTracking,
    currentStage,
    plannedSteps,
    confirmWorkflowUpdate,
    rejectWorkflowUpdate,
    navigateToStep,
    toggleAutoTracking,
    setCurrentStage,
    setPlannedSteps
  } = useWorkflowPanelStore();

  // Use store values or fallback to props
  const showWorkflowConfirm = storeShowWorkflowConfirm ?? fallbackShowWorkflowConfirm ?? false;
  const pendingWorkflowUpdate = storePendingWorkflowUpdate ?? fallbackPendingWorkflowUpdate;
  const workflowUpdated = storeWorkflowUpdated ?? fallbackWorkflowUpdated ?? false;
  const workflowUpdateCount = storeWorkflowUpdateCount ?? fallbackWorkflowUpdateCount ?? 0;
  const currentSteps = storeCurrentSteps.length > 0 ? storeCurrentSteps : (fallbackCurrentSteps ?? []);
  const currentStepIndex = storeCurrentStepIndex ?? fallbackCurrentStepIndex ?? 0;
  const stepsLoaded = storeStepsLoaded.length > 0 ? storeStepsLoaded : (fallbackStepsLoaded ?? []);
  const isCompleted = storeIsCompleted ?? fallbackIsCompleted ?? false;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-blue-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Workflow Update Available
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                According to your goal, PCS Agent has updated the TO-DO list:
              </p>
              
              <div className="bg-gray-50 rounded p-4 max-h-60 overflow-y-auto">
                {pendingWorkflowUpdate.stages && pendingWorkflowUpdate.stages.length > 0 ? (
                  <ul className="space-y-2">
                    {pendingWorkflowUpdate.stages.map((stage: any, index: number) => (
                      <li key={stage.id || index} className="flex items-center">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {stage.name || stage.id || `Stage ${index + 1}`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No stages information available</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleRejectWorkflowUpdate}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleConfirmWorkflowUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Update Success Notification */}
      {workflowUpdated && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg animate-pulse">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">
              Workflow Updated ({workflowUpdateCount} {workflowUpdateCount === 1 ? 'time' : 'times'})
            </span>
          </div>
        </div>
      )}

      
      {/* Step Navigation Bar - Only show if we have steps */}
      {currentSteps.length > 0 && (
        <div className="sticky top-4 z-40 bg-blue-50 bg-opacity-20 backdrop-blur-lg">
          {/* Stage Info and Tracking Controls */}
          {/* <div className="border-b border-gray-100 px-4 py-2">
            <div className="flex items-center justify-between text-sm"> */}
              {/* Left: Current Stage */}
              {/* <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {currentStage || `Step ${currentStepIndex + 1} of ${currentSteps.length}`}
                </span>
                {plannedSteps.length > 0 && (
                  <span className="text-gray-500">
                    → {plannedSteps.slice(0, 2).join(' → ')}
                    {plannedSteps.length > 2 && ` +${plannedSteps.length - 2}`}
                  </span>
                )}
              </div> */}

              {/* Right: Tracking Toggle */}
              {/* <button
                onClick={toggleAutoTracking}
                className={`
                  flex items-center px-2 py-1 text-xs rounded transition-colors
                  ${isAutoTracking
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
                title={`Auto-tracking: ${isAutoTracking ? 'On' : 'Off'} (Alt+Shift+T)`}
              >
                <Target size={12} className="mr-1" />
                {isAutoTracking ? 'Track' : 'Off'}
              </button>
            </div>
          </div>
           */}
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