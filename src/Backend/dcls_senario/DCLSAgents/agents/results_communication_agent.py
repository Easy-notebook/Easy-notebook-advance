# agents/results_communication_agent.py
from .base_agent import BaseAgent

class ResultsCommunicationAgent(BaseAgent):
    def __init__(self, lang: str = "en"):
        super().__init__(lang=lang)
        self.system_prompt = "你是一个数据科学专家，专注于生成一份报告，汇总结果并提供给相关方。"
