// src/store/routeStore.ts
// Route state management for NotebookApp

import { create } from 'zustand';

export type AppView = 'empty' | 'library' | 'workspace' | 'agent' | 'file-preview';

export interface RouteState {
  currentView: AppView;
  currentNotebookId: string | null;
  currentRoute: string;
  
  // Actions
  setView: (view: AppView) => void;
  setNotebookId: (id: string | null) => void;
  setRoute: (route: string) => void;
  
  // Route helpers
  navigateToEmpty: () => void;
  navigateToLibrary: () => void;
  navigateToWorkspace: (notebookId: string) => void;
}

const useRouteStore = create<RouteState>((set, get) => ({
  currentView: 'empty',
  currentNotebookId: null,
  currentRoute: '/',
  
  setView: (view: AppView) => set({ currentView: view }),
  setNotebookId: (id: string | null) => set({ currentNotebookId: id }),
  setRoute: (route: string) => {
    const state = get();
    set({ currentRoute: route });
    
    // Auto-detect view based on route
    if (route === '/') {
      set({ currentView: 'empty' });
    } else if (route === '/FoKn/Library') {
      set({ currentView: 'library' });
    } else if (route.startsWith('/workspace/')) {
      const notebookId = route.split('/workspace/')[1];
      set({ 
        currentView: 'workspace',
        currentNotebookId: notebookId
      });
    }
  },
  
  navigateToEmpty: () => {
    window.history.pushState(null, '', '/');
    get().setRoute('/');
  },
  
  navigateToLibrary: () => {
    window.history.pushState(null, '', '/FoKn/Library');
    get().setRoute('/FoKn/Library');
  },
  
  navigateToWorkspace: (notebookId: string) => {
    const route = `/workspace/${notebookId}`;
    window.history.pushState(null, '', route);
    get().setRoute(route);
  },
}));

export default useRouteStore;