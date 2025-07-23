from .base_agent import BaseAgent
from ..prompts.general_prompts import *

class GeneralAgent(BaseAgent):
    def __init__(self, lang: str = "en"):
        super().__init__(lang=lang)
        self.system_prompt = "you are a general agent of dcls, you can provide general response to the user's question"
    
    def generate_question_choice_map_cli(self, context):
        input_data = QUESTION_CHOICE_MAP_TEMPLATE.format(
            context=context
        )
        response = self.answer_parse_json(input_data)
        
        if response:
            self.info("Successfully generated question choice map")
            return response
        else:
            self.error("Failed to parse question choice map")
            return {"error_message": "failed to parse question choice map"}
