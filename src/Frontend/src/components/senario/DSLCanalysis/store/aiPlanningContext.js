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

    setChecklist: (current, completed) => set({ checklist: { current, completed } }),

    addToDoList: (item) => {
        set({ toDoList: [...get().toDoList, item] });
    },

    newChecklistCurrentItem: (item) => {
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
        const updatedHistory = [...history, ...currentEffect];

        set({
            effect: {
                current: [effect],
                history: updatedHistory
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
