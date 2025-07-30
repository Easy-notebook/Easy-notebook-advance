import { useEffect, useRef } from 'react';
import useStore from '../../../store/notebookStore';
import { useWorkflowPanelStore } from '../store/workflowPanelStore';

export const useAutoTracking = () => {
  const { 
    cells, 
    viewMode, 
    currentCellId, 
    lastAddedCellId,
    currentStepIndex,
    setCurrentStepIndex,
    setCurrentCell 
  } = useStore();
  
  const { 
    isAutoTracking, 
    setAutoTracking,
    currentSteps,
    setCurrentStage,
    setPlannedSteps
  } = useWorkflowPanelStore();
  
  const lastCellCountRef = useRef(cells.length);
  const lastStepIndexRef = useRef(currentStepIndex);

  // Track latest cell in demo mode
  useEffect(() => {
    if (!isAutoTracking || viewMode !== 'demo') return;

    // Auto-navigate to latest step when new cells are added
    if (cells.length > lastCellCountRef.current && lastAddedCellId) {
      const latestCell = cells.find(cell => cell.id === lastAddedCellId);
      if (latestCell) {
        // Navigate to the last step to show latest content
        const latestStepIndex = Math.max(0, currentSteps.length - 1);
        
        if (latestStepIndex !== currentStepIndex) {
          setCurrentStepIndex(latestStepIndex);
        }
        
        // Scroll to the latest cell
        setTimeout(() => {
          const cellElement = document.querySelector(`[data-cell-id="${lastAddedCellId}"]`);
          if (cellElement) {
            cellElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
      }
    }

    lastCellCountRef.current = cells.length;
  }, [cells.length, lastAddedCellId, isAutoTracking, viewMode, currentSteps, currentStepIndex, setCurrentStepIndex]);

  // Track latest cell in create mode  
  useEffect(() => {
    if (!isAutoTracking || viewMode !== 'create') return;

    // Keep latest cell visible and scroll to it
    if (lastAddedCellId && lastAddedCellId !== currentCellId) {
      setCurrentCell(lastAddedCellId);
      
      // Scroll to the cell element
      setTimeout(() => {
        const cellElement = document.querySelector(`[data-cell-id="${lastAddedCellId}"]`);
        if (cellElement) {
          cellElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [lastAddedCellId, currentCellId, isAutoTracking, viewMode, setCurrentCell]);

  // Note: Manual step navigation disabling is handled in WorkflowPanel.tsx
  // via the handleNavigateToStep function

  // Update stage and planned steps information
  useEffect(() => {
    if (currentSteps.length > 0) {
      const currentStep = currentSteps[currentStepIndex];
      if (currentStep) {
        setCurrentStage(currentStep.name || `Step ${currentStepIndex + 1}`);
        
        // Set planned steps (upcoming steps)
        const upcomingSteps = currentSteps
          .slice(currentStepIndex + 1)
          .map(step => step.name || `Step ${currentSteps.indexOf(step) + 1}`)
          .slice(0, 5); // Show max 5 upcoming steps
        
        setPlannedSteps(upcomingSteps);
      }
    }
  }, [currentStepIndex, currentSteps, setCurrentStage, setPlannedSteps]);

  // Reset tracking when switching view modes
  useEffect(() => {
    setAutoTracking(true);
  }, [viewMode, setAutoTracking]);

  return {
    isAutoTracking,
    toggleAutoTracking: () => setAutoTracking(!isAutoTracking),
  };
};

export default useAutoTracking;