const EDAConfig = {
  stageId: 'exploratory-data-analysis',
  stageTitle: 'Exploratory Data Analysis',
  initialVariables: {
  },
  initialChecklist: {
    todo: [],
    done: []
  },
  steps: [
    {
      id: "step0",
      title: "Stage Introduction",
      description: "Understand the goal and steps of data cleaning",
      stepId: "exploratory-data-analysis-step0"
    },
    
    {
      id: 'step1',
      title: 'Date Preview',
      stepId: 'exploratory-data-analysis-step1',
  },
    {
      id: "step2",
      title: "EDA Problem Define",
      description: "Define the problem of EDA",
      stepId: "exploratory-data-analysis-step2"
    },
    {
      id: "step3",
      title: "Solve The Problem",
      description: "Solve the problem of EDA",
      stepId: "exploratory-data-analysis-step3"
    }
  ]
};

export default EDAConfig;