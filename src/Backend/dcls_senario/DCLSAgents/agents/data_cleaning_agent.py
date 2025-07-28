# agents/data_cleaning_agent.py
from .base_agent import BaseDSLC_Agent
import json
import pandas as pd
import re
from DCLSAgents.prompts.data_cleaning_prompts import *
from DCLSAgents.tools import *
import os


class DataCleaningAndEDA_Agent(BaseDSLC_Agent):
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
            system_message=system_message_content,
            memory=memory,
            llm=llm
        )
        
        self.context_description = context_description
        self.var_json = var_json
        self.problem_description = problem_description
        self.check_unit = check_unit
        
        # Initialize tools
        # self.image_tool = ImageToTextTool(llm=None)  # LLM dependency removed
        self.logger.info("DataCleaningAndEDA_Agent initialized with tools")
    
    def generate_cleaning_task_list(self):
        """
        Generate a sequential list of data cleaning tasks.
        """
        self.logger.info("Generating cleaning task list")
        try:
            input_data = TASK_LIST_TEMPLATE.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                check_unit=self.check_unit,
                var_json=json.dumps(self.var_json, ensure_ascii=False, indent=2)
            )

            response = self.execute(input_data)
            parsed_json = self.parse_llm_json(response)

            if parsed_json:
                self.logger.info(f"Successfully generated {len(parsed_json)} cleaning tasks")
                return parsed_json
            else:
                self.logger.warning("No cleaning tasks detected")
                return "No data cleaning tasks detected."
        except Exception as e:
            self.logger.error(f"Error generating cleaning task list: {str(e)}")
            raise

    def generate_dimension_check_code(self, csv_file_path, context_description):
        """
        Generate Python code for checking data dimensions.
        """
        self.logger.info(f"Generating dimension check code for {csv_file_path}")
        try:
            input_data = DIMENSION_CHECK_TEMPLATE.format(
                csv_path=csv_file_path,
                context_description=context_description
            )
            generated_code = self.chat_without_memory(input_data)
            self.logger.info("Successfully generated dimension check code")
            return generated_code
        except Exception as e:
            self.logger.error(f"Error generating dimension check code: {str(e)}")
            raise
    
    def analyze_data_dimension_cli(self, result, context_description):
        request = DIMENSION_ANALYSIS_TEMPLATE_2.format(
            result=result,
            context_description=context_description
        )
        response = self.chat_without_memory(request)
        if response == "no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        return parsed_json if parsed_json else "no problem"
    
    def check_for_invalid_values_cli(self, result, context_description, variable_descriptions):
        """
        Use LLM to analyze whether there are invalid or unreasonable values in the data description.
        """
        request = INVALID_VALUE_TEMPLATE_2.format(
            data_describe=result,
            context_description=context_description,
            variable_descriptions=variable_descriptions
        )
        response = self.chat_without_memory(request)
        if response == "no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        return parsed_json if parsed_json else "no problem"
        
    def generate_missing_value_analysis_code_cli(self, csv_file_path, missing_data_str):
        input_data = MISSING_VALUE_CODE_TEMPLATE_2.format(
            missing_ratio=missing_data_str,
            csv_path=csv_file_path
        )
        
        generated_code = self.chat_without_memory(input_data)
        if re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL):
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            return code_match.group(1)
        else:
            return generated_code

    def analyze_missing_values_result_cli(self, result, missing_data_str, data_unit):
        request = MISSING_VALUE_CLEANING_TEMPLATE_2.format(
            missing_ratio=missing_data_str,
            missing_analysis=result,
            data_unit=data_unit
        )
        response = self.chat_without_memory(request)
        if response == "no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        return parsed_json if parsed_json else "no problem"
    
    def generate_data_integrity_check_code_cli(self, csv_file_path):
        request = DATA_INTEGRITY_CHECK_TEMPLATE_2.format(
            csv_path=csv_file_path,
        )
        response = self.chat_without_memory(request)
        if response:
            if re.search(r"```python\n(.*?)\n```", response, re.DOTALL):
                code_match = re.search(r"```python\n(.*?)\n```", response, re.DOTALL)
                return code_match.group(1)
            else:
                return response
        else:
            return "no problem"
    
    def analyze_and_generate_fillna_operations_cli(self, result):
        request = DATA_INTEGRITY_CLEANING_TEMPLATE_2.format(
            integrity_result=result,
        )
        response = self.chat_without_memory(request)
        if response == "no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        return parsed_json if parsed_json else "no problem"

    def generate_hypothesis_validation_code(self, csv_file_path, hypothesis):
        """
        Generate Python code for validating a single hypothesis.
        """
        self.logger.info(f"Generating hypothesis validation code for {csv_file_path}")
        try:
            input_data = HYPOTHESIS_VALIDATION_CODE_TEMPLATE.format(
                csv_path=csv_file_path,
                hypothesis=hypothesis['hypothesis'],
                validation_method=hypothesis['verification_method']
            )
            generated_code = self.chat_without_memory(input_data)
            self.logger.info("Successfully generated hypothesis validation code")
            return generated_code
        except Exception as e:
            self.logger.error(f"Error generating hypothesis validation code: {str(e)}")
            raise
    
    def analyze_hypothesis_validation_result(self, validation_result):
        """
        Analyze whether the hypothesis is valid based on validation results and generate updated hypothesis conclusions.
        """
        self.logger.info("Analyzing hypothesis validation results")
        try:
            input_data = HYPOTHESIS_VALIDATION_ANALYSIS_TEMPLATE.format(
                validation_result=validation_result
            )

            response = self.chat_without_memory(input_data)
            updated_hypothesis = self.parse_llm_json(response)
            if updated_hypothesis:
                self.logger.info("Successfully analyzed hypothesis validation results")
                return updated_hypothesis
            else:
                self.logger.warning("Failed to analyze hypothesis validation results")
                return "Failed to analyze hypothesis validation results"
        except Exception as e:
            self.logger.error(f"Error analyzing hypothesis validation: {str(e)}")
            raise
        
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

        generated_code = self.chat_without_memory(input_data)
        code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
        if code_match:
            self.logger.info("Successfully generated cleaning code")
            extracted_code = code_match.group(1)
            return extracted_code
        else:
            return "print('sorry, I can\\'t generate the code')"
        
    def generate_eda_questions_cli(self, problem_description, data_info, data_preview):
        """
        Generate data exploration related questions based on cleaned data.
        """
        input_data = EDA_QUESTIONS_TEMPLATE_2.format(
            problem_description=problem_description,
            data_structure=data_info,
            data_preview=data_preview
        )
        response = self.chat_without_memory(input_data)
        parsed_json = self.parse_llm_json(response)
        return parsed_json if parsed_json else "no problem"
        
    def generate_eda_code_cli(self, csv_file_path, question, data_info, data_preview):
        input_data = EDA_CODE_TEMPLATE_2.format(
            csv_path=csv_file_path,
            question=question,
            data_structure=data_info,
            data_preview=data_preview
        )
        
        generated_code = self.chat_without_memory(input_data)
        code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
        if code_match:
            self.logger.info("Successfully generated EDA code")
            return code_match.group(1)
        else:
            self.logger.warning("Failed to extract Python code from generated text")
            return "Failed to generate valid Python code."

    def analyze_eda_result_cli(self, question, result, attempt):
        input_data = EDA_ANALYSIS_TEMPLATE_2.format(
            question=question,
            result=result,
            attempt=attempt
        )
        response = self.chat_without_memory(input_data)
        return response    
    
    def solve_eda_questions(self, csv_file_path, eda_questions):
        """
        Main logic for solving EDA questions.
        
        Parameters:
        - csv_file_path: Path to cleaned data.
        - eda_questions: JSON format list of EDA questions.

        Returns:
        - Updated list of EDA questions.
        """
        self.logger.info(f"Starting to solve {len(eda_questions)} EDA questions")
        try:
            updated_questions = []

            for question_item in eda_questions:
                for key, question in question_item.items():
                    if key.startswith("Question"):
                        self.logger.info(f"Processing question: {question}")

                        # TODO: This method needs data_info and data_preview parameters
                        # generated_code = self.generate_eda_code_cli(csv_file_path, question, data_info, data_preview)
                        generated_code = None
                        if not generated_code:
                            self.logger.warning(f"Failed to generate code for question: {question}")
                            updated_questions.append({
                                key: question,
                                "conclusion": "Failed to generate code."
                            })
                            continue

                        try:
                            result = self.execute_generated_code(generated_code=generated_code)
                            result_dict = eval(result)
                            
                            image_analysis_results = []
                            for plot_path in result_dict.get('generated_plots', []):
                                if os.path.exists(plot_path):
                                    self.logger.info(f"Analyzing plot: {plot_path}")
                                    image_analysis = self.analyze_image(
                                        image_path=plot_path,
                                        prompt="Please analyze this data visualization chart and describe the main trends, patterns, and key findings."
                                    )
                                    image_analysis_results.append(image_analysis)
                            
                            combined_result = {
                                'text_result': result_dict.get('text_result', ''),
                                'image_analysis': '\n'.join(image_analysis_results)
                            }

                            updated_question = self.analyze_eda_result_cli(
                                question=question,
                                result=combined_result['text_result'],
                                attempt=combined_result['image_analysis']
                            )
                            updated_questions.append(updated_question)
                            self.logger.info(f"Successfully processed question: {question}")
                            
                        except Exception as exec_error:
                            self.logger.error(f"Error executing code for question {question}: {str(exec_error)}")
                            updated_questions.append({
                                key: question,
                                "conclusion": f"Code execution failed: {str(exec_error)}"
                            })

            return updated_questions
        except Exception as e:
            self.logger.error(f"Error solving EDA questions: {str(e)}")
            return f"Error occurred during execution: {str(e)}"
        
    def generate_pcs_evaluation_code(self, csv_file_path, conclusion):
        """
        Generate Python code for PCS evaluation based on conclusions.

        Parameters:
        - csv_file_path: Path to cleaned data.
        - conclusion: Conclusion to be evaluated.

        Returns:
        - Generated Python code.
        """
        self.logger.info(f"Generating PCS evaluation code for {csv_file_path}")
        try:
            data = pd.read_csv(csv_file_path)
            from io import StringIO
            buffer = StringIO()
            data.info(buf=buffer)
            datainfo = buffer.getvalue()

            input_data = PCS_EVALUATION_TEMPLATE.format(
                csv_path=csv_file_path,
                conclusions=conclusion,
                data_structure=datainfo,
                data_preview=', '.join(data.columns)
            )

            response = self.chat_without_memory(input_data)
            self.logger.info("Successfully generated PCS evaluation code")
            return response
        except Exception as e:
            self.logger.error(f"Error generating PCS evaluation code: {str(e)}")
            raise
    
    def check_discrete_variables(self, csv_file_path, question):
        """
        Determine whether discrete variables in the data need to be numerically encoded.

        Parameters:
        - csv_file_path: Path to cleaned data
        - question: Problem to be solved.

        Returns:
        - If numerical encoding is needed, return True.
        - If numerical encoding is not needed, return False.
        """
        self.logger.info(f"Checking discrete variables for {csv_file_path}")
        try:
            input_data = DISCRETE_VAR_CHECK_TEMPLATE.format(
                csv_path=csv_file_path,
                problem_description=question
            )
            response = self.chat_without_memory(input_data)
            response_json = self.parse_llm_json(response)

            if response_json and isinstance(response_json, list):
                result = response_json[0].get("needs_encoding", False)
                self.logger.info(f"Discrete variables check result: {result}")
                return result
            else:
                self.logger.warning("Failed to parse discrete variables check result")
                return False
        except Exception as e:
            self.logger.error(f"Error checking discrete variables: {str(e)}")
            return False
    
    def generate_discrete_variable_code(self, csv_file_path):
        """
        Generate Python code for handling discrete variables.

        Parameters:
        - csv_file_path: Path to cleaned data.

        Returns:
        - Generated Python file path.
        """
        self.logger.info(f"Generating discrete variable code for {csv_file_path}")
        try:
            data = pd.read_csv(csv_file_path)
            # Get discrete variables and their unique values
            discrete_variables = {
                col: data[col].unique().tolist()
                for col in data.select_dtypes(include=['object', 'category']).columns
            }
            discrete_info = json.dumps(discrete_variables, ensure_ascii=False, indent=2)

            input_data = DISCRETE_VAR_CODE_TEMPLATE.format(
                csv_path=csv_file_path,
                discrete_vars=discrete_info
            )
            response = self.chat_without_memory(input_data)
            code_match = re.search(r"```python\n(.*?)\n```", response, re.DOTALL)

            if not code_match:
                self.logger.warning("No valid code content generated by LLM")
                return "LLM did not generate valid code content."

            extracted_code = code_match.group(1)
            py_filename = os.path.basename(csv_file_path).replace('.csv', '_transformed.py')
            py_file_path = os.path.join(os.path.dirname(csv_file_path), py_filename)

            with open(py_file_path, 'w', encoding='utf-8') as py_file:
                py_file.write(extracted_code)

            self.logger.info(f"Successfully generated discrete variable code: {py_file_path}")
            return py_file_path
        except Exception as e:
            self.logger.error(f"Error generating discrete variable code: {str(e)}")
            return f"Error occurred during execution: {str(e)}"

    def load_and_compare_data(self, csv_file_path):
        """
        Load the first 10 rows and random 10 rows of the CSV file, send these 20 rows to LLM for comparison and verify that the data is loaded correctly.
        """
        self.logger.info(f"Loading and comparing data from {csv_file_path}")
        try:
            data = pd.read_csv(csv_file_path)
            first_10_rows = data.head(10)
            random_10_rows = data.sample(10)

            first_10_dict = first_10_rows.to_dict(orient="records")
            random_10_dict = random_10_rows.to_dict(orient="records")
            first_10_str = json.dumps(first_10_dict, ensure_ascii=False, indent=2)
            random_10_str = json.dumps(random_10_dict, ensure_ascii=False, indent=2)

            input_data = DATA_LOADING_TEMPLATE.format(
                first_10_rows=first_10_str,
                random_10_rows=random_10_str
            )
            response = self.chat_without_memory(input_data)
            self.logger.info("Successfully compared data samples")
            return response
        except Exception as e:
            self.logger.error(f"Error loading and comparing data: {str(e)}")
            return f"Error occurred while loading and comparing data: {str(e)}"
        
    def _execute_single_task(self, task_name, csv_file_path):
        """Execute a single cleaning task"""
        if task_name == 'Dimension Analysis':
            dimension_check_code = self.generate_dimension_check_code(csv_file_path, self.context_description)
            dimension_check_result = self.execute_generated_code(dimension_check_code)
            return self.analyze_data_dimension_cli(dimension_check_result, self.context_description)
        
        elif task_name == 'Invalid Value Analysis':
            data = pd.read_csv(csv_file_path)
            data_describe = data.select_dtypes('number').describe().to_string()
            return self.check_for_invalid_values_cli(data_describe, self.context_description, self.var_json)
        
        elif task_name == 'Missing Value Analysis':
            data = pd.read_csv(csv_file_path)
            missing_ratio = data.isnull().mean().to_string()
            missing_value_code = self.generate_missing_value_analysis_code_cli(csv_file_path, missing_ratio)
            missing_value_result = self.execute_generated_code(missing_value_code)
            return self.analyze_missing_values_result_cli(missing_value_result, missing_ratio, self.check_unit)
        
        elif task_name == 'Data Integrity Analysis':
            data_integrity_code = self.generate_data_integrity_check_code_cli(csv_file_path)
            data_integrity_result = self.execute_generated_code(data_integrity_code)
            return self.analyze_and_generate_fillna_operations_cli(data_integrity_result)
        
        else:
            raise ValueError(f"Unknown task: {task_name}")
    
    def execute_cleaning_tasks(self, task_list, csv_file_path):
        """
        Execute data cleaning tasks sequentially according to the task list.
        
        Returns:
            tuple: (cleaning_operations, error_logs)
        """
        self.logger.info(f"Starting execution of {len(task_list)} cleaning tasks")
        problem_list, cleaning_operations, error_logs = [], [], []

        for task in task_list:
            task_name = task.get('task_name')
            self.logger.info(f"Processing task: {task_name}")

            try:
                result = self._execute_single_task(task_name, csv_file_path)
                if isinstance(result, list):
                    if task_name in ['Dimension Analysis', 'Invalid Value Analysis']:
                        problem_list.extend(result)
                    else:
                        cleaning_operations.extend(result)
                        
            except Exception as e:
                error_message = f"Error in task {task_name}: {str(e)}"
                self.logger.error(error_message)
                error_logs.append({"task_name": task_name, "error_message": error_message})

        # Generate cleaning operations from problem list
        if problem_list:
            try:
                request = CLEANING_OPERATIONS_TEMPLATE_2.format(problem_list=json.dumps(problem_list, ensure_ascii=False, indent=2))
                response = self.chat_without_memory(request)
                problem_operations = self.parse_llm_json(response) if response != "no problem" else "no problem"
                if isinstance(problem_operations, list):
                    cleaning_operations.extend(problem_operations)
            except Exception as e:
                error_logs.append({"task_name": "Problem Operations", "error_message": str(e)})

        return cleaning_operations, error_logs
    
    
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
        if dimension_check_result is None and csv_file_path is not None:
            dimension_check_code = self.generate_dimension_check_code(csv_file_path=csv_file_path, context_description=context_description)
            # Check if there is ```python```
            if re.search(r"```python", dimension_check_code):
                # Extract content between ```python and ```   
                code_match = re.search(r"```python\n(.*?)```", dimension_check_code, flags=re.DOTALL)
                if code_match:
                    return code_match.group(1).strip()
                else:
                    code_match = re.search(r"```python\n(.*)", dimension_check_code, flags=re.DOTALL)
                    if code_match:
                        return code_match.group(1).strip()
            else:
                return dimension_check_code
            
        dimension_problems = self.analyze_data_dimension(dimension_check_result, context_description)
        return dimension_problems
    


    def generate_eda_summary(self, eda_results):
        """
        Generate a summary report based on completed EDA questions list.

        Parameters:
        - eda_results: List of EDA results containing questions and conclusions

        Returns:
        - A complete EDA summary text
        """
        self.logger.info("Generating EDA summary from results")
        try:
            input_data = EDA_SUMMARY_TEMPLATE.format(
                eda_results=json.dumps(eda_results, ensure_ascii=False, indent=2),
                problem_description=self.problem_description
            )
            
            response = self.chat_without_memory(input_data)
            self.logger.info("Successfully generated EDA summary")
            return response if response else "Unable to generate valid EDA analysis summary."
        except Exception as e:
            self.logger.error(f"Error generating EDA summary: {str(e)}")
            return "Unable to generate valid EDA analysis summary."

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
        self.logger.info(f"Analyzing EDA result for question: {question}")
        try:
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
            
            response = self.chat_without_memory(prompt)
            self.logger.info("Successfully analyzed EDA result")
            return response if response else "Analysis completed, but unable to generate specific conclusions."
        except Exception as e:
            self.logger.error(f"Error analyzing EDA result: {str(e)}")
            return "Analysis completed, but unable to generate specific conclusions."

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
        self.logger.info("Generating comprehensive EDA summary")
        try:
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
            
            response = self.chat_without_memory(prompt)
            self.logger.info("Successfully generated comprehensive EDA summary")
            return response if response else "Unable to generate valid comprehensive EDA summary."
        except Exception as e:
            self.logger.error(f"Error generating comprehensive EDA summary: {str(e)}")
            return "Unable to generate valid comprehensive EDA summary."

