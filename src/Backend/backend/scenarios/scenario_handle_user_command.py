from typing import AsyncGenerator, Dict, Any

from dotenv import load_dotenv
from agents.command_agent import CommandAgent
from .base_scenario import BaseScenarioTemplate

load_dotenv()

class UserCommandScenario(BaseScenarioTemplate):
    """
    处理用户命令的场景类
    """
    
    def __init__(self, operation: Dict[str, Any]):
        super().__init__(operation)
        # 创建带记忆上下文的Agent操作
        agent_operation = self._create_agent_operation(CommandAgent, agent_type="command")
        self.agent = CommandAgent(operation=agent_operation)
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        return bool(self._get_payload_value("content") and self._get_payload_value("commandId"))
        
    async def process(self) -> AsyncGenerator[str, None]:
        """处理用户命令场景"""
        try:
            if not self.validate_operation():
                yield self._create_error_response(
                    "Missing content or commandId in payload",
                    {"commandId": self._get_payload_value("commandId")}
                )
                return
                
            async for chunk in self.agent.process():
                yield chunk

        except Exception as e:
            print(f"Error in handle_user_command: {str(e)}")
            yield self._create_error_response(
                str(e),
                {"commandId": self._get_payload_value("commandId")}
            )

async def handle_user_command(operation: dict) -> AsyncGenerator[str, None]:
    """
    处理用户命令并生成代码
    """
    scenario = UserCommandScenario(operation)
    async for response in scenario.process():
        yield response