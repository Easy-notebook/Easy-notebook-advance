from .base_agent import BaseDSLC_Agent
from DCLSAgents.prompts.general_prompts import *

class GeneralAgent(BaseDSLC_Agent):
    def __init__(self, memory=None, llm=None):        
        super().__init__(
            name="General Agent",
            system_message="you are a general agent of dcls, you can provide general response to the user's question",
            memory=memory,
            llm=llm
        )
    
    def generate_question_choice_map_cli(self, context):
        input_data = QUESTION_CHOICE_MAP_TEMPLATE.format(
            context=context
        )
        response = self.chat_without_memory(input_data)
        parsed_question_choice_map = self.parse_llm_json(response)
        
        if parsed_question_choice_map:
            self.logger.info("Successfully generated question choice map")
            return parsed_question_choice_map
        else:
            self.logger.warning("Failed to parse question choice map")
            return {"error_message": "failed to parse question choice map"}
        
        
