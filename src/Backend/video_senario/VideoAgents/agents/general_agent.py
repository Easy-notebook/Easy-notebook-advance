from .base_agent import BaseAgent
from DCLSAgents.prompts.general_prompts import *

class GeneralAgent(BaseAgent):
    def __init__(self, llm=None):        
        super().__init__(
            name="General Agent",
            model=llm if llm else "gpt-5-mini",
            system_prompt="you are a general agent of dcls, you can provide general response to the user's question"
        )
    
    def generate_question_choice_map_cli(self, context):
        input_data = QUESTION_CHOICE_MAP_TEMPLATE.format(
            context=context
        )
        parsed_question_choice_map = self.analyzing(input_data)
        return parsed_question_choice_map