// store/preStageStore.js
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { analyzeDatasetStructure } from '../utils/dataAnalysis';

const usePreStageStore = create(
    subscribeWithSelector((set, get) => ({
        currentFile: null,
        isUploading: false,
        csv_file_path: "",
        problem_description: "",
        context_description: "",
        choiceMap: [
        ],
        file_columns: [],
        selectedProblemType: null,
        selectedTarget: null,
        datasetInfo: '',
        dataBackground: '',
        problem_name: '',

        getDataBackground: () => get().dataBackground,
        getCurrentFile: () => get().currentFile,
        getIsUploading: () => get().isUploading,
        setCurrentFile: async (file) => {
            if (get().isUploading) {
                console.warn('Already uploading, cannot set new file');
                return;
            }
            if (file === null) {
                console.warn('File is null, cannot set');
                set({ currentFile: null });
                return;
            }
            set({ currentFile: file, isUploading: true });
            const { columns, metadata } = await analyzeDatasetStructure(file);
            get().setFileColumns(columns);
            get().setDatasetInfo(metadata);
        },

        setFileColumns: (columns) => set({ file_columns: columns }),

        setDataBackground: (background) => set({ dataBackground: background }),

        setDatasetInfo: (info) => set({ datasetInfo: info }),

        getSelectedProblemName: () => get().problem_name,
        getFileColumns: () => get().file_columns,

        getDatasetInfo: () => get().datasetInfo,

        getCurrentChoiceMap: () => get().choiceMap,

        setIsUploading: (value) => set({ isUploading: value }),

        changeIsUploading: () => set((state) => ({ isUploading: !state.isUploading })),

        setCsvFilePath: (path) => set({ csv_file_path: path }),
        setProblemName: (name) => set({ problem_name: name }),
        getProblemName: () => get().problem_name,

        setProblemDescription: (desc) => set({ problem_description: desc }),

        setContextDescription: (desc) => set({ context_description: desc }),

        setSelectedProblem: (target, description, problemName) => set({
            selectedTarget: target,
            problem_description: description,
            problem_name: problemName
        }),


        updateChoiceMap: (choiceMap) => {
            if (choiceMap.length > 0 && Array.isArray(choiceMap)) {
                set({ choiceMap: choiceMap });
            }
        },

        resetStore: () => set({
            currentFile: null,
            isUploading: false,
            csv_file_path: "",
            choiceMap: [],
            problem_description: "",
            context_description: "",
            dataBackground: '',
            problem_name: '',
            file_columns: [],
            selectedProblemType: null,
            selectedTarget: null,
            datasetInfo: '',
        }),
    }))
);

if (import.meta.env.MODE === 'development') {
}

export default usePreStageStore;