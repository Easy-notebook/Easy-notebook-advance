import { create } from 'zustand';

interface WorkflowPanelState {
  // Workflow confirmation state
  showWorkflowConfirm: boolean;
  pendingWorkflowUpdate: any | null;
  workflowUpdated: boolean;
  workflowUpdateCount: number;

  // Step navigation state
  currentSteps: any[];
  currentStepIndex: number;
  stepsLoaded: number[];
  isCompleted: boolean;

  // Tracking state
  isAutoTracking: boolean;
  currentStage: string | null;
  plannedSteps: string[];

  // Actions
  setShowWorkflowConfirm: (show: boolean) => void;
  setPendingWorkflowUpdate: (update: any | null) => void;
  setWorkflowUpdated: (updated: boolean) => void;
  setWorkflowUpdateCount: (count: number) => void;
  incrementWorkflowUpdateCount: () => void;

  setCurrentSteps: (steps: any[]) => void;
  setCurrentStepIndex: (index: number) => void;
  setStepsLoaded: (loaded: number[]) => void;
  setIsCompleted: (completed: boolean) => void;

  // Tracking actions
  setAutoTracking: (tracking: boolean) => void;
  toggleAutoTracking: () => void;
  setCurrentStage: (stage: string | null) => void;
  setPlannedSteps: (steps: string[]) => void;

  // Event handlers
  onConfirmWorkflowUpdate: (() => void) | null;
  onRejectWorkflowUpdate: (() => void) | null;
  onNavigateToStep: ((stepIndex: number) => void) | null;

  setOnConfirmWorkflowUpdate: (handler: (() => void) | null) => void;
  setOnRejectWorkflowUpdate: (handler: (() => void) | null) => void;
  setOnNavigateToStep: (handler: ((stepIndex: number) => void) | null) => void;

  // Utility methods
  confirmWorkflowUpdate: () => void;
  rejectWorkflowUpdate: () => void;
  navigateToStep: (stepIndex: number) => void;

  // Reset function
  reset: () => void;
}

const initialState = {
  showWorkflowConfirm: false,
  pendingWorkflowUpdate: null,
  workflowUpdated: false,
  workflowUpdateCount: 0,

  currentSteps: [],
  currentStepIndex: 0,
  stepsLoaded: [],
  isCompleted: false,

  // Tracking initial state
  isAutoTracking: true,
  currentStage: null,
  plannedSteps: [],

  onConfirmWorkflowUpdate: null,
  onRejectWorkflowUpdate: null,
  onNavigateToStep: null,
};

export const useWorkflowPanelStore = create<WorkflowPanelState>((set, get) => ({
  ...initialState,

  // Basic setters
  setShowWorkflowConfirm: (showWorkflowConfirm) => set({ showWorkflowConfirm }),
  setPendingWorkflowUpdate: (pendingWorkflowUpdate) => set({ pendingWorkflowUpdate }),
  setWorkflowUpdated: (workflowUpdated) => set({ workflowUpdated }),
  setWorkflowUpdateCount: (workflowUpdateCount) => set({ workflowUpdateCount }),
  incrementWorkflowUpdateCount: () => set((state) => ({ workflowUpdateCount: state.workflowUpdateCount + 1 })),

  setCurrentSteps: (currentSteps) => set({ currentSteps }),
  setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
  setStepsLoaded: (stepsLoaded) => set({ stepsLoaded }),
  setIsCompleted: (isCompleted) => set({ isCompleted }),

  // Tracking setters
  setAutoTracking: (isAutoTracking) => set({ isAutoTracking }),
  toggleAutoTracking: () => set((state) => ({ isAutoTracking: !state.isAutoTracking })),
  setCurrentStage: (currentStage) => set({ currentStage }),
  setPlannedSteps: (plannedSteps) => set({ plannedSteps }),

  // Event handler setters
  setOnConfirmWorkflowUpdate: (onConfirmWorkflowUpdate) => set({ onConfirmWorkflowUpdate }),
  setOnRejectWorkflowUpdate: (onRejectWorkflowUpdate) => set({ onRejectWorkflowUpdate }),
  setOnNavigateToStep: (onNavigateToStep) => set({ onNavigateToStep }),

  // Utility methods that delegate to the handlers
  confirmWorkflowUpdate: () => {
    const { onConfirmWorkflowUpdate } = get();
    if (onConfirmWorkflowUpdate) {
      onConfirmWorkflowUpdate();
    }
  },

  rejectWorkflowUpdate: () => {
    const { onRejectWorkflowUpdate } = get();
    if (onRejectWorkflowUpdate) {
      onRejectWorkflowUpdate();
    }
  },

  navigateToStep: (stepIndex: number) => {
    const { onNavigateToStep } = get();
    if (onNavigateToStep) {
      onNavigateToStep(stepIndex);
    }
  },

  // Reset function
  reset: () => set(initialState),
}));