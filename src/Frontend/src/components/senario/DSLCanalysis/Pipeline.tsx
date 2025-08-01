// Pipeline.tsx
import React, { useState } from 'react';
import { usePipelineStore, PIPELINE_STAGES } from './store/pipelineController';
import PipelineStageWrapper from '../utils/PipelineStageWrapper';
import EmptyState from './preStage/EmptyState';
import ProblemDefineState from './preStage/ProblemDefineState';
import usePreStageStore from './store/preStageStore';
import DynamicStageTemplate from './stages/DynamicStageTemplate';

const DSLCPipeline = ({onAddCell}) => {
    const [viewMode, setViewMode] = useState('step');
    
    const { 
        currentStage, 
        isAnimating, 
        animationDirection, 
        initializeWorkflow,
        isWorkflowActive,
        workflowTemplate,
        currentStageId,
    } = usePipelineStore();
    

    // Render current stage component based on backend configuration
    const rendercurrentStage = () => {
        console.log('Rendering stage:', {
            currentStage,
            isWorkflowActive,
            workflowTemplate: workflowTemplate?.stages?.map(s => s.id)
        });
        
        // Handle initial stages (not workflow-driven)
        if (currentStage === PIPELINE_STAGES.EMPTY) {
            return (
                <PipelineStageWrapper
                    stage={PIPELINE_STAGES.EMPTY}
                    currentStage={currentStage}
                    isAnimating={isAnimating}
                    animationDirection={animationDirection}
                >
                    <EmptyState 
                        onAddCell={onAddCell}
                        onFileUpload={() => {
                            usePipelineStore.getState().nextStage(PIPELINE_STAGES.PROBLEM_DEFINE);
                        }} 
                    />
                </PipelineStageWrapper>
            );
        }
        
        if (currentStage === PIPELINE_STAGES.PROBLEM_DEFINE) {
            return (
                <PipelineStageWrapper
                    stage={PIPELINE_STAGES.PROBLEM_DEFINE}
                    currentStage={currentStage}
                    isAnimating={isAnimating}
                    animationDirection={animationDirection}
                >
                    <ProblemDefineState 
                        confirmProblem={async () => {
                            try {
                                if (viewMode === 'step') {
                                    setViewMode('demo');
                                }
                                
                                if (!isWorkflowActive) {
                                    console.log('[Pipeline] Problem confirmed, initializing workflow...');
                                    
                                    // Get planning data from preStageStore
                                    const preStageState = usePreStageStore.getState();
                                    const planningRequest = {
                                        problem_name: preStageState.problem_name || 'Data Analysis',
                                        user_goal: preStageState.problem_description || 'Analyze data to derive insights',
                                        problem_description: preStageState.problem_description || 'General data analysis task',
                                        context_description: preStageState.dataset_info || 'Dataset analysis context'
                                    };
                                    
                                    console.log('[Pipeline] Planning request:', planningRequest);
                                    const planning = await initializeWorkflow(planningRequest);
                                    console.log('[Pipeline] Workflow initialized successfully:', planning);
                                    
                                    // Check if planning generated valid stages
                                    if (!planning?.stages?.[0]?.id) {
                                        console.error('[Pipeline] No stages found in planning result');
                                        throw new Error('Planning did not generate valid stages');
                                    }
                                    
                                    // Wait a bit for state to update, then check
                                    setTimeout(() => {
                                        const currentState = usePipelineStore.getState();
                                        console.log('[Pipeline] Current state after workflow init:', {
                                            currentStage: currentState.currentStage,
                                            isWorkflowActive: currentState.isWorkflowActive,
                                            currentStageId: currentState.currentStageId,
                                            workflowAnalysis: currentState.workflowAnalysis
                                        });
                                    }, 100);
                                    
                                } else {
                                    console.log('[Pipeline] Workflow already active, transitioning to first stage');
                                    // If workflow is already active, just go to the first stage
                                    if (workflowTemplate?.stages?.[0]?.id) {
                                        usePipelineStore.getState().setStage(workflowTemplate.stages[0].id);
                                    }
                                }
                            } catch (error) {
                                console.error('[Pipeline] Failed to confirm problem and initialize workflow:', error);
                                // You might want to show a user-friendly error message here
                                alert('Failed to initialize workflow. Please try again.');
                            }
                        }}
                    />
                </PipelineStageWrapper>
            );
        }
        
        // Handle workflow-driven stages
        if (isWorkflowActive && workflowTemplate?.stages && currentStageId) {
            const currentStageConfig = workflowTemplate.stages.find(stage => stage.id === currentStageId);
            
            if (!currentStageConfig) {
                console.error(`[Pipeline] Stage config not found for ${currentStageId}`);
                return (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-red-500">Error: Stage configuration not found</p>
                    </div>
                );
            }
            
            return (
                <PipelineStageWrapper
                    stage={currentStageId}
                    currentStage={currentStage}
                    isAnimating={isAnimating}
                    animationDirection={animationDirection}
                >
                    <DynamicStageTemplate 
                        stageConfig={currentStageConfig}
                        onAddCell={onAddCell}
                    />
                </PipelineStageWrapper>
            );
        }
        
        // Default fallback
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No stage to render</p>
            </div>
        );
    };
    
    return (
        <div className="w-full h-full">
            <div className="w-full h-full flex items-center justify-center">
                {rendercurrentStage()}
            </div>
        </div>
    );
};

export default DSLCPipeline;