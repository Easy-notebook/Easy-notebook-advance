import { create } from 'zustand';

interface WorkflowControlState {
  // State
  isGenerating: boolean;
  isCompleted: boolean;
  continueCountdown: number;
  isReturnVisit: boolean;
  continueButtonText: string;
  
  // Actions
  setIsGenerating: (isGenerating: boolean) => void;
  setIsCompleted: (isCompleted: boolean) => void;
  setContinueCountdown: (countdown: number) => void;
  setIsReturnVisit: (isReturnVisit: boolean) => void;
  setContinueButtonText: (text: string) => void;
  
  // Event handlers
  onTerminate: (() => void) | null;
  onContinue: (() => void) | null;
  onCancelCountdown: (() => void) | null;
  
  setOnTerminate: (handler: (() => void) | null) => void;
  setOnContinue: (handler: (() => void) | null) => void;
  setOnCancelCountdown: (handler: (() => void) | null) => void;
  
  // Reset function
  reset: () => void;
  hardReset: () => void;
}

const initialState = {
  isGenerating: false,
  isCompleted: false,
  continueCountdown: 0,
  isReturnVisit: false,
  continueButtonText: 'Continue to Next Stage',
  onTerminate: null,
  onContinue: null,
  onCancelCountdown: null,
};

export const useWorkflowControlStore = create<WorkflowControlState>((set) => ({
  ...initialState,
  
  // State setters - simplified without get() calls
  setIsGenerating: (isGenerating) => set((state) => {
    if (state.isGenerating !== isGenerating) {
      return { isGenerating };
    }
    return state;
  }),
  setIsCompleted: (isCompleted) => set((state) => {
    if (state.isCompleted !== isCompleted) {
      return { isCompleted };
    }
    return state;
  }),
  setContinueCountdown: (continueCountdown) => set((state) => {
    if (state.continueCountdown !== continueCountdown) {
      return { continueCountdown };
    }
    return state;
  }),
  setIsReturnVisit: (isReturnVisit) => set((state) => {
    if (state.isReturnVisit !== isReturnVisit) {
      return { isReturnVisit };
    }
    return state;
  }),
  setContinueButtonText: (continueButtonText) => set((state) => {
    if (state.continueButtonText !== continueButtonText) {
      return { continueButtonText };
    }
    return state;
  }),
  
  // Event handler setters - only update if different
  setOnTerminate: (onTerminate) => set((state) => {
    if (state.onTerminate !== onTerminate) {
      console.log('setOnTerminate called:', !!onTerminate);
      return { onTerminate };
    }
    return state;
  }),
  setOnContinue: (onContinue) => set((state) => {
    if (state.onContinue !== onContinue) {
      console.log('setOnContinue called:', !!onContinue);
      return { onContinue };
    }
    return state;
  }),
  setOnCancelCountdown: (onCancelCountdown) => set((state) => {
    if (state.onCancelCountdown !== onCancelCountdown) {
      console.log('setOnCancelCountdown called:', !!onCancelCountdown);
      return { onCancelCountdown };
    }
    return state;
  }),
  
  // Reset function - simplified
  reset: () => set(initialState),
  
  // Hard reset - completely reset everything  
  hardReset: () => set(initialState),
}));