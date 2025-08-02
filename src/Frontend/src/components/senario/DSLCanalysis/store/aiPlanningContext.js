/**
 * AI Planning Context Store
 * 
 * This module provides a global state management for AI planning features
 * using Zustand. It manages checklists, plans, effects, thinking logs,
 * stage status, variables, and to-do lists.
 * 
 * @author Hu Silan
 * @project Easy-notebook
 * @file aiPlanningContext.js
 */
import { create } from 'zustand';

export const useAIPlanningContextStore = create((set, get) => ({
    // reaction from the environment or other tools
    effect: {
        current: [],
        history: [],
    },
    stageStatus: {},
    // memory of agents
    thinking: [],
    variables: {},

    // agent planning and execution schedule 
    toDoList: [],
    checklist: {
        current: [],
        completed: [],
    },

    // Context backup
    backup: {
        lastStage: {},
        lastStep: {},
        cache: {}
    },

    isCurStepCompleted: () => {
        const { toDoList } = get();
        return toDoList.length === 0;
    },

    // Check if stage can auto-advance to next step
    canAutoAdvanceToNextStep: () => {
        const { toDoList } = get();
        return toDoList.length === 0;
    },

    // Check if stage can auto-advance to next stage
    canAutoAdvanceToNextStage: (stageId) => {
        const { stageStatus } = get();
        // Don't check todoList for stage transitions
        // Stage completion should be based on step completion, not todoList
        return !!stageStatus[stageId];
    },

    // Check if workflow update is confirmed
    isWorkflowUpdateConfirmed: () => {
        // This should be integrated with workflow panel state
        return true; // For now, assume always confirmed
    },

    // State machine integration methods
    notifyStepStarted: (stepId) => {
        console.log('AI Planning: Step started:', stepId);
        // Can add any AI planning specific logic here
    },

    notifyStepCompleted: (stepId, result) => {
        const { toDoList } = get();
        console.log('AI Planning: Step completed:', stepId, 'TodoList length:', toDoList.length);
        
        // Mark step completion if todo list is empty
        if (toDoList.length === 0) {
            set(state => ({
                checklist: {
                    ...state.checklist,
                    completed: [...state.checklist.completed, `step_${stepId}_completed`]
                }
            }));
        }
    },

    notifyStageCompleted: (stageId) => {
        console.log('AI Planning: Stage completed:', stageId);
        get().markStageAsComplete(stageId);
        
        // Clear current context for new stage
        set({
            toDoList: [],
            checklist: { current: [], completed: [] },
            thinking: []
        });
    },

    // Enhanced completion checks for state machine
    isStepReadyForCompletion: (stepId) => {
        const { toDoList, checklist } = get();
        return toDoList.length === 0 && checklist.current.length === 0;
    },

    isStageReadyForCompletion: (stageId) => {
        const { stageStatus, toDoList } = get();
        return toDoList.length === 0 && !!stageStatus[stageId];
    },

    setChecklist: (current, completed) => set({ checklist: { current, completed } }),

    addToDoList: (item) => {
        set({ toDoList: [...get().toDoList, item] });
    },

    addChecklistCurrentItem: (item) => {
        const { checklist } = get();
        if (!checklist.current.includes(item)) {
            set({
                checklist: {
                    ...checklist,
                    current: [...checklist.current, item]
                }
            });
        }
    },

    // Backward compatibility alias
    newChecklistCurrentItem: (item) => get().addChecklistCurrentItem(item),

    addChecklistCompletedItem: (item) => {
        const { checklist } = get();
        if (checklist.current.includes(item)) {
            set({
                checklist: {
                    current: checklist.current.filter(i => i !== item),
                    completed: checklist.completed.includes(item)
                        ? checklist.completed
                        : [...checklist.completed, item],
                }
            });
        }
    },

    setThinking: (thinking) => set({ thinking: thinking || [] }),

    addThinkingLog: (thought) => {
        const { thinking } = get();
        set({ thinking: [...thinking, thought] });
    },

    markStageAsComplete: (stageId) => {
        const { stageStatus } = get();
        set({ stageStatus: { ...stageStatus, [stageId]: true } });
    },

    isStageComplete: (stageId) => {
        const { stageStatus } = get();
        return !!stageStatus[stageId];
    },

    addVariable: (key, value) => {
        set(state => {
            const newVariables = { ...state.variables, [key]: value };
            return { variables: newVariables };
        });
    },

    updateVariable: (key, value) => {
        const { variables } = get();
        set({ variables: { ...variables, [key]: value } });
    },

    getVariable: (key) => {
        return get().variables[key];
    },

    setVariables: (newVariables) => {
        set({ variables: newVariables });
    },

    resetVariables: () => {
        set({ variables: {} });
    },

    resetEffect: () => {
        set({ effect: { current: [], history: [] } });
    },

    setEffect: (newEffect) => {
        set({ effect: newEffect });
    },

    resetAIPlanningContext: () => set({
        checklist: { current: [], completed: [] },
        thinking: [],
        stageStatus: {},
        variables: {},
        toDoList: [],
        effect: { current: [], history: [] },
    }),

    // Clear stage completion status
    clearStageStatus: (stageId) => {
        const { stageStatus } = get();
        set({ 
            stageStatus: { 
                ...stageStatus, 
                [stageId]: false 
            } 
        });
    },

    clearAllStageStatus: () => {
        set({ stageStatus: {} });
    },

    setContext: (state) => set({
        checklist: state.checklist,
        thinking: state.thinking,
        variables: state.variables,
        toDoList: state.toDoList,
        stageStatus: state.stageStatus,
        effect: state.effect,
    }),

    getContext: () => {
        return {
            checklist: get().checklist,
            thinking: get().thinking,
            variables: get().variables,
            toDoList: get().toDoList,
            stageStatus: get().stageStatus,
            effect: get().effect,
        }
    },
    
    addEffect: (effect) => {
        const { effect: { current: currentEffect, history } } = get();
        const updatedCurrent = [...currentEffect, effect];

        set({
            effect: {
                current: updatedCurrent,
                history
            }
        });
    },

    storeCurrentContext2BackupCache: () => {
        set(
            (state) => ({
                backup: {
                    ...state.backup,
                    cache: get().getContext()
                }
            })
        );
    },

    storeCurrentContext2BackupLastStage: () => {
        set(
            (state) => ({
                backup: {
                    ...state.backup,
                    lastStage: get().getContext()
                }
            })
        );
    },

    storeCurrentContext2BackupLastStep: () => {
        set(
            (state) => ({
                backup: {
                    ...state.backup,
                    lastStep: get().getContext()
                }
            })
        );
    },

    loadBackupCache2Context: () => {
        set(
            (state) => ({
                ...state,
                ...get().backup.cache
            })
        );
    },

    loadBackupLastStep2Context: () => {
        set(
            (state) => ({
                ...state,
                ...get().backup.lastStep
            })
        );
    },

    loadBackupLastStage2Context: () => {
        set(
            (state) => ({
                ...state,
                ...get().backup.lastStage
            })
        );
    },

}));
