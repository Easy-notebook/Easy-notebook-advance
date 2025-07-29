from .base_agent import BaseAgent
from DCLSAgents.prompts.problem_definition_prompts import *

class ProblemDefinitionAndDataCollectionAgent(BaseAgent):
    def __init__(self, llm=None):
        super().__init__(
            name="Problem Definition and Data Collection",
            model=llm if llm else "gpt-4o-mini",
            system_prompt=PROBLEM_DEFINITION_TEMPLATE
        )
        self.info("ProblemDefinitionAndDataCollectionAgent initialized")


    def analyze_variables_cli(self,variables,preview,problem_description,context_description):
        request = VARIABLE_ANALYSIS_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
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
        """评估变量是否与数据科学项目相关"""
        input_data = VARIABLE_RELEVANCE_TEMPLATE_2.format(
            variable_descriptions=variables,
            data_preview=preview,
            problem_description=problem_description,
            context_description=context_description
        )
        response = self.answer(input_data)
        return response
    
        
