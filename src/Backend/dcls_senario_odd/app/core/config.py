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

from DCLSAgents.agents import (ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent, 
                    PredictionAndInferenceAgent, 
                    ResultsEvaluationAgent)

# Use Simple PCS Agent with Yes/No decision structure
try:
    from DCLSAgents.agents.pcs_agent_simple import SimplePCSAgent as PCSAgent
except ImportError:
    # Fallback to enhanced version if simple version not available
    try:
        from DCLSAgents.agents.pcs_agent_enhanced import EnhancedPCSAgent as PCSAgent
    except ImportError:
        # Final fallback to original PCS Agent
        from DCLSAgents.agents import PCSAgent

from .workflow_manager import WorkflowManager

llm = "doubao-1-5-lite-32k-250115"