// Pipeline.jsx
import { usePipelineStore, PIPELINE_STAGES } from './store/pipelineController';
import PipelineStageWrapper from '../utils/PipelineStageWrapper';
import EmptyState from './preStage/EmptyState';
import ProblemDefineState from './preStage/ProblemDefineState';
import DynamicStageTemplate from './stages/DynamicStageTemplate';


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

    // Render current stage component based on backend configuration
    const rendercurrentStage = () => {
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
                            // Initialize workflow when starting data analysis stages
                            if (!isWorkflowActive) {
                                try {
                                    const template = await initializeWorkflow('data_analysis');
                                    
                                    // Frontend determines first stage from template
                                    if (template.stages?.[0]?.id) {
                                        usePipelineStore.getState().setStage(template.stages[0].id);
                                    }
                                } catch (error) {
                                    console.error('Failed to initialize workflow:', error);
                                    // Fallback to manual stage progression if workflow fails
                                    usePipelineStore.getState().nextStage('data_loading_and_hypothesis_proposal');
                                }
                            }
                        }}
                    />
                </PipelineStageWrapper>
            );
        }

        // For all data analysis stages, use dynamic template with backend configuration
        if (isWorkflowActive) {
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
                                    nextStage(nextStageId);
                                } else {
                                    console.log('All stages completed - no more stages to transition to');
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