const dataCleaningConfig = {
  stageId: 'data-cleaning',
  stageTitle: 'Data Cleaning',
  initialVariables: {
  },
  initialChecklist: {
    todo: [],
    done: []
  },
  steps: [
    {
      "id": "step0",
      "title": "Stage Introduction",
      "description": "Understand the goal and steps of data cleaning",
      "stepId": "data-cleaning-step0"
    },
    {
      "id": "step1",
      "title": "Dimension Analysis",
      "description": "Check the data source and field description",
      "stepId": "data-cleaning-step1"
    },
    {
      "id": "step2",
      "title": "Invalid Value Analysis",
      "description": "Check for invalid values in the data",
      "stepId": "data-cleaning-step2"
    },
    {
      "id": "step3",
      "title": "Missing Value Analysis",
      "description": "Analyze missing values in the data",
      "stepId": "data-cleaning-step3"
    },
    {
      "id": "step4",
      "title": "Data Integrity Analysis",
      "description": "Analyze the integrity of the data",
      "stepId": "data-cleaning-step4"
    }
  ]
};

export default dataCleaningConfig;