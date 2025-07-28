from typing import AsyncGenerator, Dict, Any

from dotenv import load_dotenv
from agents.output_agent import OutputAgent
from .base_scenario import BaseScenarioTemplate

load_dotenv()

class CodeOutputScenario(BaseScenarioTemplate):
    """
    处理代码输出分析的场景类
    """
    
    def __init__(self, operation: Dict[str, Any]):
        super().__init__(operation)
        # 创建带记忆上下文的Agent操作
        agent_operation = self._create_agent_operation(OutputAgent, agent_type="output")
        self.agent = OutputAgent(operation=agent_operation)
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        return bool(self.payload)
        
    async def process(self) -> AsyncGenerator[str, None]:
        """处理代码输出分析场景"""
        try:
            if not self.validate_operation():
                yield self._create_error_response("Invalid operation parameters")
                return
                
            async for chunk in self.agent.process():
                yield chunk

        except Exception as e:
            print(f"Error in handle_code_output: {str(e)}")
            yield self._create_error_response(str(e))

async def handle_code_output(operation: dict) -> AsyncGenerator[str, None]:
    """
    处理代码输出分析
    """
    scenario = CodeOutputScenario(operation)
    async for response in scenario.process():
        yield response