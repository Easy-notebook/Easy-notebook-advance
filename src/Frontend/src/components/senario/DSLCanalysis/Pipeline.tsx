// Pipeline.jsx
import { usePipelineStore, PIPELINE_STAGES } from './store/pipelineController';
import PipelineStageWrapper from '../utils/PipelineStageWrapper';
import EmptyState from './preStage/EmptyState';
import ProblemDefineState from './preStage/ProblemDefineState';
import DynamicStageTemplate from './stages/DynamicStageTemplate';
import useStore from '../../../store/notebookStore';


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
    
    const { setViewMode } = useStore();

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
                            // Set view mode to dslc for analysis workflow
                            setViewMode('dslc');
                            
                            // Initialize workflow when starting data analysis stages
                            if (!isWorkflowActive) {
                                try {
                                    console.log('Initializing workflow...');
                                    const template = await initializeWorkflow('data_analysis');
                                    console.log('Workflow initialized, template:', template);
                                    
                                    // Wait a bit for state to update, then check
                                    setTimeout(() => {
                                        const currentState = usePipelineStore.getState();
                                        console.log('Current state after init:', {
                                            currentStage: currentState.currentStage,
                                            isWorkflowActive: currentState.isWorkflowActive,
                                            currentStageId: currentState.currentStageId
                                        });
                                    }, 100);
                                    
                                    // initializeWorkflow already sets the currentStage to the first stage
                                    // No need to call setStage again
                                    if (!template.stages?.[0]?.id) {
                                        console.error('No stages found in template');
                                        // Try fallback to a simple stage
                                        console.log('Using fallback stage progression');
                                        usePipelineStore.getState().setStage('data_loading_and_hypothesis_proposal');
                                    }
                                } catch (error) {
                                    console.error('Failed to initialize workflow:', error);
                                    console.log('Workflow API not available, using fallback stage');
                                    // Create a mock workflow state for development/testing
                                    const mockTemplate = {
                                        stages: [
                                            { id: 'data_loading_and_hypothesis_proposal', name: 'Data Loading & Hypothesis Proposal', steps: [] },
                                            { id: 'exploratory_data_analysis', name: 'Exploratory Data Analysis', steps: [] },
                                            { id: 'data_preprocessing', name: 'Data Preprocessing', steps: [] },
                                            { id: 'model_building', name: 'Model Building', steps: [] },
                                            { id: 'results_interpretation', name: 'Results Interpretation', steps: [] }
                                        ]
                                    };
                                    
                                    // Manually set the state for fallback
                                    const store = usePipelineStore.getState();
                                    usePipelineStore.setState({
                                        isWorkflowActive: true,
                                        workflowTemplate: mockTemplate,
                                        currentStage: 'data_loading_and_hypothesis_proposal',
                                        currentStageId: 'data_loading_and_hypothesis_proposal'
                                    });
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

        // Fallback: If workflow should be active but we don't have the right conditions
        if (isWorkflowActive) {
            return (
                <PipelineStageWrapper
                    stage={currentStage}
                    currentStage={currentStage}
                    isAnimating={isAnimating}
                    animationDirection={animationDirection}
                >
                    <div className="text-center p-8">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">
                            Analysis Stage: {currentStage}
                        </h2>
                        <p className="text-gray-500 mb-4">
                            Backend workflow service is not available. This would normally show the dynamic analysis interface.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p className="text-yellow-800 text-sm">
                                <strong>Development Mode:</strong> The workflow API at localhost:28600 is not running.
                                In production, this would load the appropriate analysis stage.
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                if (workflowTemplate?.stages) {
                                    const currentIndex = workflowTemplate.stages.findIndex(s => s.id === currentStage);
                                    const nextIndex = currentIndex + 1;
                                    if (nextIndex < workflowTemplate.stages.length) {
                                        nextStage(workflowTemplate.stages[nextIndex].id);
                                    }
                                } else {
                                    console.log('Analysis completed');
                                }
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Continue to Next Stage
                        </button>
                    </div>
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