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
                "stepId": "model_proposal_step0"
            },
            {
                "id": "step1",
                "title": "Model Proposal",
                "description": "Propose models for data analysis",
                "stepId": "model_proposal_step1"
            }]
    }
} 

from DCLSAgents.agents import (ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent, 
                    PCSAgent, PredictionAndInferenceAgent, 
                    ResultsEvaluationAgent, ResultsCommunicationAgent)

#gpt
from ..utils import Oracle
llm = Oracle(
    api_key="sk-iLOmdIAzvILZxzlY94AdC46e7bE145089aD6Fe7bAc3e7489",
    base_url="https://openkey.cloud/v1",
    model="gpt-4o"
)
