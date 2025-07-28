from .base_agent import BaseDSLC_Agent
import json
import pandas as pd
import os
import re
from DCLSAgents.prompts.prediction_inference_prompts import *
from DCLSAgents.tools import *

class PredictionAndInferenceAgent(BaseDSLC_Agent):
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
            system_message=system_message_content,
            memory=memory,
            llm=llm
        )
        self.logger.info("PredictionAndInferenceAgent initialized")

    
    def suggest_feature_engineering_methods_cli(self):
        input_data = FEATURE_ENGINEERING_TEMPLATE_2.format(
            problem_description=self.problem_description,
            context_description=self.context_description,
            column_names=self.eda_summary
        )
        response = self.execute(input_data)
        feature_engineering_methods = self.parse_llm_json(response)
        if feature_engineering_methods:
            return feature_engineering_methods
        else:
            return "cloud not generate feature engineering methods"


    
    def identify_response_variable_cli(self, csv_file_path):
        """CLI method for identifying response variables"""
        try:
            df = pd.read_csv(csv_file_path)
            column_names = list(df.columns)
            
            input_data = RESPONSE_VARIABLE_TEMPLATE.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                column_names=column_names
            )
            
            response = self.execute(input_data)
            response_var_analysis = self.parse_llm_json(response)
            
            if response_var_analysis:
                return response_var_analysis
            else:
                return [{"error": "Could not identify response variable"}]
        except Exception as e:
            return [{"error": f"Error identifying response variable: {str(e)}"}]
    
    def suggest_modeling_methods_cli(self):
        """CLI method for suggesting modeling methods"""
        try:
            input_data = MODELING_METHODS_TEMPLATE_2.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                eda_summary=self.eda_summary
            )
            
            response = self.execute(input_data)
            modeling_methods = self.parse_llm_json(response)
            
            if modeling_methods:
                return modeling_methods
            else:
                return [{"error": "Could not generate modeling methods"}]
        except Exception as e:
            return [{"error": f"Error generating modeling methods: {str(e)}"}]
    
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
            
            response = self.execute(input_data)
            strategy = self.parse_llm_json(response)
            
            if strategy:
                return strategy
            else:
                return [{"error": "Could not generate training strategy"}]
        except Exception as e:
            return [{"error": f"Error generating training strategy: {str(e)}"}]
    
    def generate_model_training_code_cli(self, training_strategy, csv_file_path, response_variable_analysis):
        """CLI method for generating model training code with comprehensive multi-method approach"""
        try:
            input_data = COMPREHENSIVE_MODEL_TRAINING_CODE_TEMPLATE.format(
                training_strategy=json.dumps(training_strategy, ensure_ascii=False),
                csv_file_path=csv_file_path,
                response_variable_analysis=json.dumps(response_variable_analysis, ensure_ascii=False),
                problem_description=self.problem_description,
                context_description=self.context_description,
                eda_summary=self.eda_summary
            )
            
            response = self.execute(input_data)
            # Extract code from markdown if present
            code_match = re.search(r"```python\n(.*?)\n```", response, re.DOTALL)
            if code_match:
                return code_match.group(1).strip()
            else:
                return response
        except Exception as e:
            return f"# Error generating training code: {str(e)}"
    
    def generate_stability_analysis_summary_cli(self, batch_evaluation_strategy, evaluation_approach):
        """CLI method for generating stability analysis summary"""
        try:
            input_data = STABILITY_ANALYSIS_SUMMARY_TEMPLATE.format(
                batch_evaluation_strategy=json.dumps(batch_evaluation_strategy, ensure_ascii=False),
                evaluation_approach=evaluation_approach,
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.execute(input_data)
            summary = self.parse_llm_json(response)
            
            if summary:
                return summary
            else:
                return [{"error": "Could not generate stability analysis"}]
        except Exception as e:
            return [{"error": f"Error generating stability analysis: {str(e)}"}]
    
    def generate_batch_evaluation_strategy_cli(self, stability_strategy, dataset_variations, model_training_code):
        """CLI method for generating batch evaluation strategy"""
        try:
            input_data = BATCH_EVALUATION_STRATEGY_TEMPLATE.format(
                stability_strategy=json.dumps(stability_strategy, ensure_ascii=False),
                dataset_variations=json.dumps(dataset_variations, ensure_ascii=False),
                model_training_code=model_training_code,
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.execute(input_data)
            strategy = self.parse_llm_json(response)
            
            if strategy:
                return strategy
            else:
                return [{"error": "Could not generate batch evaluation strategy"}]
        except Exception as e:
            return [{"error": f"Error generating batch evaluation strategy: {str(e)}"}]
    
    def generate_batch_evaluation_code_cli(self, batch_evaluation_strategy, csv_file_path, model_training_code):
        """CLI method for generating batch evaluation code"""
        try:
            input_data = BATCH_EVALUATION_CODE_TEMPLATE.format(
                batch_evaluation_strategy=json.dumps(batch_evaluation_strategy, ensure_ascii=False),
                csv_file_path=csv_file_path,
                model_training_code=model_training_code,
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.execute(input_data)
            # Extract code from markdown if present
            code_match = re.search(r"```python\n(.*?)\n```", response, re.DOTALL)
            if code_match:
                return code_match.group(1).strip()
            else:
                return response
        except Exception as e:
            return f"# Error generating batch evaluation code: {str(e)}"
    
    def generate_evaluation_report_template_cli(self, stability_summary):
        """CLI method for generating evaluation report template"""
        try:
            input_data = EVALUATION_REPORT_TEMPLATE_GENERATION.format(
                stability_summary=json.dumps(stability_summary, ensure_ascii=False),
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.execute(input_data)
            # Extract markdown template if wrapped
            markdown_match = re.search(r"```markdown\n(.*?)\n```", response, re.DOTALL)
            if markdown_match:
                return markdown_match.group(1).strip()
            else:
                return response
        except Exception as e:
            return f"# Error generating evaluation report template: {str(e)}"
    
    def analyze_training_results_cli(self, training_results, training_strategy):
        """CLI method for analyzing training results"""
        try:
            input_data = TRAINING_RESULTS_ANALYSIS_TEMPLATE.format(
                training_results=training_results,
                training_strategy=json.dumps(training_strategy, ensure_ascii=False),
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.execute(input_data)
            analysis = self.parse_llm_json(response)
            
            if analysis:
                return analysis
            else:
                return [{"error": "Could not analyze training results"}]
        except Exception as e:
            return [{"error": f"Error analyzing training results: {str(e)}"}]
    
    def analyze_batch_evaluation_results_cli(self, batch_results, evaluation_strategy):
        """CLI method for analyzing batch evaluation results"""
        try:
            input_data = BATCH_EVALUATION_RESULTS_ANALYSIS_TEMPLATE.format(
                batch_results=batch_results,
                evaluation_strategy=json.dumps(evaluation_strategy, ensure_ascii=False),
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.execute(input_data)
            analysis = self.parse_llm_json(response)
            
            if analysis:
                return analysis
            else:
                return [{"error": "Could not analyze batch evaluation results"}]
        except Exception as e:
            return [{"error": f"Error analyzing batch evaluation results: {str(e)}"}]