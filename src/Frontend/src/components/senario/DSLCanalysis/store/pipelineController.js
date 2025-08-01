// pipelineController.js
import { create } from 'zustand';
import { contextSummarizer } from '../utils/contextSummarizer';

// Define initial pipeline stages (will be updated dynamically from backend)
const INITIAL_PIPELINE_STAGES = {
    EMPTY: 'empty',                    // Initial empty state
    PROBLEM_DEFINE: 'problem_define'   // Problem define stage
};

// Dynamic stages will be loaded from backend
let PIPELINE_STAGES = { ...INITIAL_PIPELINE_STAGES };

// Create a Zustand store for managing pipeline state
const usePipelineStore = create((set, get) => ({
    // Current stage of the pipeline
    currentStage: PIPELINE_STAGES.EMPTY,

    // Animation state
    isAnimating: false,
    animationDirection: 'next', // 'next' for forward, 'prev' for backward

    // Stage history for back navigation
    stageHistory: [],

    // Data object to store shared data between stages
    stageData: {},

    // Frontend stores ALL workflow state (backend is stateless)
    isWorkflowActive: false,
    workflowTemplate: null,
    workflowAnalysis: null, // Store workflow analysis from planning
    
    // Current execution state (stored in frontend)
    currentStageId: null,
    currentStepId: null,
    currentStepIndex: 0,
    completedSteps: [],
    completedStages: [],
    stepResults: {},
    stageResults: {},
    
    // Agent thinking state (frontend managed)
    agentThinkingHistory: [],
    currentAgentActivity: null,
    
    // State machine integration
    stateMachine: null,

    // Set the current stage with animation
    setStage: (newStage, direction = 'next') => {
        const currentStage = get().currentStage;
        
        console.log(`setStage called: ${currentStage} -> ${newStage} (direction: ${direction})`);

        // Don't transition to the same stage
        if (newStage === currentStage) {
            console.log('Ignoring transition to same stage');
            return;
        }

        console.log('Starting stage transition animation...');
        // Start animation
        set({
            isAnimating: true,
            animationDirection: direction
        });

        // Update history if moving forward
        if (direction === 'next') {
            set(state => ({
                stageHistory: [...state.stageHistory, currentStage]
            }));
        }

        // After animation duration, update the actual stage
        setTimeout(() => {
            console.log(`Completing stage transition to: ${newStage}`);
            set({
                currentStage: newStage,
                currentStageId: newStage, // Keep currentStageId in sync
                isAnimating: false
            });
            console.log(`Stage transition completed: now at ${newStage}`);
        }, 800); // Match the CSS transition duration
    },

    // Go to previous stage using history
    prevStage: () => {
        const { stageHistory } = get();
        if (stageHistory.length === 0) return;

        // Get the last stage from history
        const prevStage = stageHistory[stageHistory.length - 1];

        // Update stage and remove the last item from history
        set({
            isAnimating: true,
            animationDirection: 'prev'
        });

        setTimeout(() => {
            set(state => ({
                currentStage: prevStage,
                stageHistory: state.stageHistory.slice(0, -1),
                isAnimating: false
            }));
        }, 800);
    },

    nextStage: (stage) => {
        get().setStage(stage, 'next');
    },

    // Update stage data
    updateStageData: (data) => {
        set(state => ({
            stageData: { ...state.stageData, ...data }
        }));
    },

    // Clear all data and return to empty state
    resetPipeline: () => {
        set({
            currentStage: PIPELINE_STAGES.EMPTY,
            stageHistory: [],
            stageData: {},
            isAnimating: false,
            isWorkflowActive: false,
            workflowTemplate: null,
            workflowAnalysis: null,
            currentStageId: null,
            currentStepId: null,
            currentStepIndex: 0,
            completedSteps: [],
            completedStages: [],
            stepResults: {},
            stageResults: {},
            agentThinkingHistory: [],
            currentAgentActivity: null
        });
    },

    // Initialize workflow with full VDS data analysis pipeline
    initializeWorkflow: async (planningRequest) => {
        try {
            // Create comprehensive workflow template with VDS data analysis stages
            const planning = {
                id: "vds_agents_data_analysis_workflow",
                name: "VDS Data Analysis Workflow",
                description: "Complete data science workflow using VDS principles",
                version: "2.0",
                stages: [
                    {
                        id: 'chapter_0_planning',
                        name: 'Workflow Planning',
                        description: 'PCS agent designs customized workflow based on user goals',
                        steps: [
                            {
                                id: 'section_1_design_workflow',
                                step_id: 'section_1_design_workflow',
                                name: 'Design Workflow',
                                description: 'Analyze user goals and design optimal workflow using existence first principles'
                            }
                        ]
                    },
                ],
                analysis: {
                    promise: "",
                    minimal_workflow: []
                },
                execution_strategy: "sequential",
                customization_reason: "Full VDS data analysis pipeline"
            };
            
            set({
                isWorkflowActive: true,
                workflowTemplate: planning,
                currentStageId: 'chapter_0_planning',
                currentStage: 'chapter_0_planning',
                workflowAnalysis: planning.analysis,
                // Reset completion states to ensure steps execute properly
                completedSteps: [],
                completedStages: [],
                stepResults: {},
                stageResults: {}
            });

            // Set required variables in AI Planning Context
            try {
                const { useAIPlanningContextStore } = await import('./aiPlanningContext');
                const aiPlanningStore = useAIPlanningContextStore.getState();
                
                // Add planning request variables to context
                aiPlanningStore.addVariable('problem_name', planningRequest.problem_name);
                aiPlanningStore.addVariable('user_goal', planningRequest.user_goal);
                aiPlanningStore.addVariable('problem_description', planningRequest.problem_description);
                aiPlanningStore.addVariable('context_description', planningRequest.context_description);
                
                console.log('[Pipeline] Added variables to AI Planning Context:', {
                    problem_name: planningRequest.problem_name,
                    user_goal: planningRequest.user_goal,
                    problem_description: planningRequest.problem_description,
                    context_description: planningRequest.context_description
                });
            } catch (error) {
                console.warn('[Pipeline] Could not set AI Planning Context variables:', error);
            }

            // Reset state machine to ensure clean start
            const { stateMachine } = get();
            if (stateMachine) {
                stateMachine.getState().reset();
            }

            // Reset AI Planning Context will be handled by WorkflowControl initialization

            // Update dynamic stages
            PIPELINE_STAGES = { 
                ...INITIAL_PIPELINE_STAGES, 
                CHAPTER_0_PLANNING: 'chapter_0_planning',
                STAGE_0_DATA_LOADING: 'stage_0_data_loading_and_hypothesis_proposal',
                STAGE_1_DATA_CLEANING: 'stage_1_data_cleaning',
                STAGE_2_EDA: 'stage_2_exploratory_data_analysis'
            };
            
            return planning;
        } catch (error) {
            console.error('Failed to initialize workflow:', error);
            throw error;
        }
    },

    // Get current stage configuration from loaded template
    getCurrentStageConfig: () => {
        const state = get();
        if (!state.workflowTemplate || !state.currentStageId) return null;
        
        return state.workflowTemplate.stages?.find(stage => stage.id === state.currentStageId) || null;
    },

    // Update step results (frontend state)
    updateStepResult: (stepId, result) => {
        set(state => ({
            stepResults: {
                ...state.stepResults,
                [stepId]: result
            }
        }));
    },

    // Mark step as completed (frontend state)
    markStepCompleted: (stepId) => {
        set(state => ({
            completedSteps: state.completedSteps.includes(stepId) 
                ? state.completedSteps 
                : [...state.completedSteps, stepId]
        }));
    },

    // Set current step ID (frontend state)
    setCurrentStepId: (stepId) => {
        console.log('PipelineStore: Setting currentStepId to:', stepId);
        set({ currentStepId: stepId });
    },

    // Mark stage as completed (frontend state)
    markStageCompleted: (stageId) => {
        set(state => {
            // 创建阶段总结
            const stageSummary = contextSummarizer.createStageSummary(
                stageId,
                state.stepResults,
                state.agentThinkingHistory
            );
            
            return {
                completedStages: state.completedStages.includes(stageId) 
                    ? state.completedStages 
                    : [...state.completedStages, stageId],
                stageResults: {
                    ...state.stageResults,
                    [stageId]: {
                        completedAt: new Date().toISOString(),
                        steps: state.completedSteps,
                        summary: stageSummary
                    }
                }
            };
        });
    },

    // Add agent thinking record (frontend state)
    addAgentThinking: (agentName, thinkingData) => {
        set(state => {
            const newThinking = {
                agent_name: agentName,
                timestamp: new Date().toISOString(),
                ...thinkingData
            };
            
            // 智能历史管理 - 保留关键里程碑和最近记录
            const updatedHistory = [...state.agentThinkingHistory, newThinking];
            
            if (updatedHistory.length > 100) {
                // 保留里程碑和高置信度记录
                const milestones = updatedHistory.filter(item => 
                    item.is_milestone || item.confidence_level > 0.8
                );
                // 保留最近的记录
                const recent = updatedHistory.slice(-50);
                
                // 合并并去重
                const combined = [...milestones, ...recent];
                const unique = combined.filter((item, index, arr) => 
                    arr.findIndex(t => t.timestamp === item.timestamp) === index
                );
                
                return { agentThinkingHistory: unique.slice(-80) };
            }
            
            return { agentThinkingHistory: updatedHistory };
        });
    },

    // Set current agent activity (frontend state)
    setCurrentAgentActivity: (activity) => {
        set({ currentAgentActivity: activity });
    },

    // Execute workflow step (local frontend execution for planning stage)
    executeWorkflowStep: async (stepRequest) => {
        try {
            const state = get();
            
            // For chapter_0_planning, we execute the step directly
            if (state.currentStageId === 'chapter_0_planning') {
                console.log('Executing planning step locally:', stepRequest);
                
                // Simulate step execution result for planning stage
                const result = {
                    step_result: {
                        status: 'completed',
                        output: 'Workflow planning completed',
                        generated_stages: stepRequest.generated_stages || []
                    },
                    agent_thinking: {
                        agent_name: 'PCS Agent',
                        activity: 'Planning workflow based on user goals',
                        confidence_level: 0.95
                    }
                };
                
                // Update frontend state based on result
                if (result.step_result) {
                    get().updateStepResult(stepRequest.step_id, result.step_result);
                }

                // Handle agent thinking updates
                if (result.agent_thinking) {
                    get().addAgentThinking(result.agent_thinking.agent_name, result.agent_thinking);
                }

                return result;
            }
            
            // For other stages, we would need to implement actual execution
            throw new Error('Workflow step execution not implemented for non-planning stages');
        } catch (error) {
            console.error('Failed to execute workflow step:', error);
            throw error;
        }
    },

    // Get next step suggestion (frontend logic for planning stage)
    getNextStepSuggestion: async () => {
        try {
            const state = get();
            
            // For planning stage, suggest completion
            if (state.currentStageId === 'chapter_0_planning') {
                return {
                    should_proceed: true,
                    next_step: null,
                    message: 'Planning stage completed, ready to execute planned workflow'
                };
            }
            
            return {
                should_proceed: false,
                next_step: null,
                message: 'No next step suggestion available'
            };
        } catch (error) {
            console.error('Failed to get next step suggestion:', error);
            throw error;
        }
    },

    // Get stage transition suggestion (frontend logic)
    getStageTransitionSuggestion: async () => {
        try {
            const state = get();
            
            // For planning stage, suggest transition to actual data analysis stages
            if (state.currentStageId === 'chapter_0_planning') {
                return {
                    should_proceed: true,
                    next_stage: 'chapter_1_data_existence_establishment',
                    next_stage_name: 'Data Existence Establishment',
                    message: 'Planning completed, ready to start data analysis workflow',
                    confidence: 0.95
                };
            }
            
            return {
                should_proceed: false,
                next_stage: null,
                message: 'Stage transition not available'
            };
        } catch (error) {
            console.error('Failed to get stage transition suggestion:', error);
            throw error;
        }
    },

    // Validate step completion (frontend logic)
    validateStepCompletion: async (stepId) => {
        try {
            const state = get();
            
            // Simple validation - check if step has results
            const hasResults = state.stepResults[stepId] !== undefined;
            
            return {
                step_completed: hasResults,
                stage_completed: hasResults && state.currentStageId === 'chapter_0_planning',
                confidence: hasResults ? 1.0 : 0.0,
                message: hasResults ? 'Step completed successfully' : 'Step needs completion'
            };
        } catch (error) {
            console.error('Failed to validate step completion:', error);
            throw error;
        }
    },

    // Check if current step is completed
    isCurrentStepCompleted: () => {
        const state = get();
        return state.completedSteps.includes(state.currentStepId);
    },

    // Check if current stage is completed
    isCurrentStageCompleted: () => {
        const state = get();
        return state.completedStages.includes(state.currentStageId);
    },

    // Check if can auto-advance to next step
    canAutoAdvanceStep: () => {
        const state = get();
        const stageConfig = state.workflowTemplate?.stages?.find(stage => stage.id === state.currentStageId);
        if (!stageConfig) return false;
        
        const currentStepIndex = stageConfig.steps.findIndex(step => step.step_id === state.currentStepId);
        const hasNextStep = currentStepIndex >= 0 && currentStepIndex < stageConfig.steps.length - 1;
        const currentStepCompleted = state.completedSteps.includes(state.currentStepId);
        
        return hasNextStep && currentStepCompleted;
    },

    // Clear completion states
    clearCompletedSteps: () => {
        set({ completedSteps: [] });
    },

    clearCompletedStages: () => {
        set({ completedStages: [] });
    },

    clearAllCompletionStates: () => {
        set({
            completedSteps: [],
            completedStages: [],
            stepResults: {},
            stageResults: {}
        });
    },

    // Check if can auto-advance to next stage
    canAutoAdvanceStage: () => {
        const state = get();
        const stageConfig = state.workflowTemplate?.stages?.find(stage => stage.id === state.currentStageId);
        if (!stageConfig) return false;
        
        // Check if all steps in current stage are completed
        const allStepsCompleted = stageConfig.steps.every(step => 
            state.completedSteps.includes(step.step_id)
        );
        
        // Check if there's a next stage
        const currentStageIndex = state.workflowTemplate.stages.findIndex(stage => stage.id === state.currentStageId);
        const hasNextStage = currentStageIndex >= 0 && currentStageIndex < state.workflowTemplate.stages.length - 1;
        
        return allStepsCompleted && hasNextStage;
    },

    // Get next stage ID
    getNextStageId: () => {
        const state = get();
        if (!state.workflowTemplate) return null;
        
        const currentStageIndex = state.workflowTemplate.stages.findIndex(stage => stage.id === state.currentStageId);
        if (currentStageIndex >= 0 && currentStageIndex < state.workflowTemplate.stages.length - 1) {
            return state.workflowTemplate.stages[currentStageIndex + 1].id;
        }
        return null;
    },

    // Auto-advance to next stage (integrated logic)
    autoAdvanceToNextStage: (onComplete) => {
        const state = get();
        if (!get().canAutoAdvanceStage()) return false;
        
        const nextStageId = get().getNextStageId();
        if (!nextStageId) return false;
        
        // Mark current stage as completed
        get().markStageCompleted(state.currentStageId);
        
        // Call onComplete callback for navigation
        if (onComplete && typeof onComplete === 'function') {
            console.log('Pipeline: Auto-advancing to next stage:', nextStageId);
            setTimeout(() => {
                onComplete();
            }, 1000);
        }
        
        return true;
    },

    // State machine integration methods
    notifyStepStarted: (stepId, stageId) => {
        console.log('Pipeline: Step started:', stepId, 'in stage:', stageId);
        get().setCurrentStepId(stepId);
        if (stageId) {
            set({ currentStageId: stageId });
        }
    },

    notifyStepCompleted: (stepId, result) => {
        console.log('Pipeline: Step completed:', stepId);
        get().markStepCompleted(stepId);
        if (result) {
            get().updateStepResult(stepId, result);
        }
    },

    notifyStepFailed: (stepId, error) => {
        console.log('Pipeline: Step failed:', stepId, error);
        get().updateStepResult(stepId, {
            status: 'failed',
            error: error?.message || 'Step execution failed',
            timestamp: new Date().toISOString()
        });
    },

    notifyStageCompleted: (stageId) => {
        console.log('Pipeline: Stage completed:', stageId);
        get().markStageCompleted(stageId);
    },

    // Enhanced workflow management with state machine support
    initializeStateMachine: (stateMachine) => {
        set({ stateMachine });
        
        // Set up bidirectional communication
        if (stateMachine) {
            stateMachine.getState().setStoreReferences(
                null, // Will be set by AI planning store
                { getState: get }
            );
        }
    },

    // Workflow execution methods that integrate with state machine
    executeStepWithStateMachine: async (stepId, stageId, stepIndex) => {
        const { stateMachine } = get();
        if (stateMachine) {
            return stateMachine.getState().startStep(stepId, stageId, stepIndex);
        }
        return false;
    },

    completeStepWithStateMachine: (stepId, result) => {
        const { stateMachine } = get();
        if (stateMachine) {
            return stateMachine.getState().completeStep(stepId, result);
        }
        return false;
    },

    failStepWithStateMachine: (stepId, error) => {
        const { stateMachine } = get();
        if (stateMachine) {
            return stateMachine.getState().failStep(stepId, error);
        }
        return false;
    },

    completeStageWithStateMachine: (stageId) => {
        const { stateMachine } = get();
        if (stateMachine) {
            return stateMachine.getState().completeStage(stageId);
        }
        return false;
    },
}));


export {
    usePipelineStore,
    PIPELINE_STAGES
};