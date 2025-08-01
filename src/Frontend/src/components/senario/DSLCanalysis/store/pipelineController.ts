// pipelineController.ts - TypeScript Version
import { create } from 'zustand';
import { contextSummarizer } from '../utils/contextSummarizer';

// ==============================================
// Types and Interfaces
// ==============================================

export interface PlanningRequest {
    problem_name: string;
    user_goal: string;
    problem_description: string;
    context_description: string;
}

export interface WorkflowStep {
    id: string;
    step_id: string;
    name: string;
    description: string;
    status?: string;
}

export interface WorkflowStage {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    version: string;
    stages: WorkflowStage[];
    analysis: {
        promise: string;
        minimal_workflow: any[];
    };
    execution_strategy: string;
    customization_reason: string;
}

export interface StepResult {
    status: string;
    output?: string;
    error?: string;
    timestamp?: string;
    generated_stages?: any[];
    targetAchieved?: boolean;
    workflowUpdated?: boolean;
    newWorkflow?: WorkflowTemplate;
}

export interface StageResult {
    completedAt: string;
    steps: string[];
    summary: any;
}

export interface AgentThinking {
    agent_name: string;
    timestamp: string;
    activity?: string;
    confidence_level?: number;
    is_milestone?: boolean;
    [key: string]: any;
}

export interface StateMachineRef {
    getState: () => any;
    setState?: (state: any) => void;
}

// ==============================================
// Constants
// ==============================================

export const INITIAL_PIPELINE_STAGES = {
    EMPTY: 'empty',
    PROBLEM_DEFINE: 'problem_define'
} as const;

// Dynamic stages will be loaded from backend
let PIPELINE_STAGES = { ...INITIAL_PIPELINE_STAGES };

// ==============================================
// Store State Interface
// ==============================================

export interface PipelineStoreState {
    // Current stage of the pipeline
    currentStage: string;
    
    // Animation state
    isAnimating: boolean;
    animationDirection: 'next' | 'prev';
    
    // Stage history for back navigation
    stageHistory: string[];
    
    // Data object to store shared data between stages
    stageData: Record<string, any>;
    
    // Frontend stores ALL workflow state (backend is stateless)
    isWorkflowActive: boolean;
    workflowTemplate: WorkflowTemplate | null;
    workflowAnalysis: any;
    
    // Current execution state (stored in frontend)
    currentStageId: string | null;
    currentStepId: string | null;
    currentStepIndex: number;
    completedSteps: string[];
    completedStages: string[];
    stepResults: Record<string, StepResult>;
    stageResults: Record<string, StageResult>;
    
    // Agent thinking state (frontend managed)
    agentThinkingHistory: AgentThinking[];
    currentAgentActivity: any;
    
    // State machine integration
    stateMachine: StateMachineRef | null;
}

export interface PipelineStoreActions {
    // Stage navigation
    setStage: (newStage: string, direction?: 'next' | 'prev') => void;
    prevStage: () => void;
    nextStage: (stage: string) => void;
    
    // Data management
    updateStageData: (data: Record<string, any>) => void;
    resetPipeline: () => void;
    
    // Workflow initialization
    initializeWorkflow: (planningRequest: PlanningRequest) => Promise<WorkflowTemplate>;
    
    // Stage configuration
    getCurrentStageConfig: () => WorkflowStage | null;
    
    // Step and stage management
    updateStepResult: (stepId: string, result: StepResult) => void;
    markStepCompleted: (stepId: string) => void;
    setCurrentStepId: (stepId: string) => void;
    markStageCompleted: (stageId: string) => void;
    
    // Agent thinking management
    addAgentThinking: (agentName: string, thinkingData: Partial<AgentThinking>) => void;
    setCurrentAgentActivity: (activity: any) => void;
    
    // Workflow execution
    executeWorkflowStep: (stepRequest: any) => Promise<any>;
    getNextStepSuggestion: () => Promise<any>;
    getStageTransitionSuggestion: () => Promise<any>;
    validateStepCompletion: (stepId: string) => Promise<any>;
    
    // State checks
    isCurrentStepCompleted: () => boolean;
    isCurrentStageCompleted: () => boolean;
    canAutoAdvanceStep: () => boolean;
    canAutoAdvanceStage: () => boolean;
    
    // Completion state management
    clearCompletedSteps: () => void;
    clearCompletedStages: () => void;
    clearAllCompletionStates: () => void;
    
    // Auto-advance
    getNextStageId: () => string | null;
    autoAdvanceToNextStage: (onComplete?: () => void) => boolean;
    
