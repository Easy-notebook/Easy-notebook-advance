# agents/data_cleaning_agent.py
from .base_agent import BaseAgent
import json
from DCLSAgents.prompts.data_cleaning_prompts import *

class DataCleaningAndEDA_Agent(BaseAgent):
    def __init__(self, problem_description, context_description, check_unit, var_json, hyp_json, memory=None, llm=None):
        system_message_content = DATA_CLEANING_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            check_unit=check_unit,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            hyp_json=json.dumps(hyp_json, ensure_ascii=False, indent=2)
        )
        
        super().__init__(
            name="Data Cleaning and EDA",
            model=llm if llm else "gpt-4o-mini",
            system_prompt=system_message_content,
        )
        self.context_description = context_description
        self.var_json = var_json
        self.problem_description = problem_description
        self.check_unit = check_unit
        self.info("DataCleaningAndEDA_Agent initialized with tools")
    
    def analyze_data_dimension_cli(self, result, context_description):
        request = DIMENSION_ANALYSIS_TEMPLATE_2.format(
            result=result,
            context_description=context_description
        )
        response = self.analyzing(request)
        return response
    
    def check_for_invalid_values_cli(self, result, context_description, variable_descriptions):
        """
        Use LLM to analyze whether there are invalid or unreasonable values in the data description.
        """
        request = INVALID_VALUE_TEMPLATE_2.format(
            data_describe=result,
            context_description=context_description,
            variable_descriptions=variable_descriptions
        )
        response = self.analyzing(request)
        return response if response else "no problem"
        

    def analyze_missing_values_result_cli(self, result, missing_data_str, data_unit):
        request = MISSING_VALUE_CLEANING_TEMPLATE_2.format(
            missing_ratio=missing_data_str,
            missing_analysis=result,
            data_unit=data_unit
        )
        response = self.analyzing(request)
        return response if response else "no problem"
    
    def generate_data_integrity_check_code_cli(self, csv_file_path):
        request = DATA_INTEGRITY_CHECK_TEMPLATE_2.format(
            csv_path=csv_file_path,
        )
        response = self.coding(request)
        return response
    
    def analyze_and_generate_fillna_operations_cli(self, result):
        request = DATA_INTEGRITY_CLEANING_TEMPLATE_2.format(
            integrity_result=result,
        )
        response = self.analyzing(request)
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

        generated_code = self.coding(input_data)
        return generated_code
        
    def generate_eda_questions_cli(self, problem_description, data_info, data_preview):
        """
        Generate data exploration related questions based on cleaned data.
        """
        input_data = EDA_QUESTIONS_TEMPLATE_2.format(
            problem_description=problem_description,
            data_structure=data_info,
            data_preview=data_preview
        )
        response = self.analyzing(input_data)
        return response
        
    def generate_eda_code_cli(self, csv_file_path, question, data_info, data_preview):
        input_data = EDA_CODE_TEMPLATE_2.format(
            csv_path=csv_file_path,
            question=question,
            data_structure=data_info,
            data_preview=data_preview
        )
        
        generated_code = self.coding(input_data)
        return generated_code

    def analyze_eda_result_cli(self, question, result, attempt):
        input_data = EDA_ANALYSIS_TEMPLATE_2.format(
            question=question,
            result=result,
            attempt=attempt
        )
        response = self.answer(input_data)
        return response    
    
    
    def dimension_analysis_cli(self,csv_file_path, context_description,dimension_check_result=None):
        """
        Execute dimension analysis task.

        Parameters:
            csv_file_path (str): Data file path.
            dimension_check_code (str): Dimension analysis code.
            dimension_check_result (str): Dimension analysis result.
        
        Returns:
            list: List of dimension analysis problems.
        """
        pass
    

    def analyze_eda_result_cli(self, question, action, eda_result):
        """
        Analyze the result of a single EDA question and generate conclusions
        
        Parameters:
        - question: EDA question
        - action: Analysis action performed
        - eda_result: Execution result
        
        Returns:
        - Analysis conclusion text
        """
        self.info(f"Analyzing EDA result for question: {question}")
        # Use simplified template to analyze results
        prompt = f"""
Based on the following EDA question and execution results, please provide a concise analysis conclusion:

#### Question: {question}
#### Action: {action}
#### Execution Result:
{eda_result}

Please provide a concise and clear analysis conclusion (1-2 sentences):
1. don't include the larger than h4 headings
2. Avoid using markdown headings or lists unless absolutely necessary.
"""
        
        response = self.answer(prompt)
        self.info("Successfully analyzed EDA result")
        return response if response else "Analysis completed, but unable to generate specific conclusions."

    def generate_eda_summary_cli(self, eda_results, problem_description, context_description):
        """
        CLI method: Generate comprehensive summary based on all EDA results
        
        Parameters:
        - eda_results: List of EDA results
        - problem_description: Problem description
        - context_description: Context description
        
        Returns:
        - Comprehensive EDA summary text
        """
        self.info("Generating comprehensive EDA summary")
        # Build summary prompt
        results_text = ""
        if eda_results:
            for i, result in enumerate(eda_results, 1):
                if isinstance(result, dict):
                    question = result.get('question', 'Unknown question')
                    conclusion = result.get('conclusion', 'No conclusion')
                    results_text += f"{i}. Question: {question}\n   Conclusion: {conclusion}\n\n"
                elif isinstance(result, list):
                    for subresult in result:
                        if isinstance(subresult, dict):
                            question = subresult.get('question', 'Unknown question')
                            conclusion = subresult.get('conclusion', 'No conclusion')
                            results_text += f"{i}. Question: {question}\n   Conclusion: {conclusion}\n\n"
        
        prompt = f"""
Based on the following exploratory data analysis results, please generate a comprehensive data analysis summary report:

#### Project Background:
{problem_description}

#### Data Background:
{context_description}

#### EDA Analysis Results:
{results_text}

Please generate a structured EDA summary report including:
1. Data Overview
2. Key Findings
3. Data Quality Assessment
4. Critical Insights
5. don't include the larger than h4 headings
6. Avoid using markdown headings or lists unless absolutely necessary.

Requirements: Use markdown format with content that is professional and easy to understand. Keep responses concise and clear, avoid unnecessary headings unless essential.
"""
        
        response = self.answer(prompt)
        self.info("Successfully generated comprehensive EDA summary")
        return response if response else "Unable to generate valid comprehensive EDA summary."
