from .base_agent import BaseDSLC_Agent
import json
import pandas as pd
import os
import re
from langchain.memory import ConversationBufferMemory
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

    def suggest_modeling_methods(self):
        """
        根据问题描述、背景信息和已更新的问题生成最多三种从好到坏的建模方法。
        
        返回值：
        - 包含最多三种建模方法的 JSON 格式列表。
        - 如果生成失败，返回error_message字符串。
        """
        self.logger.info("Generating modeling method suggestions")
        try:
            input_data = MODELING_METHODS_TEMPLATE.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                eda_summary=self.eda_summary
            )

            response = self.execute(input_data)
            modeling_methods = self.parse_llm_json(response)
            
            if modeling_methods:
                self.logger.info(f"Successfully generated {len(modeling_methods)} modeling methods")
                return modeling_methods
            else:
                self.logger.warning("Failed to generate valid modeling methods list")
                return "未能生成有效的建模方法列表。"
        except Exception as e:
            self.logger.error(f"Error suggesting modeling methods: {str(e)}")
            return f"执行过程中出现错误：{str(e)}"
        
    def suggest_model_methods_cli(self):
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
            return "cloud not generate modeling methods"

    def suggest_feature_engineering_methods(self, data_path: str):
        """
        根据问题描述、背景信息和数据集列名生成最多三种特征工程方法建议。
        
        参数：
        - data_path: 数据集文件路径
        
        返回值：
        - 包含最多三种特征工程方法的 JSON 格式列表。
        - 如果生成失败，返回error_message字符串。
        """
        self.logger.info(f"Generating feature engineering method suggestions for {data_path}")
        try:
            # 读取数据集获取列名
            df = pd.read_csv(data_path)
            column_names = list(df.columns)
            
            input_data = FEATURE_ENGINEERING_TEMPLATE.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                column_names=", ".join(column_names)  # 将列名列表转换为字符串
            )

            response = self.execute(input_data)
            feature_engineering_methods = self.parse_llm_json(response)
            
            if feature_engineering_methods:
                self.logger.info(f"Successfully generated {len(feature_engineering_methods)} feature engineering methods")
                return feature_engineering_methods
            else:
                self.logger.warning("Failed to generate valid feature engineering methods list")
                return "未能生成有效的特征工程方法列表。"
        except Exception as e:
            self.logger.error(f"Error suggesting feature engineering methods: {str(e)}")
            return f"执行过程中出现错误：{str(e)}"
    
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

    def identify_response_variable(self, data_path):
        """
        根据问题描述、背景信息和数据集列名分析并识别响应变量。
        
        返回值：
        - 包含响应变量信息的 JSON 格式字典。
        - 如果识别失败，返回error_message字符串。
        """
        self.logger.info(f"Identifying response variable from {data_path}")
        try:
            # 读取数据集获取列名
            df = pd.read_csv(data_path)
            column_names = list(df.columns)
            
            input_data = RESPONSE_VARIABLE_TEMPLATE.format(
                problem_description=self.problem_description,
                context_description=self.context_description,
                column_names=column_names
            )

            response = self.execute(input_data)
            response_var_list = self.parse_llm_json(response)
            
            # 验证响应变量是否在数据集列名中
            if isinstance(response_var_list, list):
                valid_responses = []
                for var_info in response_var_list:
                    if var_info and var_info["响应变量"] in column_names:
                        column = df[var_info["响应变量"]]
                        
                        if var_info["变量类型"] == "离散型":
                            # 对离散型变量，存储所有可能的取值
                            unique_values = column.unique().tolist()
                            # 如果是数值型，转换为普通Python数值类型
                            unique_values = [item.item() if hasattr(item, 'item') else item for item in unique_values]
                            var_info["可能取值"] = sorted(unique_values)
                        else:  # 连续型
                            # 对连续型变量，存储最小值和最大值
                            var_info["取值范围"] = {
                                "最小值": float(column.min()),
                                "最大值": float(column.max())
                            }
                        
                        valid_responses.append(var_info)
                        self.logger.info(f"Successfully identified response variable: {var_info}")
                
                if valid_responses:
                    self.response_variable = json.dumps(valid_responses, ensure_ascii=False, indent=2)
                    return valid_responses
                else:
                    self.logger.warning("No valid response variables found in dataset")
                    return "未能识别有效的响应变量，或识别的响应变量不在数据集中。"
            else:
                self.logger.warning("Response is not a list format")
                return "响应格式错误，应为列表格式。"
        except Exception as e:
            self.logger.error(f"Error identifying response variable: {str(e)}")
            return f"识别响应变量时发生错误: {str(e)}"

    def generate_combined_model_code(self, csv_path, model_methods, feature_engineering_methods=None):
        """
        为多个模型生成一个统一的训练和评估代码文件。

        参数：
        - csv_path: 包含清理后数据的文件路径。
        - model_methods: 模型方法列表，每个方法包含方法和描述信息。
        - feature_engineering_methods: 特征工程方法列表，每个方法包含名称和描述。

        返回值：
        - 生成的完整Python代码字符串。
        - 如果生成失败，返回error_message字符串。
        """
        self.logger.info(f"Generating combined model code for {len(model_methods)} models")
        try:
            data = pd.read_csv(csv_path)
            
            # 定义可用的特征工程工具函数
            tools = [
                'transform_features',
                'reduce_dimensions',
                'select_features',
                'discretize_features',
                'create_polynomial_features'
            ]

            # 读取工具函数文档
            doc_path = 'tools/ml_tools_doc/feature_engineering_tools.md'
            with open(doc_path, 'r', encoding='utf-8') as f:
                tool_descriptions = f.read()
            
            # 构建包含所有模型信息的输入
            models_json = json.dumps(model_methods, ensure_ascii=False, indent=2)
            
            input_data = COMBINED_MODEL_CODE_TEMPLATE.format(
                models=models_json,
                feature_engineering_methods=json.dumps(feature_engineering_methods, ensure_ascii=False, indent=2) if feature_engineering_methods else "[]",
                problem_description=self.problem_description,
                context_description=self.context_description,
                csv_path=csv_path,
                csv_columns=', '.join(data.columns),
                tools=json.dumps(tools, ensure_ascii=False, indent=2),
                tool_descriptions=tool_descriptions,
                response_variable=self.response_variable
            )
            #print(input_data)

            generated_code, _ = self.chat_with_memory(input_data, ConversationBufferMemory())
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            
            if code_match:
                extracted_code = code_match.group(1)
                
                # 添加路径设置代码
                path_setup_code = '''import os,sys,re
current_path = os.path.abspath(__file__)
match = re.search(r'(.*MyAgent)', current_path)
if not match:
    raise FileNotFoundError("Could not find MyAgent directory")
sys.path.append(match.group(1))
from tools.ml_tools import *

'''
                final_code = path_setup_code + extracted_code
                self.logger.info("Successfully generated combined model code")
                return f"```python\n{final_code}\n```"
            self.logger.warning("Failed to extract Python code from generated text")
            return "未生成代码。"
        except Exception as e:
            self.logger.error(f"Error generating combined model code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"

    def train_and_evaluate_combined_models(self, csv_path, model_methods, feature_engineering_methods=None, max_attempts=5):
        """
        生成并执行包含所有模型的统一代码。

        参数：
        - csv_path: 包含清理后数据的文件路径。
        - model_methods: 模型方法列表，每个方法包含方法和描述信息。
        - feature_engineering_methods: 特征工程方法列表，每个方法包含名称和描述。
        - max_attempts: 代码生成的最大尝试次数

        返回值：
        - 包含所有模型训练与评估结果的 JSON 列表。
        """
        self.logger.info(f"Starting combined model training and evaluation for {csv_path}")
        data_dir = os.path.dirname(os.path.dirname(csv_path))
        code_dir = os.path.join(data_dir, 'code')
        os.makedirs(code_dir, exist_ok=True)

        code_file = os.path.join(code_dir, "train_models.py")

        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                self.logger.info("Generating combined model code")
                code = self.generate_combined_model_code(
                    csv_path=csv_path,
                    model_methods=model_methods,
                    feature_engineering_methods=feature_engineering_methods
                )
                
                if "未生成代码" in code:
                    self.logger.warning("Failed to generate combined model code")
                    continue

                self.logger.info("Executing combined model code")
                result = self.execute_generated_code(code, save_path=code_file)
                if "代码执行失败，已达到最大重试次数" in result:
                    self.logger.warning(f"Code execution failed after max retries, attempting regeneration")
                    continue  # 尝试重新生成代码
                
                self.logger.info("Successfully executed combined model code")
                return {"结果": result}
                
            except Exception as e:
                self.logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue  # 尝试下一次

        return {"结果": f"在{max_attempts}次尝试后未能成功生成和执行代码。"}

    def generate_batch_evaluation_code(self, datasets_dir, model_code_path):
        """
        生成用于批量评估数据集的代码。
        
        参数：
        - datasets_dir: 包含多个数据集的目录路径
        - model_code_path: 已有的模型训练代码文件路径
        
        返回值：
        - 生成的Python代码字符串
        """
        self.logger.info(f"Generating batch evaluation code for {datasets_dir}")
        try:
            # 读取模型训练代码
            with open(model_code_path, 'r', encoding='utf-8') as f:
                model_code = f.read()
            
            input_data = BATCH_EVALUATION_TEMPLATE.format(
                datasets_dir=datasets_dir,
                model_code=model_code,
                problem_description=self.problem_description,
                context_description=self.context_description,
            )
            
            generated_code, _ = self.chat_with_memory(input_data, ConversationBufferMemory())
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            
            if code_match:
                extracted_code = code_match.group(1)
                path_setup_code = '''import os,sys,re
current_path = os.path.abspath(__file__)
match = re.search(r'(.*MyAgent)', current_path)
if not match:
    raise FileNotFoundError("Could not find MyAgent directory")
sys.path.append(match.group(1))
from tools.ml_tools import transform_features,reduce_dimensions,select_features,discretize_features,create_polynomial_features

'''
                final_code = path_setup_code + extracted_code
                self.logger.info("Successfully generated batch evaluation code")
                return f"```python\n{final_code}\n```"
            self.logger.warning("Failed to extract Python code from generated text")
            return "未生成代码。"
        except FileNotFoundError:
            self.logger.error(f"Model code file not found: {model_code_path}")
            return f"找不到模型代码文件：{model_code_path}"
        except Exception as e:
            self.logger.error(f"Error generating batch evaluation code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"


    def execute_batch_evaluation(self, datasets_dir, model_code_path, max_attempts=3):
        """
        生成并执行批量评估代码。
        
        参数：
        - datasets_dir: 包含多个数据集的目录路径
        - model_code_path: 已有的模型训练代码文件路径
        - max_attempts: 代码生成的最大尝试次数
        
        返回值：
        - 评估结果字典
        """
        self.logger.info(f"Starting batch evaluation for {datasets_dir}")
        
        code_dir = os.path.dirname(model_code_path)
        code_file = os.path.join(code_dir, "batch_evaluation.py")

        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                
                # 生成批量评估代码
                code = self.generate_batch_evaluation_code(
                    datasets_dir=datasets_dir,
                    model_code_path=model_code_path
                )
                
                if "未生成代码" in code or "错误" in code:
                    self.logger.warning("Failed to generate batch evaluation code")
                    continue
                
                # 执行代码并获取结果
                self.logger.info("Executing batch evaluation code")
                result = self.execute_generated_code(code, save_path=code_file)
                
                # 简化验证：只检查是否包含5个结果
                if "'dataset':" in result and result.count("'dataset':") >= 5:
                    self.logger.info("Successfully executed batch evaluation code with 5 or more results")
                    return result
                else:
                    self.logger.warning(f"Result contains fewer than 5 datasets, retrying...")
                    continue
                
            except Exception as e:
                self.logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue

        return {"结果": f"在{max_attempts}次尝试后未能生成包含5个数据集的结果。"}

    def summarize_evaluation_results(self, results: dict, csv_path: str = None) -> str:
        """
        将模型评估结果转换为易读的文本格式，并可选择保存到文件
        
        Args:
            results: 包含评估结果的字典
            csv_path: 原始CSV文件路径，用于确定保存总结的位置
            
        Returns:
            str: 格式化的结果总结文本
        """
        self.logger.info("Generating evaluation results summary")
        try:
            input_data = RESULT_SUMMARY_TEMPLATE.format(
                results=json.dumps(results, ensure_ascii=False, indent=2),
            )
            
            summary, _ = self.chat_with_memory(input_data, ConversationBufferMemory())
            code_match = re.search(r"```markdown\n(.*?)\n```", summary, re.DOTALL)
            if code_match:
                summary= code_match.group(1).strip()
            self.logger.info("Successfully generated evaluation summary")
            
            # 如果提供了CSV路径，将总结保存到同一目录
            if csv_path:
                try:
                    # 获取CSV所在目录
                    output_dir = os.path.dirname(csv_path)
                    # 创建总结文件名
                    summary_filename = "model_evaluation_summary.md"
                    summary_path = os.path.join(output_dir, summary_filename)
                    
                    # 保存总结到文件
                    with open(summary_path, 'w', encoding='utf-8') as f:
                        f.write(summary)
                    
                    self.logger.info(f"Evaluation summary saved to: {summary_path}")
                except Exception as e:
                    self.logger.error(f"Error saving summary to file: {str(e)}")
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Error generating evaluation summary: {str(e)}")
            return f"生成评估总结时出现错误：{str(e)}"