    // State machine integration notifications
    notifyStepStarted: (stepId: string, stageId?: string) => void;
    notifyStepCompleted: (stepId: string, result?: StepResult) => void;
    notifyStepFailed: (stepId: string, error?: Error | string) => void;
    notifyStageCompleted: (stageId: string) => void;
    
    // State machine setup and integration
    initializeStateMachine: (stateMachine: StateMachineRef) => void;
    executeStepWithStateMachine: (stepId: string, stageId?: string, stepIndex?: number) => Promise<boolean>;
    completeStepWithStateMachine: (stepId: string, result?: StepResult) => boolean;
    failStepWithStateMachine: (stepId: string, error?: Error | string) => boolean;
    completeStageWithStateMachine: (stageId: string) => boolean;
}

export type PipelineStore = PipelineStoreState & PipelineStoreActions;

// ==============================================
// Store Implementation
// ==============================================

const usePipelineStore = create<PipelineStore>((set, get) => ({
    // ==============================================
    // State
    // ==============================================
    currentStage: INITIAL_PIPELINE_STAGES.EMPTY,
    isAnimating: false,
    animationDirection: 'next',
    stageHistory: [],
    stageData: {},
    
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
    currentAgentActivity: null,
    
    stateMachine: null,
    
    // ==============================================
    // Stage Navigation
    // ==============================================
    
    setStage: (newStage: string, direction: 'next' | 'prev' = 'next'): void => {
        const currentStage = get().currentStage;
        
        console.log(`[PipelineStore] setStage called: ${currentStage} -> ${newStage} (direction: ${direction})`);

        // Don't transition to the same stage
        if (newStage === currentStage) {
            console.log('[PipelineStore] Ignoring transition to same stage');
            return;
        }

        console.log('[PipelineStore] Starting stage transition animation...');
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
            console.log(`[PipelineStore] Completing stage transition to: ${newStage}`);
            set({
                currentStage: newStage,
                currentStageId: newStage, // Keep currentStageId in sync
                isAnimating: false
            });
            console.log(`[PipelineStore] Stage transition completed: now at ${newStage}`);
        }, 800); // Match the CSS transition duration
    },

    prevStage: (): void => {
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

    nextStage: (stage: string): void => {
        get().setStage(stage, 'next');
    },

    // ==============================================
    // Data Management
    // ==============================================
    
    updateStageData: (data: Record<string, any>): void => {
        set(state => ({
            stageData: { ...state.stageData, ...data }
        }));
    },

    resetPipeline: (): void => {
        set({
            currentStage: INITIAL_PIPELINE_STAGES.EMPTY,
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

    // ==============================================
    // Workflow Initialization
    // ==============================================
    
    initializeWorkflow: async (planningRequest: PlanningRequest): Promise<WorkflowTemplate> => {
        try {
            console.log('[PipelineStore] Initializing workflow with request:', planningRequest);
            
            // Create comprehensive workflow template with VDS data analysis stages
            const planning: WorkflowTemplate = {
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
                
                console.log('[PipelineStore] Added variables to AI Planning Context:', {
                    problem_name: planningRequest.problem_name,
                    user_goal: planningRequest.user_goal,
                    problem_description: planningRequest.problem_description,
                    context_description: planningRequest.context_description
                });
            } catch (error) {
                console.warn('[PipelineStore] Could not set AI Planning Context variables:', error);
            }

            // Reset state machine to ensure clean start
            const { stateMachine } = get();
            if (stateMachine && stateMachine.getState().reset) {
                stateMachine.getState().reset();
            }

            // Update dynamic stages
            PIPELINE_STAGES = { 
                ...INITIAL_PIPELINE_STAGES, 
                CHAPTER_0_PLANNING: 'chapter_0_planning',
                STAGE_0_DATA_LOADING: 'stage_0_data_loading_and_hypothesis_proposal',
                STAGE_1_DATA_CLEANING: 'stage_1_data_cleaning',
                STAGE_2_EDA: 'stage_2_exploratory_data_analysis'
            };
            
            console.log('[PipelineStore] Workflow initialized successfully:', planning);
            return planning;
        } catch (error) {
            console.error('[PipelineStore] Failed to initialize workflow:', error);
            throw error;
        }
    },

    // ==============================================
    // Stage Configuration
    // ==============================================
    
    getCurrentStageConfig: (): WorkflowStage | null => {
        const state = get();
        if (!state.workflowTemplate || !state.currentStageId) return null;
        
        return state.workflowTemplate.stages?.find(stage => stage.id === state.currentStageId) || null;
    },

    // ==============================================
    // Step and Stage Management
    // ==============================================
    
    updateStepResult: (stepId: string, result: StepResult): void => {
        set(state => ({
            stepResults: {
                ...state.stepResults,
                [stepId]: result
            }
        }));
    },

    markStepCompleted: (stepId: string): void => {
        set(state => ({
            completedSteps: state.completedSteps.includes(stepId) 
                ? state.completedSteps 
                : [...state.completedSteps, stepId]
        }));
    },

    setCurrentStepId: (stepId: string): void => {
        console.log('[PipelineStore] Setting currentStepId to:', stepId);
        set({ currentStepId: stepId });
    },

    markStageCompleted: (stageId: string): void => {
        set(state => {
            // Create stage summary
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

    // ==============================================
    // Agent Thinking Management
    // ==============================================
    
    addAgentThinking: (agentName: string, thinkingData: Partial<AgentThinking>): void => {
        set(state => {
            const newThinking: AgentThinking = {
                agent_name: agentName,
                timestamp: new Date().toISOString(),
                ...thinkingData
            };
            
            // Smart history management - keep key milestones and recent records
            const updatedHistory = [...state.agentThinkingHistory, newThinking];
            
            if (updatedHistory.length > 100) {
                // Keep milestones and high confidence records
                const milestones = updatedHistory.filter(item => 
                    item.is_milestone || (item.confidence_level && item.confidence_level > 0.8)
                );
                // Keep recent records
                const recent = updatedHistory.slice(-50);
                
                // Merge and deduplicate
                const combined = [...milestones, ...recent];
                const unique = combined.filter((item, index, arr) => 
                    arr.findIndex(t => t.timestamp === item.timestamp) === index
                );
                
                return { agentThinkingHistory: unique.slice(-80) };
            }
            
            return { agentThinkingHistory: updatedHistory };
        });
    },

    setCurrentAgentActivity: (activity: any): void => {
        set({ currentAgentActivity: activity });
    },

    // ==============================================
    // Workflow Execution
    // ==============================================
    
    executeWorkflowStep: async (stepRequest: any): Promise<any> => {
        try {
            const state = get();
            
            // For chapter_0_planning, we execute the step directly
            if (state.currentStageId === 'chapter_0_planning') {
                console.log('[PipelineStore] Executing planning step locally:', stepRequest);
                
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
            throw new Error('[PipelineStore] Workflow step execution not implemented for non-planning stages');
        } catch (error) {
            console.error('[PipelineStore] Failed to execute workflow step:', error);
            throw error;
        }
    },

    getNextStepSuggestion: async (): Promise<any> => {
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
            console.error('[PipelineStore] Failed to get next step suggestion:', error);
            throw error;
        }
    },

    getStageTransitionSuggestion: async (): Promise<any> => {
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
            console.error('[PipelineStore] Failed to get stage transition suggestion:', error);
            throw error;
        }
    },

    validateStepCompletion: async (stepId: string): Promise<any> => {
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
            console.error('[PipelineStore] Failed to validate step completion:', error);
            throw error;
        }
    },

    // ==============================================
    // State Checks
    // ==============================================
    
    isCurrentStepCompleted: (): boolean => {
        const state = get();
        return !!state.currentStepId && state.completedSteps.includes(state.currentStepId);
    },

    isCurrentStageCompleted: (): boolean => {
        const state = get();
        return !!state.currentStageId && state.completedStages.includes(state.currentStageId);
    },

    canAutoAdvanceStep: (): boolean => {
        const state = get();
        const stageConfig = state.workflowTemplate?.stages?.find(stage => stage.id === state.currentStageId);
        if (!stageConfig || !state.currentStepId) return false;
        
        const currentStepIndex = stageConfig.steps.findIndex(step => step.step_id === state.currentStepId);
        const hasNextStep = currentStepIndex >= 0 && currentStepIndex < stageConfig.steps.length - 1;
        const currentStepCompleted = state.completedSteps.includes(state.currentStepId);
        
        return hasNextStep && currentStepCompleted;
    },

    canAutoAdvanceStage: (): boolean => {
        const state = get();
        const stageConfig = state.workflowTemplate?.stages?.find(stage => stage.id === state.currentStageId);
        if (!stageConfig || !state.workflowTemplate) return false;
        
        // Check if all steps in current stage are completed
        const allStepsCompleted = stageConfig.steps.every(step => 
            state.completedSteps.includes(step.step_id)
        );
        
        // Check if there's a next stage
        const currentStageIndex = state.workflowTemplate.stages.findIndex(stage => stage.id === state.currentStageId);
        const hasNextStage = currentStageIndex >= 0 && currentStageIndex < state.workflowTemplate.stages.length - 1;
        
        return allStepsCompleted && hasNextStage;
    },

    // ==============================================
    // Completion State Management
    // ==============================================
    
    clearCompletedSteps: (): void => {
        set({ completedSteps: [] });
    },

    clearCompletedStages: (): void => {
        set({ completedStages: [] });
    },

    clearAllCompletionStates: (): void => {
        set({
            completedSteps: [],
            completedStages: [],
            stepResults: {},
            stageResults: {}
        });
    },

    // ==============================================
    // Auto-advance
    // ==============================================
    
    getNextStageId: (): string | null => {
        const state = get();
        if (!state.workflowTemplate || !state.currentStageId) return null;
        
        const currentStageIndex = state.workflowTemplate.stages.findIndex(stage => stage.id === state.currentStageId);
        if (currentStageIndex >= 0 && currentStageIndex < state.workflowTemplate.stages.length - 1) {
            return state.workflowTemplate.stages[currentStageIndex + 1].id;
        }
        return null;
    },

    autoAdvanceToNextStage: (onComplete?: () => void): boolean => {
        const state = get();
        if (!get().canAutoAdvanceStage()) return false;
        
        const nextStageId = get().getNextStageId();
        if (!nextStageId || !state.currentStageId) return false;
        
        // Mark current stage as completed
        get().markStageCompleted(state.currentStageId);
        
        // Call onComplete callback for navigation
        if (onComplete && typeof onComplete === 'function') {
            console.log('[PipelineStore] Auto-advancing to next stage:', nextStageId);
            setTimeout(() => {
                onComplete();
            }, 1000);
        }
        
        return true;
    },

    // ==============================================
    // State Machine Integration Notifications
    // ==============================================
    
    notifyStepStarted: (stepId: string, stageId?: string): void => {
        console.log('[PipelineStore] Step started:', stepId, 'in stage:', stageId);
        get().setCurrentStepId(stepId);
        if (stageId) {
            set({ currentStageId: stageId });
        }
    },

    notifyStepCompleted: (stepId: string, result?: StepResult): void => {
        console.log('[PipelineStore] Step completed:', stepId);
        get().markStepCompleted(stepId);
        if (result) {
            get().updateStepResult(stepId, result);
        }
    },

    notifyStepFailed: (stepId: string, error?: Error | string): void => {
        console.log('[PipelineStore] Step failed:', stepId, error);
        get().updateStepResult(stepId, {
            status: 'failed',
            error: typeof error === 'string' ? error : error?.message || 'Step execution failed',
            timestamp: new Date().toISOString()
        });
    },

    notifyStageCompleted: (stageId: string): void => {
        console.log('[PipelineStore] Stage completed:', stageId);
        get().markStageCompleted(stageId);
    },

    // ==============================================
    // State Machine Setup and Integration
    // ==============================================
    
    initializeStateMachine: (stateMachine: StateMachineRef): void => {
        set({ stateMachine });
        
        // Set up bidirectional communication
        if (stateMachine && stateMachine.getState().setStoreReferences) {
            stateMachine.getState().setStoreReferences(
                null, // Will be set by AI planning store
                { getState: get, setState: set }
            );
        }
    },

    executeStepWithStateMachine: async (stepId: string, stageId?: string, stepIndex?: number): Promise<boolean> => {
        const { stateMachine } = get();
        if (stateMachine && stateMachine.getState().startStep) {
            return stateMachine.getState().startStep(stepId, stageId, stepIndex);
        }
        return false;
    },

    completeStepWithStateMachine: (stepId: string, result?: StepResult): boolean => {
        const { stateMachine } = get();
        if (stateMachine && stateMachine.getState().completeStep) {
            return stateMachine.getState().completeStep(stepId, result);
        }
        return false;
    },

    failStepWithStateMachine: (stepId: string, error?: Error | string): boolean => {
        const { stateMachine } = get();
        if (stateMachine && stateMachine.getState().failStep) {
            return stateMachine.getState().failStep(stepId, error);
        }
        return false;
    },

    completeStageWithStateMachine: (stageId: string): boolean => {
        const { stateMachine } = get();
        if (stateMachine && stateMachine.getState().completeStage) {
            return stateMachine.getState().completeStage(stageId);
        }
        return false;
    }
}));

export {
    usePipelineStore,
    PIPELINE_STAGES
};