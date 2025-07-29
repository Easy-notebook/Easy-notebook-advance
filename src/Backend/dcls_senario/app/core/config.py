from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

log_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "formatter": "default",
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "app": {"handlers": ["console"], "level": "INFO"},
        "uvicorn": {"handlers": ["console"], "level": "INFO"},
    },
}

DEBUG_MODE = True
DEBUG_DELAY_MULTIPLIER = 10
# 定义操作类型
class SHOT_TYPES:
    DIALOGUE = 'dialogue'     # 对话（文本内容）
    ACTION = 'action'         # 动作（代码描述）
    HYBRID = 'hybrid'         # 混合型镜头
    ATTACHMENT = 'attachment' # 附件（文件相关内容）
    OUTCOME = 'outcome'       # 结果展示
    ERROR = 'error'           # error_message
    THINKING = 'thinking'     # 思考

# 阶段和步骤配置（前后端保持一致）
STAGES = {
    "data_loading_and_hypothesis_proposal": {
            "id": "data_loading_and_hypothesis_proposal",
            "title": "Data Loading and Hypothesis Proposal",
            "description": "Data Loading and Hypothesis Proposal",
            "steps": [
            {
                "id": 'step0',
                "title": 'Stage Introduction',
                "stepId": 'data_loading_and_hypothesis_proposal_step0',
            },
            {
                "id": 'step1',
                "title": 'Data Preview',
                "stepId": 'data_loading_and_hypothesis_proposal_step1',
            },
            {
                "id": 'step2',
                "title": 'Variable Description',
                "description": 'Load and preliminary check the dataset',
                "stepId": 'data_loading_and_hypothesis_proposal_step2',
            },
            {
                "id": 'step3',
                "title": 'Analysis of the Observation Unit',
                "description": 'Identify data issues and cleaning requirements',
                "stepId": 'data_loading_and_hypothesis_proposal_step3',
            },
            {
                "id": 'step4',
                "title": 'Variable Relevance Analysis',
                "stepId": 'data_loading_and_hypothesis_proposal_step4',
            },
            {
                "id": 'step5',
                "title": 'Hypothesis Proposal',
                "stepId": 'data_loading_and_hypothesis_proposal_step5',
            }
        ]
    },
    "data_cleaning": {
        "id": "data_cleaning",
        "title": "Data Cleaning",
        "description": "Clean and preprocess data to prepare for analysis",
        "steps": [
            {
                "id": "step0",
                "title": "Stage Introduction",
                "description": "Understand the goal and steps of data cleaning",
                "stepId": "data_cleaning_step0"
            },
            {
                "id": "step1",
                "title": "Dimension Analysis",
                "description": "Check the data source and field description",
                "stepId": "data_cleaning_step1"
            },
            {
                "id": "step2",
                "title": "Invalid Value Analysis",
                "description": "Check for invalid values in the data",
                "stepId": "data_cleaning_step2"
            },
            {
                "id": "step3",
                "title": "Missing Value Analysis",
                "description": "Analyze missing values in the data",
                "stepId": "data_cleaning_step3"
            },
            {
                "id": "step4",
                "title": "Data Integrity Analysis",
                "description": "Analyze the integrity of the data",
                "stepId": "data_cleaning_step4"
            }
        ]
    },
    "exploratory_data_analysis": {
        "id": "exploratory_data_analysis",
        "title": "Exploratory Data Analysis",
        "description": "Analyze the data to gain insights",
        "steps": [
            {
                "id": "step0",
                "title": "Stage Introduction",
                "description": "Understand the goal and steps of exploratory data analysis",
                "stepId": "exploratory_data_analysis_step0"
            },
            {
                "id": "step1",
                "title": "Data Preview",
                "description": "Load and preview the data",
                "stepId": "exploratory_data_analysis_step1"
            },
            {
                "id": "step2",
                "title": "Variable Description",
                "description": "Describe the variables in the data",
                "stepId": "exploratory_data_analysis_step2"
            },
            {
                "id": "step3",
                "title": "EDA Questions Generation",
                "description": "Generate EDA questions",
                "stepId": "exploratory_data_analysis_step3"
            },
            {
                "id": "step4",
                "title": "EDA Questions Analysis",
                "description": "Analyze the EDA questions",
                "stepId": "exploratory_data_analysis_step4"
            }
        ]
    },
    "model_proposal": {
        "id": "model_proposal",
        "title": "Model Proposal",
        "description": "Propose models for data analysis",
        "steps": [
            {
                "id": "step0",
                "title": "Stage Introduction",
                "description": "Understand the goal and steps of method proposal",
                "stepId": "stage_3_method_proposal_step0"
            },
            {
                "id": "step1",
                "title": "Feature Engineering and Model Methods",
                "description": "Generate feature engineering methods and model selection methods",
                "stepId": "stage_3_method_proposal_step1"
            },
            {
                "id": "step2",
                "title": "Training and Evaluation Strategy",
                "description": "Generate comprehensive training and evaluation strategy",
                "stepId": "stage_3_method_proposal_step2"
            },
            {
                "id": "step3",
                "title": "Method Proposal Summary",
                "description": "Provide comprehensive summary of proposed methods and strategy",
                "stepId": "stage_3_method_proposal_step3"
            }
        ]
    },
    "model_training_and_evaluation": {
        "id": "model_training_and_evaluation",
        "title": "Model Training and Evaluation",
        "description": "Train and evaluate machine learning models",
        "steps": [
            {
                "id": "step0",
                "title": "Response Variable Identification",
                "description": "Identify the target variable for prediction",
                "stepId": "model_training_and_evaluation_step0"
            },
            {
                "id": "step1",
                "title": "Feature Engineering Methods",
                "description": "Suggest appropriate feature engineering techniques",
                "stepId": "model_training_and_evaluation_step1"
            },
            {
                "id": "step2",
                "title": "Modeling Methods Suggestion",
                "description": "Suggest appropriate machine learning models",
                "stepId": "model_training_and_evaluation_step2"
            },
            {
                "id": "step3",
                "title": "Model Training and Evaluation",
                "description": "Train and evaluate combined models",
                "stepId": "model_training_and_evaluation_step3"
            }
        ]
    },
    "stability_analysis": {
        "id": "stability_analysis", 
        "title": "Stability Analysis",
        "description": "Analyze model stability across different data variations",
        "steps": [
            {
                "id": "step0",
                "title": "Execute Stability Analysis",
                "description": "Generate multiple dataset variations for stability testing",
                "stepId": "stability_analysis_step0"
            },
            {
                "id": "step1",
                "title": "Batch Model Evaluation",
                "description": "Evaluate models across all dataset variations",
                "stepId": "stability_analysis_step1"
            },
            {
                "id": "step2",
                "title": "Evaluation Results Summary",
                "description": "Summarize and analyze batch evaluation results",
                "stepId": "stability_analysis_step2"
            }
        ]
    },
    "results_evaluation": {
        "id": "results_evaluation",
        "title": "Results Evaluation", 
        "description": "Final evaluation and validation of model results",
        "steps": [
            {
                "id": "step0",
                "title": "Results Agent Initialization",
                "description": "Initialize results evaluation agent with model summaries",
                "stepId": "results_evaluation_step0"
            },
            {
                "id": "step1", 
                "title": "Test Dataset Generation",
                "description": "Generate and execute test dataset variations",
                "stepId": "results_evaluation_step1"
            },
            {
                "id": "step2",
                "title": "Final Model Evaluation", 
                "description": "Execute comprehensive final model evaluation",
                "stepId": "results_evaluation_step2"
            }
        ]
    }
} 

from DCLSAgents.agents import (ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent, 
                    PCSAgent, PredictionAndInferenceAgent, 
                    ResultsEvaluationAgent)

llm = "gpt-4o-mini"