# 日志配置
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
class SHOT_TYPES:
    DIALOGUE = 'dialogue'     # 对话（文本内容）
    ACTION = 'action'         # 动作（代码描述）
    HYBRID = 'hybrid'         # 混合型镜头
    ATTACHMENT = 'attachment' # 附件（文件相关内容）
    OUTCOME = 'outcome'       # 结果展示
    ERROR = 'error'           # error_message
    THINKING = 'thinking'     # 思考

STAGES = {
    "data-loading-and-hypothesis-proposal": {
            "id": "data-loading-and-hypothesis-proposal",
            "title": "Data Loading and Hypothesis Propose",
            "description": "Data Loading and Hypothesis Propose",
            "steps": [
            {
                "id": 'step0',
                "title": 'Stage Introduction',
                "stepId": 'data-loading-and-hypothesis-proposal-step0',
            },
            {
                "id": 'step1',
                "title": 'Date Preview',
                "stepId": 'data-loading-and-hypothesis-proposal-step1',
            },
            {
                "id": 'step2',
                "title": 'Variable Describe',
                "description": 'Load and preliminary check the dataset',
                "stepId": 'data-loading-and-hypothesis-proposal-step2',
            },
            {
                "id": 'step3',
                "title": 'Analysis of the observation unit',
                "description": 'Identify data issues and cleaning requirements',
                "stepId": 'data-loading-and-hypothesis-proposal-step3',
            },
            {
                "id": 'step4',
                "title": 'Variable Relevance Analysis',
                "stepId": 'data-loading-and-hypothesis-proposal-step4',
            },
            {
                "id": 'step5',
                "title": 'Hypothesis Propose',
                "stepId": 'data-loading-and-hypothesis-proposal-step5',
            }
        ]
    },
    "data-cleaning": {
        "id": "data-cleaning",
        "title": "Data Cleaning",
        "description": "Clean and preprocess data to prepare for analysis",
        "steps": [
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
    },
    "exploratory-data-analysis": {
        "id": "exploratory-data-analysis",
        "title": "Exploratory Data Analysis",
        "description": "Analyze the data to gain insights",
        "steps": [
            {
                "id": "step0",
                "title": "Stage Introduction",
                "description": "Understand the goal and steps of exploratory data analysis",
                "stepId": "exploratory-data-analysis-step0"
            },
            {
                "id": "step1",
                "title": "Data Preview",
                "description": "Load and preview the data",
                "stepId": "exploratory-data-analysis-step1"
            },
            {
                "id": "step2",
                "title": "Variable Describe",
                "description": "Describe the variables in the data",
                "stepId": "exploratory-data-analysis-step2"
            },
            {
                "id": "step3",
                "title": "EDA Questions Generation",
                "description": "Generate EDA questions",
                "stepId": "exploratory-data-analysis-step3"
            },
            {
                "id": "step4",
                "title": "EDA Questions Analysis",
                "description": "Analyze the EDA questions",
                "stepId": "exploratory-data-analysis-step4"
            }
        ]
    },
    "model-proposal": {
        "id": "model-proposal",
        "title": "Model Proposal",
        "description": "Propose models for data analysis",
        "steps": [
            {
                "id": "step0",
                "title": "Stage Introduction",
                "description": "Understand the goal and steps of method proposal",
                "stepId": "model-proposal-step0"
            },
            {
                "id": "step1",
                "title": "Model Proposal",
                "description": "Propose models for data analysis",
                "stepId": "model-proposal-step1"
            }]
    }
} 