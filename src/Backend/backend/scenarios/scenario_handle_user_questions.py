from typing import AsyncGenerator, Dict, Any
from dotenv import load_dotenv
from agents.general_agent import GeneralAgent
from .base_scenario import BaseScenarioTemplate

load_dotenv()

class UserQuestionScenario(BaseScenarioTemplate):
    """
    处理用户问题的场景类
    """
    
    def __init__(self, operation: Dict[str, Any]):
        super().__init__(operation)
        # 创建带记忆上下文的Agent操作
        agent_operation = self._create_agent_operation(GeneralAgent)
        self.agent = GeneralAgent(operation=agent_operation)
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        return bool(self._get_payload_value("QId"))
        
    async def process(self) -> AsyncGenerator[str, None]:
        """处理用户问题场景"""
        try:
            if not self.validate_operation():
                yield self._create_error_response(
                    "Missing QId in payload",
                    {"QId": self._get_payload_value("QId")}
                )
                return
                
            print(self.operation)
            async for chunk in self.agent.process():
                yield chunk

        except Exception as e:
            error_msg = f"Error in handle_user_questions: {str(e)}"
            print(error_msg)
            yield self._create_error_response(
                error_msg,
                {"QId": self._get_payload_value("QId")}
            )

async def handle_user_questions(operation: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """
    处理用户问题并生成流式回答
    """
    scenario = UserQuestionScenario(operation)
    async for response in scenario.process():
        yield response
