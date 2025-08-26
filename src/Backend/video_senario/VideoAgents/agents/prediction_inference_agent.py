from .base_agent import BaseAgent
import json
from DCLSAgents.prompts.prediction_inference_prompts import *

class PredictionAndInferenceAgent(BaseAgent):
    def __init__(self, problem_description, context_description, eda_summary, memory=None, llm=None):
        self.problem_description = problem_description
        self.context_description = context_description
        self.eda_summary = eda_summary
        self.response_variable = None

        system_message_content = PREDICTION_INFERENCE_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            eda_summary=eda_summary 
        )

        super().__init__(
            name="Prediction and Inference",
            model=llm if llm else "openai/gpt-oss-120b",
            system_prompt=system_message_content
        )
        self.info("PredictionAndInferenceAgent initialized")

    
    def suggest_feature_engineering_methods_cli(self):
        input_data = FEATURE_ENGINEERING_TEMPLATE_2.format(
            problem_description=self.problem_description,
            context_description=self.context_description,
            column_names=self.eda_summary
        )
        response = self.analyzing(input_data)
        if response:
            return response
        else:
            return "cloud not generate feature engineering methods"

    def suggest_modeling_methods_cli(self):
        input_data = MODELING_METHODS_TEMPLATE_2.format(
            problem_description=self.problem_description,
            context_description=self.context_description,
            eda_summary=self.eda_summary
        )
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate modeling methods"}]
    
    def generate_training_evaluation_strategy_cli(self, feature_methods, modeling_methods):
        """CLI method for generating training and evaluation strategy"""
        try:
            input_data = TRAINING_EVALUATION_STRATEGY_TEMPLATE.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                eda_summary=self.eda_summary,
                feature_methods=json.dumps(feature_methods, ensure_ascii=False),
                modeling_methods=json.dumps(modeling_methods, ensure_ascii=False)
            )
            
            response = self.analyzing(input_data)
            
            if response:
                return response
            else:
                return [{"error": "Could not generate training strategy"}]
        except Exception as e:
            return [{"error": f"Error generating training strategy: {str(e)}"}]
    
    def generate_model_training_code_cli(self, training_strategy, csv_file_path, response_variable_analysis):
        """CLI method for generating model training code with comprehensive multi-method approach"""
        input_data = COMPREHENSIVE_MODEL_TRAINING_CODE_TEMPLATE.format(
            training_strategy=json.dumps(training_strategy, ensure_ascii=False),
            csv_file_path=csv_file_path,
            response_variable_analysis=json.dumps(response_variable_analysis, ensure_ascii=False),
            problem_description=self.problem_description,
            context_description=self.context_description,
            eda_summary=self.eda_summary
        )
        
        response = self.coding(input_data)
        return response
    
    def generate_stability_analysis_summary_cli(self, batch_evaluation_strategy, evaluation_approach):
        """CLI method for generating stability analysis summary"""
        input_data = STABILITY_ANALYSIS_SUMMARY_TEMPLATE.format(
            batch_evaluation_strategy=json.dumps(batch_evaluation_strategy, ensure_ascii=False),
            evaluation_approach=evaluation_approach,
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        response = self.analyzing(input_data)
        if response:
            return response
        else:
            return [{"error": "Could not generate stability analysis"}]
    
    def generate_batch_evaluation_strategy_cli(self, stability_strategy, dataset_variations, model_training_code):
        """CLI method for generating batch evaluation strategy"""
        input_data = BATCH_EVALUATION_STRATEGY_TEMPLATE.format(
            stability_strategy=json.dumps(stability_strategy, ensure_ascii=False),
            dataset_variations=json.dumps(dataset_variations, ensure_ascii=False),
            model_training_code=model_training_code,
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        
        response = self.analyzing(input_data)
        return response
    
    def generate_batch_evaluation_code_cli(self, batch_evaluation_strategy, csv_file_path, model_training_code):
        """CLI method for generating batch evaluation code"""
        input_data = BATCH_EVALUATION_CODE_TEMPLATE.format(
            batch_evaluation_strategy=json.dumps(batch_evaluation_strategy, ensure_ascii=False),
            csv_file_path=csv_file_path,
            model_training_code=model_training_code,
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        
        response = self.coding(input_data)
        return response
    
    def generate_evaluation_report_template_cli(self, stability_summary):
        """CLI method for generating evaluation report template"""
        input_data = EVALUATION_REPORT_TEMPLATE_GENERATION.format(
            stability_summary=json.dumps(stability_summary, ensure_ascii=False),
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        
        response = self.answer(input_data)
        return response
    
    def analyze_training_results_cli(self, training_results, training_strategy):
        """CLI method for analyzing training results"""
        input_data = TRAINING_RESULTS_ANALYSIS_TEMPLATE.format(
            training_results=training_results,
            training_strategy=json.dumps(training_strategy, ensure_ascii=False),
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not analyze training results"}]
    
    def analyze_batch_evaluation_results_cli(self, batch_results, evaluation_strategy):
        """CLI method for analyzing batch evaluation results"""
        input_data = BATCH_EVALUATION_RESULTS_ANALYSIS_TEMPLATE.format(
            batch_results=batch_results,
            evaluation_strategy=json.dumps(evaluation_strategy, ensure_ascii=False),
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not analyze batch evaluation results"}]