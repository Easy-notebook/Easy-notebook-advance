# agents/results_communication_agent.py
from .base_agent import BaseDSLC_Agent

class ResultsCommunicationAgent(BaseDSLC_Agent):
    def __init__(self, memory=None, llm=None, prompt="你是一个数据科学专家，专注于生成一份报告，汇总结果并提供给相关方。"):
        super().__init__("Results Communication", prompt=prompt, memory=memory, llm=llm)
