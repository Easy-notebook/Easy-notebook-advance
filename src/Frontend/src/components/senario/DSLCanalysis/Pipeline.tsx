// Pipeline.jsx
import { usePipelineStore, PIPELINE_STAGES } from './store/pipelineController';
import PipelineStageWrapper from '../utils/PipelineStageWrapper';
import EmptyState from './preStage/EmptyState';
import ProblemDefineState from './preStage/ProblemDefineState';
import DynamicStageTemplate from './stages/DynamicStageTemplate';
import useStore from '../../../store/notebookStore';
import usePreStageStore from './store/preStageStore';


import './pipelineAnimations.css';


const DSLCPipeline = ({onAddCell}) => {
    const { 
        currentStage, 
        isAnimating, 
        animationDirection, 
        initializeWorkflow,
        isWorkflowActive,
        workflowTemplate,
        currentStageId,
        nextStage,
        getStageTransitionSuggestion
    } = usePipelineStore();
    
    const { setViewMode, viewMode } = useStore();

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
                            // Set appropriate view mode for simplified workflow control
                            // Support both demo and create modes as specified by user
                            if (viewMode === 'step') {
                                setViewMode('demo');
                            }
                            
                            // Initialize workflow with planning when starting data analysis stages
                            if (!isWorkflowActive) {
                                try {
                                    console.log('Initializing workflow with planning...');
                                    
                                    // Get planning data from preStageStore
                                    const preStageState = usePreStageStore.getState();
                                    const planningRequest = {
                                        problem_name: preStageState.problem_name || 'Data Analysis',
                                        user_goal: preStageState.problem_description || 'Analyze data to derive insights',
                                        problem_description: preStageState.problem_description || 'General data analysis task',
                                        context_description: preStageState.dataset_info || 'Dataset analysis context'
                                    };
                                    
                                    console.log('Planning request:', planningRequest);
                                    const planning = await initializeWorkflow(planningRequest);
                                    console.log('Workflow planning initialized:', planning);
                                    
                                    // Wait a bit for state to update, then check
                                    setTimeout(() => {
                                        const currentState = usePipelineStore.getState();
                                        console.log('Current state after planning init:', {
                                            currentStage: currentState.currentStage,
                                            isWorkflowActive: currentState.isWorkflowActive,
                                            currentStageId: currentState.currentStageId,
                                            workflowAnalysis: currentState.workflowAnalysis
                                        });
                                    }, 100);
                                    
                                    // Check if planning generated valid stages
                                    if (!planning.stages?.[0]?.id) {
                                        console.error('No stages found in planning result');
                                        throw new Error('Planning did not generate valid stages');
                                    }
                                    
                                } catch (error) {
                                    console.error('Failed to initialize workflow with planning:', error);
                                    // The static planning workflow should always work, so this is an unexpected error
                                    throw error;
                                }
                            } else {
                                console.log('Workflow already active, transitioning to first stage');
                                // If workflow is already active, just go to the first stage
                                if (workflowTemplate?.stages?.[0]?.id) {
                                    usePipelineStore.getState().setStage(workflowTemplate.stages[0].id);
                                }
                            } 
                        }}
                    />
                </PipelineStageWrapper>
            );
        }

        // For all data analysis stages, use dynamic template with backend configuration
        if (isWorkflowActive && currentStage !== PIPELINE_STAGES.EMPTY && currentStage !== PIPELINE_STAGES.PROBLEM_DEFINE) {
            return (
                <PipelineStageWrapper
                    stage={currentStage}
                    currentStage={currentStage}
                    isAnimating={isAnimating}
                    animationDirection={animationDirection}
                >
                    <DynamicStageTemplate
                        onComplete={async () => {
                            console.log(`Stage ${currentStage} completed`);
                            console.log('Current workflow template:', workflowTemplate);
                            console.log('Current stage ID:', currentStageId);
                            
                            // Use template-based navigation for reliability
                            const currentTemplate = workflowTemplate;
                            console.log('Available stages:', currentTemplate?.stages);
                            
                            if (currentTemplate && currentTemplate.stages) {
                                const currentStageIndex = currentTemplate.stages.findIndex(stage => stage.id === currentStage);
                                console.log(`Current stage "${currentStage}" found at index: ${currentStageIndex}`);
                                const nextStageIndex = currentStageIndex + 1;
                                
                                if (nextStageIndex < currentTemplate.stages.length) {
                                    const nextStageId = currentTemplate.stages[nextStageIndex].id;
                                    console.log(`Transitioning to next stage: ${nextStageId}`);
                                    
                                    // Use setStage instead of nextStage for more reliable navigation
                                    setTimeout(() => {
                                        const pipelineState = usePipelineStore.getState();
                                        pipelineState.setStage(nextStageId, 'next');
                                        console.log(`Successfully set next stage: ${nextStageId}`);
                                    }, 50);
                                } else {
                                    console.log('All stages completed - workflow finished');
                                    // Could show completion message or return to main view
                                }
                            } else {
                                console.error('No workflow template available - cannot transition to next stage');
                            }
                        }}
                    />
                </PipelineStageWrapper>
            );
        }


        // Fallback for unknown stages
        return (
            <PipelineStageWrapper
                stage={currentStage}
                currentStage={currentStage}
                isAnimating={isAnimating}
                animationDirection={animationDirection}
            >
                <div className="text-center p-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        Unknown Stage: {currentStage}
                    </h2>
                    <p className="text-gray-500">
                        This stage is not recognized. Please check the backend configuration.
                    </p>
                </div>
            </PipelineStageWrapper>
        );
    };

    return (
        <div className="w-full h-full">
            {/* Navigation header */}
            {/* <PipelineNavigation /> */}

            {/* Pipeline stage container - ensures proper positioning for animations */}
            <div className="w-full h-full flex items-center justify-center">
                {rendercurrentStage()}
            </div>
        </div>
    );
};

export default DSLCPipeline;