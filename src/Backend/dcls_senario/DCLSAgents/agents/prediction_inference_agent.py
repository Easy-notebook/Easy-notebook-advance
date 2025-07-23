from .base_agent import BaseAgent
from ..prompts.prediction_inference_prompts import *

class PredictionAndInferenceAgent(BaseAgent):
    def __init__(self, problem_description, context_description, eda_summary, lang: str = "en"):

        system_message_content = PREDICTION_INFERENCE_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            eda_summary=eda_summary 
        )
        super().__init__(lang=lang)
        self.system_prompt = system_message_content

    def suggest_model_methods_cli(self):
        input_data = MODELING_METHODS_TEMPLATE_2.format(
            problem_description=self.problem_description,
            context_description=self.context_description,
            eda_summary=self.eda_summary
        )
        return self.answer_parse_json(input_data, no_json_return="cloud not generate modeling methods")

    def suggest_feature_engineering_methods_cli(self):
        input_data = FEATURE_ENGINEERING_TEMPLATE_2.format(
            problem_description=self.problem_description,
            context_description=self.context_description,
            column_names=self.eda_summary
        )
        return self.answer_parse_json(input_data, no_json_return="cloud not generate feature engineering methods")
        