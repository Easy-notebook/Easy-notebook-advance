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
                    {
                        id: 'stage_0_data_loading_and_hypothesis_proposal',
                        name: 'Data Loading & Hypothesis Proposal',
                        description: 'Load and preview data, propose initial hypothesis',
                        steps: [
                            {
                                id: 'step_1_data_preview',
                                step_id: 'step_1_data_preview',
                                name: 'Data Preview',
                                description: 'Load and preview dataset using VDS tools'
                            },
                            {
                                id: 'step_2_hypothesis_proposal',
                                step_id: 'step_2_hypothesis_proposal',
                                name: 'Hypothesis Proposal',
                                description: 'Propose research hypothesis based on data structure'
                            }
                        ]
                    },
                    {
                        id: 'stage_1_data_cleaning',
                        name: 'Data Cleaning',
                        description: 'Clean and preprocess data for analysis',
                        steps: [
                            {
                                id: 'step_1_missing_values',
                                step_id: 'step_1_missing_values',
                                name: 'Handle Missing Values',
                                description: 'Detect and handle missing values in dataset'
                            },
                            {
                                id: 'step_2_outlier_detection',
                                step_id: 'step_2_outlier_detection',
                                name: 'Outlier Detection',
                                description: 'Identify and handle outliers'
                            }
                        ]
                    },
                    {
                        id: 'stage_2_exploratory_data_analysis',
                        name: 'Exploratory Data Analysis',
                        description: 'Comprehensive EDA to understand data patterns',
                        steps: [
                            {
                                id: 'step_1_descriptive_statistics',
                                step_id: 'step_1_descriptive_statistics',
                                name: 'Descriptive Statistics',
                                description: 'Generate comprehensive descriptive statistics'
                            },
                            {
                                id: 'step_2_correlation_analysis',
                                step_id: 'step_2_correlation_analysis',
                                name: 'Correlation Analysis',
                                description: 'Analyze relationships between variables'
                            }
                        ]
                    }
                ],
                analysis: {
                    promise: "Complete data analysis workflow from data loading to insights",
                    minimal_workflow: ["Planning", "Data Loading", "Data Cleaning", "EDA"]
                },
                execution_strategy: "sequential",
                customization_reason: "Full VDS data analysis pipeline"
            };
            
            set({
                isWorkflowActive: true,
                workflowTemplate: planning,
                currentStageId: 'chapter_0_planning',
                currentStage: 'chapter_0_planning',
                workflowAnalysis: planning.analysis
            });

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
}));


export {
    usePipelineStore,
    PIPELINE_STAGES
};