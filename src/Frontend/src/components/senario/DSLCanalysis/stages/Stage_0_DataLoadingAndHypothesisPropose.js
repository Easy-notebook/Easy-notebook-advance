const dataLoadingAndHypothesisProposalConfig = {
    stageId: 'data-loading-and-hypothesis-proposal',
    stageTitle: 'Data Loading and Hypothesis Propose',
    initialVariables: {
    },
    initialChecklist: {
        todo: [],
        done: []
    },
    steps: [
        {
            id: 'step0',
            title: 'Stage Introduction',
            stepId: 'data-loading-and-hypothesis-proposal-step0',
        },
        {
            id: 'step1',
            title: 'Date Preview',
            stepId: 'data-loading-and-hypothesis-proposal-step1',
        },
        {
            id: 'step2',
            title: 'Variable Describe',
            description: 'Load and preliminary check the dataset',
            stepId: 'data-loading-and-hypothesis-proposal-step2',
        },
        {
            id: 'step3',
            title: 'Analysis of the observation unit',
            description: 'Identify data issues and cleaning requirements',
            stepId: 'data-loading-and-hypothesis-proposal-step3',
        },
        {
            id: 'step4',
            title: 'Variable Relevance Analysis',
            stepId: 'data-loading-and-hypothesis-proposal-step4',
        },
        {
            id: 'step5',
            title: 'Hypothesis Propose',
            stepId: 'data-loading-and-hypothesis-proposal-step5',
        }
    ]
};

export default dataLoadingAndHypothesisProposalConfig;