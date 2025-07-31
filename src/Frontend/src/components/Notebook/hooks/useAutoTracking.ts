import React, { useEffect, useRef } from 'react';
import useStore from '../../../store/notebookStore';
import { useWorkflowPanelStore } from '../store/workflowPanelStore';
import { usePipelineStore } from '../../senario/DSLCanalysis/store/pipelineController';

export const useAutoTracking = () => {
  const { 
    cells, 
    viewMode, 
    currentCellId, 
    lastAddedCellId,
    setCurrentCell 
  } = useStore();
  
  // Get real workflow state from pipeline store
  const {
    workflowTemplate,
    currentStageId,
    currentStepId,
    setCurrentStepId: setPipelineCurrentStepId
  } = usePipelineStore();
  
  const { 
    isAutoTracking, 
    setAutoTracking,
    setCurrentStage,
    setPlannedSteps
  } = useWorkflowPanelStore();
  
  const lastCellCountRef = useRef(cells.length);
  
  // Calculate current step index from pipeline store data
  const currentStepIndex = React.useMemo(() => {
    if (!workflowTemplate?.stages || !currentStageId || !currentStepId) return 0;
    
    const currentStage = workflowTemplate.stages.find(stage => stage.id === currentStageId);
    if (!currentStage?.steps) return 0;
    
    const stepIndex = currentStage.steps.findIndex(step => 
      step.id === currentStepId || step.step_id === currentStepId
    );
    return stepIndex >= 0 ? stepIndex : 0;
  }, [workflowTemplate, currentStageId, currentStepId]);
  
  const lastStepIndexRef = useRef(currentStepIndex);

  // Track latest cell in demo mode
  useEffect(() => {
    if (!isAutoTracking || viewMode !== 'demo') return;

    // Auto-navigate to latest step when new cells are added
    if (cells.length > lastCellCountRef.current && lastAddedCellId) {
      const latestCell = cells.find(cell => cell.id === lastAddedCellId);
      if (latestCell && workflowTemplate?.stages && currentStageId) {
        // Get current stage steps
        const currentStage = workflowTemplate.stages.find(stage => stage.id === currentStageId);
        if (currentStage?.steps) {
          // Navigate to the last step to show latest content
          const latestStepIndex = Math.max(0, currentStage.steps.length - 1);
          const latestStep = currentStage.steps[latestStepIndex];
          
          if (latestStepIndex !== currentStepIndex && latestStep) {
            console.log('AutoTracking: Navigating to latest step:', latestStep.step_id || latestStep.id);
            setPipelineCurrentStepId(latestStep.step_id || latestStep.id);
          }
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
  }, [cells.length, lastAddedCellId, isAutoTracking, viewMode, workflowTemplate, currentStageId, currentStepIndex, setPipelineCurrentStepId]);

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

  // Update stage and planned steps information using real workflow data
  useEffect(() => {
    if (workflowTemplate?.stages && currentStageId) {
      const currentStage = workflowTemplate.stages.find(stage => stage.id === currentStageId);
      if (currentStage?.steps && currentStage.steps.length > 0) {
        const currentStep = currentStage.steps[currentStepIndex];
        if (currentStep) {
          setCurrentStage(currentStep.name || `Step ${currentStepIndex + 1}`);
          
          // Set planned steps (upcoming steps in current stage)
          const upcomingSteps = currentStage.steps
            .slice(currentStepIndex + 1)
            .map(step => step.name || `Step ${currentStage.steps.indexOf(step) + 1}`)
            .slice(0, 5); // Show max 5 upcoming steps
          
          setPlannedSteps(upcomingSteps);
        }
      }
    }
  }, [currentStepIndex, workflowTemplate, currentStageId, setCurrentStage, setPlannedSteps]);

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