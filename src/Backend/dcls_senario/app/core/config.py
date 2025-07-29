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

# VDS动态工作流：移除静态配置，改为基于存在性第一性原理的动态生成
# 工作流现在由PCS Agent根据用户目标和数据状态动态生成
# 前端负责维护工作流状态和章节进度 

from DCLSAgents.agents import (ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent, 
                    PCSAgent, PredictionAndInferenceAgent, 
                    ResultsEvaluationAgent)

from .workflow_manager import WorkflowManager

llm = "gpt-4o-mini"