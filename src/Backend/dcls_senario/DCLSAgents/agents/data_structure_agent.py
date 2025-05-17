# agents/data_structure_agent.py
from .base_agent import BaseDSLC_Agent

class DataStructureExplorationAgent(BaseDSLC_Agent):
    def __init__(self, memory=None, llm=None, prompt="你是一个数据科学专家，专注于进行降维和聚类分析，探索数据结构。"):
        super().__init__("Data Structure Exploration", prompt=prompt, memory=memory, llm=llm)
