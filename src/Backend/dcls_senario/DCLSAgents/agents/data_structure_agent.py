# agents/data_structure_agent.py
from .base_agent import BaseAgent

class DataStructureExplorationAgent(BaseAgent):
    def __init__(self, lang: str = "en"):
        super().__init__(lang=lang)
        self.system_prompt = "You are a data science expert, focusing on dimensionality reduction and clustering analysis to explore data structures."
