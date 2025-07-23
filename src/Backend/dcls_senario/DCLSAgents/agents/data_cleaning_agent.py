# agents/data_cleaning_agent.py
from .base_agent import BaseAgent
import json
from ..prompts.data_cleaning_prompts import *

class DataCleaningAndEDA_Agent(BaseAgent):
    def __init__(self, 
                    problem_description, 
                    context_description, 
                    check_unit, 
                    var_json, 
                    hyp_json, 
                    lang: str = "en"
                ):
        self.system_prompt = DATA_CLEANING_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            check_unit=check_unit,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            hyp_json=json.dumps(hyp_json, ensure_ascii=False, indent=2)
        )
        
        super().__init__(lang=lang)
        
    def generate_cleaning_task_list(self):
        input_data = TASK_LIST_TEMPLATE.format(
            problem_description=self.problem_description,
            context_description=self.context_description,
            check_unit=self.check_unit,
            var_json=json.dumps(self.var_json, ensure_ascii=False, indent=2)
        )
        
        return self.answer_parse_json(input_data, no_json_return="No cleaning task list found")
    
    def generate_dimension_check_code_cli(self, csv_file_path, context_description):
        input_data = DIMENSION_CHECK_TEMPLATE.format(
            csv_path=csv_file_path,
            context_description=context_description
        )
        generated_code = self.answer_parse_llm_code(input_data)
        return generated_code
    
    def analyze_data_dimension_cli(self, result, context_description):
        request = DIMENSION_ANALYSIS_TEMPLATE_2.format(
            result=result,
            context_description=context_description
        )
        response = self.answer_parse_json(request, no_json_return="no problem")
        return response
    
    def check_for_invalid_values_cli(self, result, context_description, variable_descriptions):
        request = INVALID_VALUE_TEMPLATE_2.format(
            data_describe=result,
            context_description=context_description,
            variable_descriptions=variable_descriptions
        )
        response = self.answer_parse_json(request, no_json_return="no problem")
        return response
        
    def generate_missing_value_analysis_code_cli(self, csv_file_path, missing_data_str):
        input_data = MISSING_VALUE_CODE_TEMPLATE_2.format(
            missing_ratio=missing_data_str,
            csv_path=csv_file_path
        )
        
        generated_code = self.answer_parse_llm_code(input_data)
        return generated_code

    def analyze_missing_values_result_cli(self, result, missing_data_str, data_unit):
        request = MISSING_VALUE_CLEANING_TEMPLATE_2.format(
            missing_ratio=missing_data_str,
            missing_analysis=result,
            data_unit=data_unit
        )
        response = self.answer_parse_json(request, no_json_return="no problem")
        return response
    
    def generate_data_integrity_check_code_cli(self, csv_file_path):
        request = DATA_INTEGRITY_CHECK_TEMPLATE_2.format(
            csv_path=csv_file_path,
        )
        response = self.answer_parse_llm_code(request)
        return response
    
    def analyze_and_generate_fillna_operations_cli(self, result):
        request = DATA_INTEGRITY_CLEANING_TEMPLATE_2.format(
            integrity_result=result,
        )
        response = self.answer_parse_json(request, no_json_return="no problem")
        return response
    
    def generate_cleaning_code_cli(self, csv_file_path, operations, context_description, var_descriptions, check_unit, data_info, save_path):
        input_data = DATA_CLEANING_FUNCTION_TEMPLATE_2.format(
            csv_path=csv_file_path,
            context_description=context_description,
            var_descriptions=var_descriptions,
            check_unit=check_unit,
            data_info=data_info,
            cleaning_operations=json.dumps(operations, ensure_ascii=False, indent=2),
            save_path=save_path
        )

        generated_code = self.answer_parse_llm_code(input_data)
        return generated_code
        
        
    def generate_eda_questions_cli(self, problem_description, data_info, data_preview):
        input_data = EDA_QUESTIONS_TEMPLATE_2.format(
            problem_description=problem_description,
            data_structure=data_info,
            data_preview=data_preview
        )
        response = self.answer_parse_json(input_data, no_json_return="no problem")
        return response
        
    def generate_eda_code_cli(self, csv_file_path, question, data_info, data_preview):
        input_data = EDA_CODE_TEMPLATE_2.format(
            csv_path=csv_file_path,
            question=question,
            data_structure=data_info,
            data_preview=data_preview
        )
        generated_code = self.answer_parse_llm_code(input_data)
        return generated_code

    def analyze_eda_result_cli(self, question, result, attempt):
        input_data = EDA_ANALYSIS_TEMPLATE_2.format(
            question=question,
            result=result,
            attempt=attempt
        )
        response = self.answer_parse_json(input_data, no_json_return="no problem")
        return response    
    
    
    def dimension_analysis_cli(self,csv_file_path, context_description,dimension_check_result=None):
        if dimension_check_result is None and csv_file_path is not None:
            return self.generate_dimension_check_code_cli(csv_file_path=csv_file_path, context_description=context_description)
            
        dimension_problems = self.analyze_data_dimension_cli(dimension_check_result, context_description)
        return dimension_problems
    
    def missing_value_analysis_cli(self,csv_file_path, missing_data_str=None, missing_value_check_result=None, check_unit=None):
        if missing_value_check_result is None and csv_file_path is not None and missing_data_str is not None:
            return self.generate_missing_value_analysis_code_cli(csv_file_path=csv_file_path, missing_data_str=missing_data_str)
                
        missing_value_problems = self.analyze_missing_values_result_cli(result=missing_value_check_result, missing_data_str=missing_data_str, data_unit=check_unit)
        return missing_value_problems