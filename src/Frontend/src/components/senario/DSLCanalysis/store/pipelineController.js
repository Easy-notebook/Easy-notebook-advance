// pipelineController.js
import { create } from 'zustand';

// Define all pipeline stages
const PIPELINE_STAGES = {
    EMPTY: 'empty',                    // Initial empty state
    PROBLEM_DEFINE: 'problem_define', // Problem define stage
    DATA_LOADING_AND_HYPOTHESIS_PROPOSAL: 'data_loading_and_hypothesis_proposal', // Data loading and hypothesis proposal
    DATA_EXPLORATION: 'data_exploration', // Data exploration stage
    MODEL_PROPOSAL: 'model_proposal', // Model proposal stage
    DATA_CLEANING: 'data_cleaning',    // Data cleaning and preprocessing
    MODEL_EVALUATION: 'model_evaluation', // Evaluating model performance
    RESULTS: 'results'                 // Final results and insights
};

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
            isAnimating: false
        });
    },
}));


export {
    usePipelineStore,
    PIPELINE_STAGES
};