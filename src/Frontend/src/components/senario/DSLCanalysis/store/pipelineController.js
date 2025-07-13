// pipelineController.js
import { create } from 'zustand';
import workflowAPIClient from '../services/WorkflowAPIClient';

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

    // Set the current stage with animation
    setStage: (newStage, direction = 'next') => {
        const currentStage = get().currentStage;

        // Don't transition to the same stage
        if (newStage === currentStage) return;

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
            set({
                currentStage: newStage,
                currentStageId: newStage, // Keep currentStageId in sync
                isAnimating: false
            });
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

    // Initialize workflow (load template from backend)
    initializeWorkflow: async (templateType = 'data_analysis') => {
        try {
            // Get workflow template from backend (stateless)
            const response = await workflowAPIClient.getWorkflowTemplate(templateType);
            const template = response.template || response; // Handle both response formats
            
            set({
                isWorkflowActive: true,
                workflowTemplate: template,
                currentStageId: template.stages?.[0]?.id || null,
                currentStage: template.stages?.[0]?.id || PIPELINE_STAGES.EMPTY
            });

            // Update dynamic stages based on template
            if (template.stages) {
                const dynamicStages = {};
                template.stages.forEach(stage => {
                    dynamicStages[stage.id.toUpperCase()] = stage.id;
                });
                PIPELINE_STAGES = { ...INITIAL_PIPELINE_STAGES, ...dynamicStages };
            }
            
            return template;
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

    // Mark stage as completed (frontend state)
    markStageCompleted: (stageId) => {
        set(state => ({
            completedStages: state.completedStages.includes(stageId) 
                ? state.completedStages 
                : [...state.completedStages, stageId],
            stageResults: {
                ...state.stageResults,
                [stageId]: {
                    completedAt: new Date().toISOString(),
                    steps: state.completedSteps
                }
            }
        }));
    },

    // Add agent thinking record (frontend state)
    addAgentThinking: (agentName, thinkingData) => {
        set(state => ({
            agentThinkingHistory: [
                ...state.agentThinkingHistory,
                {
                    agent_name: agentName,
                    timestamp: new Date().toISOString(),
                    ...thinkingData
                }
            ].slice(-100) // Keep last 100 records
        }));
    },

    // Set current agent activity (frontend state)
    setCurrentAgentActivity: (activity) => {
        set({ currentAgentActivity: activity });
    },

    // Execute workflow step (stateless - provide all context to backend)
    executeWorkflowStep: async (stepRequest) => {
        try {
            const state = get();
            
            // Prepare full context for stateless backend
            const fullStepRequest = {
                ...stepRequest,
                context: stepRequest.context,
                variables: stepRequest.variables,
                frontend_state: {
                    completed_steps: state.completedSteps,
                    completed_stages: state.completedStages,
                    step_results: state.stepResults,
                    stage_results: state.stageResults,
                    agent_thinking_history: state.agentThinkingHistory,
                    current_stage_id: state.currentStageId,
                    current_step_id: state.currentStepId
                }
            };

            // Execute step via stateless backend
            const result = await workflowAPIClient.executeStep(fullStepRequest);
            
            // Update frontend state based on result
            if (result.step_result) {
                get().updateStepResult(stepRequest.step_id, result.step_result);
            }

            // Handle agent thinking updates
            if (result.agent_thinking) {
                get().addAgentThinking(result.agent_thinking.agent_name, result.agent_thinking);
            }

            return result;
        } catch (error) {
            console.error('Failed to execute workflow step:', error);
            throw error;
        }
    },

    // Get next step suggestion from backend (stateless)
    getNextStepSuggestion: async () => {
        try {
            const state = get();
            
            const currentContext = {
                current_stage: state.currentStageId,
                current_step: state.currentStepId,
                step_results: state.stepResults,
                context: state.stageData,
                variables: state.stageData
            };

            return await workflowAPIClient.getNextStepSuggestion(currentContext);
        } catch (error) {
            console.error('Failed to get next step suggestion:', error);
            throw error;
        }
    },

    // Get stage transition suggestion from backend (stateless)
    getStageTransitionSuggestion: async () => {
        try {
            const state = get();
            
            const currentContext = {
                current_stage: state.currentStageId,
                completed_steps: state.completedSteps,
                context: state.stageData,
                variables: state.stageData,
                stage_results: state.stageResults
            };

            return await workflowAPIClient.getStageTransitionSuggestion(currentContext);
        } catch (error) {
            console.error('Failed to get stage transition suggestion:', error);
            throw error;
        }
    },

    // Validate step completion (stateless)
    validateStepCompletion: async (stepId) => {
        try {
            const state = get();
            
            const validationRequest = {
                stage_id: state.currentStageId,
                step_id: stepId,
                step_results: state.stepResults[stepId],
                context: state.stageData,
                variables: state.stageData
            };

            return await workflowAPIClient.validateStepCompletion(validationRequest);
        } catch (error) {
            console.error('Failed to validate step completion:', error);
            throw error;
        }
    },
}));


export {
    usePipelineStore,
    PIPELINE_STAGES
};