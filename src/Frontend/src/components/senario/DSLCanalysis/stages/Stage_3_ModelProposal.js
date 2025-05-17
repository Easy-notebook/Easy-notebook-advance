const ModelProposalConfig = {
    stageId: 'model-proposal',
    stageTitle: 'Model Proposal',
    initialVariables: {},
    initialChecklist: {
        todo: [],
        done: []
    },
    steps: [
        {
            id: 'step0',
            title: 'Stage Introduction',
            description: 'Understand the goal and steps of model proposal',
            stepId: 'model-proposal-step0'
        },
        {
            id: 'step1',
            title: 'Model Proposal',
            description: 'Propose feature engineering methods and model selection',
            stepId: 'model-proposal-step1'
        }
    ]
};

export default ModelProposalConfig;
