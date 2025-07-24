import { useState, useEffect } from 'react';
import { FaStopCircle } from 'react-icons/fa';
import { useWorkflowControlStore } from '../store/workflowControlStore';

const GeneratingIndicator = ({ handleTerminate }: { handleTerminate: () => void }) => {
  const [ellipsis, setEllipsis] = useState('...');

  useEffect(() => {
    const interval = setInterval(() => {
      setEllipsis(prev => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="group flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-5 py-2.5 shadow-lg"
      onClick={() => {
        console.log('Terminate button clicked, calling handleTerminate:', !!handleTerminate);
        handleTerminate();
      }}
    >
      <FaStopCircle
        size={20}
        className="text-gray-500 group-hover:text-theme-500 transition-colors duration-300"
      />
      <span className="text-gray-500 text-sm font-medium group-hover:hidden">Generating{ellipsis}</span>
      <span className="text-theme-500 text-sm font-medium hidden group-hover:block">Stop</span>
    </div>
  );
};

interface WorkflowControlProps {
  fallbackIsExecuting?: boolean;
  fallbackViewMode?: string;
  fallbackCurrentPhaseId?: string | null;
  fallbackHandleNextPhase?: () => void;
}

const WorkflowControl: React.FC<WorkflowControlProps> = ({
  fallbackIsExecuting = false,
  fallbackViewMode = 'complete',
  fallbackCurrentPhaseId = null,
  fallbackHandleNextPhase = () => {}
}) => {
  // Get state and handlers from store
  const {
    isGenerating,
    isCompleted,
    continueCountdown,
    isReturnVisit,
    continueButtonText,
    onTerminate,
    onContinue,
    onCancelCountdown
  } = useWorkflowControlStore();

  // Use store values or fallback values - define these first
  const effectiveIsGenerating = isGenerating || fallbackIsExecuting;
  
  // For non-DCLS modes, we need to show completed state when not generating
  const effectiveIsCompleted = isCompleted || (!isGenerating && !fallbackIsExecuting && fallbackViewMode !== 'dslc');
  
  // Always prefer store handlers over fallback
  const effectiveOnTerminate = onTerminate || (() => {
    console.log('Fallback terminate handler called');
  });
  
  const effectiveOnContinue = onContinue || (() => {
    console.log('Fallback continue handler called', {
      fallbackViewMode,
      fallbackCurrentPhaseId,
      hasFallbackHandler: !!fallbackHandleNextPhase
    });
    
    if (fallbackViewMode === 'step' && fallbackCurrentPhaseId && fallbackHandleNextPhase) {
      console.log('Calling fallbackHandleNextPhase...');
      try {
        fallbackHandleNextPhase();
        console.log('fallbackHandleNextPhase called successfully');
      } catch (error) {
        console.error('Error calling fallbackHandleNextPhase:', error);
      }
    } else if (fallbackViewMode === 'dslc') {
      console.log('DSLC mode: checking window._dslcStageInfo');
      console.log('window._dslcStageInfo:', window._dslcStageInfo);
      const stageInfo = window._dslcStageInfo;
      
      if (stageInfo?.onComplete) {
        console.log('Found DSLC onComplete, executing...');
        try {
          stageInfo.onComplete();
        } catch (error) {
          console.error('Error calling DSLC onComplete:', error);
        }
      } else {
        console.log('No DSLC onComplete found in window._dslcStageInfo');
      }
    } else {
      console.log('No valid fallback action available');
    }
  });

  // Always show something - either the actual controls or a placeholder
  const hasAnyContent = effectiveIsGenerating || effectiveIsCompleted || !!effectiveOnTerminate || !!effectiveOnContinue;
  
  // Debug the actual functions being used
  console.log('WorkflowControl - onContinue source:', onContinue ? onContinue.toString().includes('Basic continue handler') : 'null');
  console.log('WorkflowControl - effectiveOnContinue === onContinue:', effectiveOnContinue === onContinue);
  
  console.log('WorkflowControl hasAnyContent check:', {
    isGenerating,
    fallbackIsExecuting,
    effectiveIsGenerating,
    isCompleted,
    effectiveIsCompleted,
    fallbackViewMode,
    hasOnTerminate: !!onTerminate,
    hasOnContinue: !!onContinue,
    hasEffectiveOnTerminate: !!effectiveOnTerminate,
    hasEffectiveOnContinue: !!effectiveOnContinue,
    hasAnyContent
  });

  return (
    <div className="fixed bottom-72 right-36 flex items-center gap-3" style={{ zIndex: fallbackViewMode === 'dslc' ? 9999 : 1000 }}>
      {/* Generate/Stop Button */}
      {effectiveIsGenerating && !effectiveIsCompleted && effectiveOnTerminate && (
        <GeneratingIndicator handleTerminate={effectiveOnTerminate} />
      )}
      
      {/* Continue to Next Stage Button */}
      {effectiveIsCompleted && (
        <div className="flex items-center gap-3">
          {continueCountdown > 0 && !isReturnVisit && onCancelCountdown && (
            <button
              onClick={onCancelCountdown}
              className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-5 py-2.5 text-gray-700 hover:bg-white hover:bg-opacity-25 transition-all duration-300 shadow-sm text-sm font-medium focus:outline-none"
            >
              Cancel Auto Navigation
            </button>
          )}
          {effectiveOnContinue && (
            <button
              onClick={() => {
                console.log('Continue button clicked, calling effectiveOnContinue:', !!effectiveOnContinue);
                effectiveOnContinue();
              }}
              className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-5 py-2.5 shadow-lg text-gray-700 hover:text-theme-700 transition-all duration-300 flex items-center text-sm font-medium"
            >
              {continueButtonText || 'Continue Workflow'}
              {continueCountdown > 0 && !isReturnVisit && (
                <span className="ml-2 bg-theme-500 bg-opacity-80 px-2 py-0.5 rounded-full text-white text-xs">
                  {continueCountdown}s
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowControl;