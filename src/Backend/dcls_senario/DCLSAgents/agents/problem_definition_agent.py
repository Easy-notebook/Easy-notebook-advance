from .base_agent import BaseAgent
from DCLSAgents.prompts.problem_definition_prompts import *


class ProblemDefinitionAndDataCollectionAgent(BaseAgent):
    def __init__(self, lang: str = "en"):
        super().__init__(lang=lang)
        self.system_prompt = PROBLEM_DEFINITION_TEMPLATE

    def analyze_variables_cli(self,variables,preview,problem_description,context_description):
        request = VARIABLE_ANALYSIS_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.answer(request)
        return response
        
    def transform_variable_analysis_response2json_cli(self,response):        
        request = VARIABLE_ANALYSIS_TRANSFORM_TEMPLATE.format(
            response=str(response)
        )
        response = self.answer(request)
        return response
        
    def detect_observation_unit_cli(self,variables,preview,problem_description,context_description):
        input_data = OBSERVATION_UNIT_TEMPLATE_2.format(
                variable_info=variables,
                data_preview=preview,
                problem_description=problem_description,
                context_description=context_description
            )
        response = self.answer(input_data)
        return response
        
    def evaluate_variable_relevance_cli(self,variables,preview,problem_description,context_description):
        input_data = VARIABLE_RELEVANCE_TEMPLATE_2.format(
            variable_descriptions=variables,
            data_preview=preview,
            problem_description=problem_description,
            context_description=context_description
        )
        return self.answer(input_data)
        
    def transform_variable_relevance_response2json_cli(self,response):
        request = VARIABLE_RELEVANCE_TRANSFORM_TEMPLATE.format(
            response=response
        )
        response = self.answer(request)
        return response