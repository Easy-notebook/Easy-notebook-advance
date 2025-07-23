from .base_agent import BaseAgent
from ..prompts.pcs_prompts import *
import json

class PCSAgent(BaseAgent):
    def __init__(self, problem_description, context_description, lang: str = "en"):
        system_message = PCS_EVALUATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description
        )
        super().__init__(lang=lang)
        self.system_prompt = system_message

    def evaluate_problem_definition_cli(self, problem_description:str, context_description:str, var_json:str, unit_check:str, relevant_variables_analysis:str):
        input_data = HYPOTHESIS_GENERATION_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            unit_check=unit_check,
            relevant_variables_analysis=relevant_variables_analysis
        )

        return self.answer_parse_json(input_data, no_json_return={"预测性": "无法评估", "稳定性": "无法评估"})