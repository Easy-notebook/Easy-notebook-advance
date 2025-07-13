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
        
        # 初始化工具
        # self.image_tool = ImageToTextTool(llm=None)  # LLM dependency removed
        self.logger.info("DataCleaningAndEDA_Agent initialized with tools")
    
    def generate_cleaning_task_list(self):
        """
        生成数据清理任务流程的顺序列表。
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
                return "没有检测到需要执行的数据清理任务。"
        except Exception as e:
            self.logger.error(f"Error generating cleaning task list: {str(e)}")
            raise

    def generate_dimension_check_code(self, csv_file_path, context_description):
        """
        生成用于检查数据维度的Python代码。
        """
        self.logger.info(f"Generating dimension check code for {csv_file_path}")
        try:
            input_data = DIMENSION_CHECK_TEMPLATE.format(
                csv_path=csv_file_path,
                context_description=context_description
            )
            generated_code, _ = self.chat_with_memory(input_data,None)
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
        response, _ = self.chat_with_memory(request,None)
        if response=="no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        if parsed_json:
            return parsed_json
        else:
            return "no problem"
    
    def check_for_invalid_values_cli(self, result, context_description, variable_descriptions):
        """
        使用 LLM 来分析数据描述中是否存在无效值或不合理的值。
        """
        request = INVALID_VALUE_TEMPLATE_2.format(
            data_describe=result,
            context_description=context_description,
            variable_descriptions=variable_descriptions
        )
        response = self.chat_without_memory(request)
        if response=="no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        if parsed_json:
            return parsed_json
        else:
            return "no problem"
        
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
        if response=="no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        if parsed_json:
            return parsed_json
        else:
            return "no problem"
    
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
        if response=="no problem":
            return "no problem"
        parsed_json = self.parse_llm_json(response)
        if parsed_json:
            return parsed_json
        else:
            return "no problem"

    def generate_hypothesis_validation_code(self, csv_file_path, hypothesis):
        """
        根据单个假设生成用于验证假设的 Python 代码。
        """
        self.logger.info(f"Generating hypothesis validation code for {csv_file_path}")
        try:
            input_data = HYPOTHESIS_VALIDATION_CODE_TEMPLATE.format(
                csv_path=csv_file_path,
                hypothesis=hypothesis['hypothesis'],
                validation_method=hypothesis['verification_method']
            )
            generated_code, _ = self.chat_with_memory(input_data,None)
            self.logger.info("Successfully generated hypothesis validation code")
            return generated_code
        except Exception as e:
            self.logger.error(f"Error generating hypothesis validation code: {str(e)}")
            raise
    
    def analyze_hypothesis_validation_result(self, validation_result):
        """
        根据验证结果分析假设是否成立，并生成更新的假设结论。
        """
        self.logger.info("Analyzing hypothesis validation results")
        try:
            input_data = HYPOTHESIS_VALIDATION_ANALYSIS_TEMPLATE.format(
                validation_result=validation_result
            )

            response, _ = self.chat_with_memory(input_data,None)
            updated_hypothesis = self.parse_llm_json(response)
            if updated_hypothesis:
                self.logger.info("Successfully analyzed hypothesis validation results")
                return updated_hypothesis
            else:
                self.logger.warning("Failed to analyze hypothesis validation results")
                return None
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
            return "print('sorry, I can't generate the code')"
        
    def generate_eda_questions_cli(self, problem_description, data_info, data_preview):
        """
        基于清理后的数据生成与数据探索相关的问题。
        """
        input_data = EDA_QUESTIONS_TEMPLATE_2.format(
            problem_description=problem_description,
            data_structure=data_info,
            data_preview=data_preview
        )
        response = self.chat_without_memory(input_data)
        parsed_json = self.parse_llm_json(response)
        if parsed_json:
            return parsed_json
        else:
            return "no problem"
        
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
            return "未能生成有效的 Python 代码。"

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
        解决 EDA 问题的主逻辑。
        
        参数：
        - csv_file_path: 清理后的数据路径。
        - eda_questions: JSON 格式的 EDA 问题列表。

        返回值：
        - 更新后的 EDA 问题列表。
        """
        self.logger.info(f"Starting to solve {len(eda_questions)} EDA questions")
        try:
            updated_questions = []

            for question_item in eda_questions:
                for key, question in question_item.items():
                    if key.startswith("问题"):
                        self.logger.info(f"Processing question: {question}")

                        generated_code = self.generate_eda_code(csv_file_path, question)
                        if not generated_code:
                            self.logger.warning(f"Failed to generate code for question: {question}")
                            updated_questions.append({
                                key: question,
                                "结论": "未能生成代码。"
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
                                        prompt="请分析这张数据可视化图表，描述其中的主要趋势、模式和关键发现。"
                                    )
                                    image_analysis_results.append(image_analysis)
                            
                            combined_result = {
                                'text_result': result_dict.get('text_result', ''),
                                'image_analysis': '\n'.join(image_analysis_results)
                            }

                            updated_question = self.analyze_eda_result(
                                question=question,
                                result=combined_result['text_result'],
                                image_analysis=combined_result['image_analysis']
                            )
                            updated_questions.append(updated_question)
                            self.logger.info(f"Successfully processed question: {question}")
                            
                        except Exception as exec_error:
                            self.logger.error(f"Error executing code for question {question}: {str(exec_error)}")
                            updated_questions.append({
                                key: question,
                                "结论": f"代码执行失败: {str(exec_error)}"
                            })

            return updated_questions
        except Exception as e:
            self.logger.error(f"Error solving EDA questions: {str(e)}")
            return f"执行过程中出现错误：{str(e)}"
        
    def generate_pcs_evaluation_code(self, csv_file_path, conclusion):
        """
        根据结论生成用于 PCS 评估的 Python 代码。

        参数：
        - csv_file_path: 清理后的数据路径。
        - conclusion: 待评估的结论。

        返回值：
        - 生成的 Python 代码。
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

            response, _ = self.chat_with_memory(input_data, None)
            self.logger.info("Successfully generated PCS evaluation code")
            return response
        except Exception as e:
            self.logger.error(f"Error generating PCS evaluation code: {str(e)}")
            raise
    
    def check_discrete_variables(self, csv_file_path, question):
        """
        判断是否需要将数据中的离散变量数值化。

        参数：
        - csv_file_path: 清理后的数据路径
        - question: 待解决的问题。

        返回值：
        - 如果需要数值化，返回 True。
        - 如果不需要数值化，返回 False。
        """
        self.logger.info(f"Checking discrete variables for {csv_file_path}")
        try:
            input_data = DISCRETE_VAR_CHECK_TEMPLATE.format(
                csv_path=csv_file_path,
                problem_description=question
            )
            response, _ = self.chat_with_memory(input_data, None)
            response_json = self.parse_llm_json(response)

            if response_json and isinstance(response_json, list):
                result = response_json[0].get("需要数值化", False)
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
        生成处理离散变量的 Python 代码。

        参数：
        - csv_file_path: 清理后的数据路径。

        返回值：
        - 生成的 Python 文件路径。
        """
        self.logger.info(f"Generating discrete variable code for {csv_file_path}")
        try:
            data = pd.read_csv(csv_file_path)
            # 获取离散变量及其唯一值
            discrete_variables = {
                col: data[col].unique().tolist()
                for col in data.select_dtypes(include=['object', 'category']).columns
            }
            discrete_info = json.dumps(discrete_variables, ensure_ascii=False, indent=2)

            input_data = DISCRETE_VAR_CODE_TEMPLATE.format(
                csv_path=csv_file_path,
                discrete_vars=discrete_info
            )
            response, _ = self.chat_with_memory(input_data, None)
            code_match = re.search(r"```python\n(.*?)\n```", response, re.DOTALL)

            if not code_match:
                self.logger.warning("No valid code content generated by LLM")
                return "LLM 未生成有效的代码内容。"

            extracted_code = code_match.group(1)
            py_filename = os.path.basename(csv_file_path).replace('.csv', '_transformed.py')
            py_file_path = os.path.join(os.path.dirname(csv_file_path), py_filename)

            with open(py_file_path, 'w', encoding='utf-8') as py_file:
                py_file.write(extracted_code)

            self.logger.info(f"Successfully generated discrete variable code: {py_file_path}")
            return py_file_path
        except Exception as e:
            self.logger.error(f"Error generating discrete variable code: {str(e)}")
            return f"执行过程中出现错误：{str(e)}"

    def load_and_compare_data(self, csv_file_path):
        """
        加载 CSV 文件的前10行和随机10行，将这20行数据发送给 LLM 进行对比并验证数据是否正确加载。
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
            response, _ = self.chat_with_memory(input_data, None)
            self.logger.info("Successfully compared data samples")
            return response
        except Exception as e:
            self.logger.error(f"Error loading and comparing data: {str(e)}")
            return f"Error occurred while loading and comparing data: {str(e)}"
        
    def execute_cleaning_tasks(self, task_list, csv_file_path):
        """
        根据任务列表依次执行数据清理任务，包括问题列表生成和清理项生成。
        
        Parameters:
            task_list (list): 包含任务名称的任务列表。
            csv_file_path (str): 数据文件路径。
        
        Returns:
            list: 合并后的清理操作项 JSON 列表。
            list: 错误日志记录。
        """
        self.logger.info(f"Starting execution of {len(task_list)} cleaning tasks")
        problem_list = []  # 存储问题列表
        cleaning_operations = []  # 存储清理操作项
        error_logs = []  # 错误日志记录

        for task in task_list:
            task_name = task.get('task_name')
            self.logger.info(f"Processing task: {task_name}")

            try:
                if task_name == 'Dimension Analysis':
                    self.logger.info("Executing dimension analysis task")
                    dimension_check_code = self.generate_dimension_check_code(csv_file_path=csv_file_path, context_description=self.context_description)
                    dimension_check_result = self.execute_generated_code(dimension_check_code)
                    dimension_problems = self.analyze_data_dimension(dimension_check_result, self.context_description)
                    if isinstance(dimension_problems, list):
                        self.logger.info(f"Found {len(dimension_problems)} dimension-related problems")
                        problem_list.extend(dimension_problems)

                elif task_name == 'Invalid Value Analysis':
                    self.logger.info("Executing invalid value analysis task")
                    invalid_value_problems = self.check_for_invalid_values(csv_file_path=csv_file_path)
                    if isinstance(invalid_value_problems, list):
                        self.logger.info(f"Found {len(invalid_value_problems)} invalid value problems")
                        problem_list.extend(invalid_value_problems)

                elif task_name == 'Missing Value Analysis':
                    self.logger.info("Executing missing value analysis task")
                    missing_value_code = self.generate_missing_value_analysis_code(csv_file_path=csv_file_path)
                    missing_value_result = self.execute_generated_code(missing_value_code)
                    missing_value_cleaning = self.analyze_missing_values_result(missing_value_result, csv_file_path=csv_file_path)
                    if isinstance(missing_value_cleaning, list):
                        self.logger.info(f"Generated {len(missing_value_cleaning)} missing value cleaning operations")
                        cleaning_operations.extend(missing_value_cleaning)

                elif task_name == 'Data Integrity Analysis':
                    self.logger.info("Executing data integrity analysis task")
                    data_integrity_code = self.generate_data_integrity_check_code(csv_file_path=csv_file_path)
                    data_integrity_result = self.execute_generated_code(data_integrity_code)
                    data_integrity_cleaning = self.analyze_and_generate_fillna_operations(data_integrity_result)
                    if isinstance(data_integrity_cleaning, list):
                        self.logger.info(f"Generated {len(data_integrity_cleaning)} data integrity cleaning operations")
                        cleaning_operations.extend(data_integrity_cleaning)

                else:
                    error_message = f"Task {task_name} not implemented or unknown"
                    self.logger.warning(error_message)
                    error_logs.append({"task_name": task_name, "error_message": error_message})

            except Exception as e:
                error_message = f"Error in task {task_name}: {str(e)}"
                self.logger.error(error_message)
                error_logs.append({"task_name": task_name, "error_message": error_message})

        # 根据问题列表生成清理操作项
        if problem_list:
            try:
                self.logger.info("Generating cleaning operations from problem list")
                problem_cleaning_operations = self.generate_cleaning_operations(problem_list)
                if isinstance(problem_cleaning_operations, list):
                    self.logger.info(f"Generated {len(problem_cleaning_operations)} additional cleaning operations")
                    cleaning_operations.extend(problem_cleaning_operations)
            except Exception as e:
                error_message = f"Error generating cleaning operations from problem list: {str(e)}"
                self.logger.error(error_message)
                error_logs.append({"task_name": "根据问题列表生成清理操作项", "error_message": error_message})

        return cleaning_operations, error_logs
    
    
    def dimension_analysis_cli(self,csv_file_path, context_description,dimension_check_result=None):
        """
        执行维度分析任务。

        参数:
            csv_file_path (str): 数据文件路径。
            dimension_check_code (str): 维度分析代码。
            dimension_check_result (str): 维度分析结果。
        
        Returns:
            list: 维度分析问题列表。
        """
        if dimension_check_result is None and csv_file_path is not None:
            dimension_check_code = self.generate_dimension_check_code(csv_file_path=csv_file_path, context_description=context_description)
            # 检查是否有```python```
            if re.search(r"```python", dimension_check_code):
                # 提取```python和```之间的内容   
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
    
    def missing_value_analysis_cli(self,csv_file_path, missing_data_str=None, missing_value_check_result=None, check_unit=None):
        """
        执行缺失值分析任务。

        参数:
            csv_file_path (str): 数据文件路径。
            missing_data_str (str): 缺失值分析结果。
            missing_value_check_result (str): 缺失值分析结果。
            check_unit (str): 检查单位。
        """
        if missing_value_check_result is None and csv_file_path is not None and missing_data_str is not None:
            missing_value_code = self.generate_missing_value_analysis_code_cli(csv_file_path=csv_file_path, missing_data_str=missing_data_str)
            # 检查是否有```python```
            if re.search(r"```python", missing_value_code):
                # 提取```python和```之间的内容   
                code_match = re.search(r"```python\n(.*?)```", missing_value_code, flags=re.DOTALL) 
                if code_match:
                    return code_match.group(1).strip()
                else:
                    code_match = re.search(r"```python\n(.*)", missing_value_code, flags=re.DOTALL)
                    if code_match:
                        return code_match.group(1).strip()  
            else:
                return missing_value_code
        
        missing_value_problems = self.analyze_missing_values_result_cli(result=missing_value_check_result, missing_data_str=missing_data_str, data_unit=check_unit)
        return missing_value_problems

    def analyze_image(self, image_path: str, prompt: str = "请分析这个图片") -> str:
        """分析图片内容"""
        return self.image_tool.run(tool_input={
            "image_path": image_path,
            "prompt": prompt
        })

    def generate_eda_summary(self, eda_results):
        """
        根据完成的EDA问题列表生成总结报告。

        参数：
        - eda_results: 包含问题和结论的EDA结果列表

        返回值：
        - 一段完整的EDA总结文本
        """
        self.logger.info("Generating EDA summary from results")
        try:
            input_data = EDA_SUMMARY_TEMPLATE.format(
                eda_results=json.dumps(eda_results, ensure_ascii=False, indent=2),
                problem_description=self.problem_description
            )
            
            response, _ = self.chat_with_memory(input_data, None)
            self.logger.info("Successfully generated EDA summary")
            return response if response else "无法生成有效的EDA分析总结。"
        except Exception as e:
            self.logger.error(f"Error generating EDA summary: {str(e)}")
            return "无法生成有效的EDA分析总结。"


