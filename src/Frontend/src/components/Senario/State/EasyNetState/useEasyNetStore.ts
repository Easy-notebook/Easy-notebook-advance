import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GraphData } from './types';

interface EasyNetStore {
  currentGraph: GraphData | null;
  savedGraphs: GraphData[];

  // Actions
  saveGraph: (name: string, description: string, data: any) => void;
  loadGraph: (id: string) => void;
  deleteGraph: (id: string) => void;
  createNewGraph: () => void;
  updateCurrentGraph: (data: any) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useEasyNetStore = create<EasyNetStore>()(
  persist(
    (set, get) => ({
      currentGraph: null,
      savedGraphs: [],

      saveGraph: (name: string, description: string, data: any) => {
        const { currentGraph, savedGraphs } = get();
        const now = new Date();

        if (currentGraph) {
          // Update existing graph
          const updatedGraph: GraphData = {
            ...currentGraph,
            name,
            description,
            data,
            lastModified: now,
          };

          set({
            currentGraph: updatedGraph,
            savedGraphs: savedGraphs.map(graph =>
              graph.id === currentGraph.id ? updatedGraph : graph
            ),
          });
        } else {
          // Create new graph
          const newGraph: GraphData = {
            id: generateId(),
            name,
            description,
            data,
            lastModified: now,
          };

          set({
            currentGraph: newGraph,
            savedGraphs: [...savedGraphs, newGraph],
          });
        }
      },

      loadGraph: (id: string) => {
        const { savedGraphs } = get();
        const graph = savedGraphs.find(g => g.id === id);
        if (graph) {
          set({ currentGraph: graph });
        }
      },

      deleteGraph: (id: string) => {
        const { currentGraph, savedGraphs } = get();
        const updatedGraphs = savedGraphs.filter(g => g.id !== id);

        set({
          savedGraphs: updatedGraphs,
          currentGraph: currentGraph?.id === id ? null : currentGraph,
        });
      },

      createNewGraph: () => {
        set({ currentGraph: null });
      },

      updateCurrentGraph: (data: any) => {
        const { currentGraph } = get();
        if (currentGraph) {
          const updatedGraph: GraphData = {
            ...currentGraph,
            data,
            lastModified: new Date(),
          };
          set({ currentGraph: updatedGraph });
        }
      },
    }),
    {
      name: 'easynet-graphs-storage',
      partialize: (state) => ({
        savedGraphs: state.savedGraphs,
        currentGraph: state.currentGraph,
      }),
    }
  )
);