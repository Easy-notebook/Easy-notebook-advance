from .base_agent import BaseDSLC_Agent
from DCLSAgents.prompts.pcs_prompts import *
import json
import pandas as pd
import re
import os
import shutil

class PCSAgent(BaseDSLC_Agent):
    def __init__(self, problem_description, context_description, memory=None, llm=None):
        """
        初始化 PCS 评估代理。
        
        参数：
        - problem_description: 数据科学项目描述
        - context_description: 数据背景描述
        - var_json: 变量描述（JSON格式）
        - check_unit: 观测单位
        - memory: 可选的记忆组件
        - llm: 可选的语言模型组件
        """
        system_message = PCS_EVALUATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description
        )
        super().__init__(
            name="PCS Evaluation Agent",
            system_message=system_message,
            memory=memory,
            llm=llm
        )
        # self.image_tool = ImageToTextTool(llm=self.llm)
        self.context_description = context_description
        self.problem_description = problem_description
        self.logger.info("PCS Evaluation Agent initialized")
    
    def analyze_image(self, image_path: str, prompt: str = "请分析这个图片") -> str:
        """分析图片内容"""
        return self.image_tool.run(tool_input={
            "image_path": image_path,
            "prompt": prompt
        })
    
    def analyze_pcs_evaluation_result(self, conclusion, result):
        """
        根据代码执行结果对结论进行 PCS 评估。

        参数：
        - conclusion: 原始结论。
        - result: 代码执行的结果。

        返回值：
        - PCS 评估报告（JSON 格式）。
        """
        self.logger.info("Starting PCS evaluation analysis")
        try:
            result_dict = eval(result)
            image_analysis_results = []
            for plot_path in result_dict.get('generated_plots', []):
                if os.path.exists(plot_path):
                    self.logger.info(f"Analyzing plot: {plot_path}")
                    image_analysis = self.analyze_image(
                    image_path=plot_path,
                    prompt="请分析这张数据可视化图表，描述其中的主要趋势、模式和关键发现。期望的返回格式：这是关于{图表名称}的分析，主要趋势是{趋势描述}，模式是{模式描述}，关键发现是{关键发现}。"
                    )
                    image_analysis_results.append(image_analysis)

            combined_result = {
                'text_result': result_dict.get('text_result', ''),
                'image_analysis': '\n'.join(image_analysis_results)
            }

            input_data = EDA_PCS_EVALUATION_TEMPLATE.format(
                conclusion=conclusion,
                result=combined_result
            )

            response = self.execute(input_data)
            pcs_json = self.parse_llm_json(response)
            
            if pcs_json:
                self.logger.info("Successfully completed PCS evaluation")
                return pcs_json
            else:
                self.logger.warning("Failed to parse PCS evaluation result")
                return {"预测性": "无法评估", "稳定性": "无法评估"}
        except Exception as e:
            self.logger.error(f"Error in PCS evaluation: {str(e)}")
            return {"预测性": "评估过程出错", "稳定性": f"error_message：{str(e)}"}


    def evaluate_problem_definition_cli(self, problem_description:str, context_description:str, var_json:str, unit_check:str, relevant_variables_analysis:str):
        """
        基于PCS原则评估问题定义和hypothesis。
        
        参数：
        - problem_description: 数据科学项目描述
        - context_description: 数据背景描述
        - var_json: 变量描述（JSON格式）
        - unit_check: 观测单位
        
        返回值：
        - 生成的hypothesis列表（JSON格式）
        - 如果解析失败，返回error_message字符串
        """
        self.logger.info("Starting problem definition evaluation")
        input_data = HYPOTHESIS_GENERATION_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            unit_check=unit_check,
            relevant_variables_analysis=relevant_variables_analysis
        )

        response = self.execute(input_data)
        parsed_hypothesis = self.parse_llm_json(response)
        
        if parsed_hypothesis:
            self.logger.info("Successfully evaluated problem definition")
            return parsed_hypothesis
        else:
            self.logger.warning("Failed to parse PCS evaluation result")
            return [{"预测性": "无法评估", "稳定性": "无法评估"}]

    def generate_stability_analysis_code(self, csv_file_path, cleaning_code):
        """
        生成数据清理稳定性分析代码。

        参数:
        - csv_file_path: 原始数据的 CSV 文件路径
        - operations: 包含清理操作项的 JSON 列表
        - cleaning_code: 原始清理函数的代码

        返回值:
        - 生成的完整Python代码字符串（包含setup代码）
        """
        self.logger.info(f"Generating stability analysis code for {csv_file_path}")
        try:
            # 读取数据信息
            data = pd.read_csv(csv_file_path)
            from io import StringIO
            buffer = StringIO()
            data.info(buf=buffer)
            datainfo = buffer.getvalue()

            # 定义可用的工具函数
            tools = [
                'fill_missing_values_tools',
                'remove_columns_tools',
                'handle_outliers_tools',
                'encode_categorical_tools'
            ]

            # 读取工具函数文档
            doc_path = 'tools/ml_tools_doc/data_cleaning_tools.md'
            with open(doc_path, 'r', encoding='utf-8') as f:
                tool_descriptions = f.read()

            # 准备模板输入数据
            input_data = DATA_CLEANING_STABILITY_TEMPLATE.format(
                csv_path=csv_file_path,
                data_info=datainfo,
                cleaning_function=cleaning_code,
                tools=', '.join(tools),
                tool_descriptions=tool_descriptions
            )

            # 生成代码
            generated_code, _ = self.chat_with_memory(input_data, None)
            
            # 提取代码部分
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            if code_match:
                extracted_code = code_match.group(1)
                
                # 添加必要的导入和路径设置
                path_setup_code = '''import os,sys,re
current_path = os.path.abspath(__file__)
match = re.search(r'(.*MyAgent)', current_path)
if not match:
    raise FileNotFoundError("Could not find MyAgent directory")
sys.path.append(match.group(1))
from tools.ml_tools import *

'''
                final_code = path_setup_code + extracted_code
                self.logger.info("Successfully generated stability analysis code")
                return f"```python\n{final_code}\n```"
            else:
                self.logger.warning("Failed to extract Python code from generated text")
                return "未能生成有效的 Python 代码。"
        except Exception as e:
            self.logger.error(f"Error generating stability analysis code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"

    def execute_stability_analysis(self, csv_file_path: str,  cleaning_code: str):
        """
        执行数据清理稳定性分析，生成多个数据集版本并进行验证。

        Args:
            csv_file_path: 原始数据的CSV文件路径
            cleaning_code: 原始清理函数代码

        Returns:
            返回通过验证的数据集路径列表
        """
        max_retries = 8
        retry_count = 0
        self.logger.info(f"Starting stability analysis for {csv_file_path}")
        
        # 设置目录路径
        csv_dir = os.path.dirname(csv_file_path)
        stability_dir = os.path.join(csv_dir, 'stability_analysis')
        code_dir = os.path.join(csv_dir, 'code')  # 代码保存在原始数据集同目录下的code文件夹
        
        while retry_count < max_retries:
            self.logger.info(f"Attempt {retry_count + 1} of {max_retries}")
            try:
                # 清理之前的stability_analysis目录
                if os.path.exists(stability_dir):
                    shutil.rmtree(stability_dir)
                os.makedirs(stability_dir, exist_ok=True)
                
                # 确保code目录存在
                os.makedirs(code_dir, exist_ok=True)
                
                # 生成稳定性分析代码
                generated_code = self.generate_stability_analysis_code(
                    csv_file_path=csv_file_path,
                    cleaning_code=cleaning_code,
                )
                
                if "未能生成" in generated_code:
                    retry_count += 1
                    self.logger.warning(f"Failed to generate code, attempt {retry_count}")
                    continue
                
                # 设置代码保存路径
                py_filename = os.path.basename(csv_file_path).replace('.csv', '_stability.py')
                py_file_path = os.path.join(code_dir, py_filename)
                
                # 执行代码并获取生成的数据集列表
                self.logger.info("Executing stability analysis code")
                result = self.execute_generated_code(generated_code, save_path=py_file_path)
                
                # 验证结果格式
                stability_dir = os.path.join(os.path.dirname(csv_file_path), 'stability_analysis')
                if not os.path.exists(stability_dir):
                    if os.path.exists(py_file_path):
                        os.remove(py_file_path)
                    retry_count += 1
                    self.logger.warning("Stability directory not created, retrying")
                    continue
                
                # 获取所有生成的CSV文件
                generated_datasets = [
                    os.path.join(stability_dir, f) 
                    for f in os.listdir(stability_dir) 
                    if f.endswith('.csv')
                ]
                
                if not generated_datasets:
                    if os.path.exists(py_file_path):
                        os.remove(py_file_path)
                    retry_count += 1
                    self.logger.warning("No datasets generated, retrying")
                    continue
                
                # 在进行单元测试前先去除重复数据集
                self.logger.info("Removing duplicate datasets")
                i = 0
                while i < len(generated_datasets):
                    if not os.path.exists(generated_datasets[i]):
                        i += 1
                        continue
                        
                    try:
                        df1 = pd.read_csv(generated_datasets[i])
                        
                        # 检查数据集是否只有一行
                        if len(df1) <= 1:
                            os.remove(generated_datasets[i])
                            generated_datasets.pop(i)
                            self.logger.warning(f"Removed single-row dataset: {generated_datasets[i]}")
                            continue
                            
                        df1_sorted = df1.sort_values(by=list(df1.columns)).reset_index(drop=True)
                        
                        # 与后续数据集比较
                        j = i + 1
                        while j < len(generated_datasets):
                            if not os.path.exists(generated_datasets[j]):
                                j += 1
                                continue
                                
                            try:
                                df2 = pd.read_csv(generated_datasets[j])
                                
                                # 检查第二个数据集是否只有一行
                                if len(df2) <= 1:
                                    os.remove(generated_datasets[j])
                                    generated_datasets.pop(j)
                                    self.logger.warning(f"Removed single-row dataset: {generated_datasets[j]}")
                                    continue
                                    
                                df2_sorted = df2.sort_values(by=list(df2.columns)).reset_index(drop=True)
                                
                                # 如果内容相同（忽略顺序），删除第二个数据集
                                if df1_sorted.equals(df2_sorted):
                                    os.remove(generated_datasets[j])
                                    generated_datasets.pop(j)
                                    self.logger.info(f"Removed duplicate dataset: {generated_datasets[j]}")
                                else:
                                    j += 1
                            except Exception as e:
                                self.logger.error(f"Error comparing datasets: {str(e)}")
                                j += 1
                                
                    except Exception as e:
                        self.logger.error(f"Error processing dataset {generated_datasets[i]}: {str(e)}")
                        i += 1
                        continue
                    
                    i += 1
                
                # 对每个数据集进行单元测试
                self.logger.info("Running unit tests on generated datasets")
                valid_datasets = []
                for dataset_path in generated_datasets:
                    passed, report = self.run_unit_tests(
                        cleaned_data_path=dataset_path,
                        original_data_path=csv_file_path
                    )
                    
                    if passed:
                        valid_datasets.append(dataset_path)
                        self.logger.info(f"Dataset passed unit tests: {dataset_path}")
                    else:
                        if os.path.exists(dataset_path):
                            os.remove(dataset_path)
                            self.logger.warning(f"Removed dataset that failed unit tests: {dataset_path}")
                
                # 检查数据集数量
                num_datasets = len(valid_datasets)
                self.logger.info(f"Generated {num_datasets} valid datasets")
                
                if num_datasets < 3:
                    # 数据集太少，重试
                    for dataset_path in valid_datasets:
                        if os.path.exists(dataset_path):
                            os.remove(dataset_path)
                    if os.path.exists(py_file_path):
                        os.remove(py_file_path)
                    retry_count += 1
                    self.logger.warning("Too few valid datasets, retrying")
                    continue
                    
                elif num_datasets > 50:
                    # 随机选择50个数据集保留
                    import random
                    datasets_to_keep = random.sample(valid_datasets, 50)
                    for dataset_path in valid_datasets:
                        if dataset_path not in datasets_to_keep and os.path.exists(dataset_path):
                            os.remove(dataset_path)
                    valid_datasets = datasets_to_keep
                    self.logger.info("Reduced number of datasets to 50")
                
                # 直接返回通过验证的数据集列表
                self.logger.info("Stability analysis completed successfully")
                return valid_datasets
                
            except Exception as e:
                # 发生错误时清理文件
                if 'py_file_path' in locals() and os.path.exists(py_file_path):
                    os.remove(py_file_path)
                if os.path.exists(stability_dir):
                    shutil.rmtree(stability_dir)
                
                retry_count += 1
                self.logger.error(f"Error during stability analysis: {str(e)}")
                if retry_count == max_retries:
                    return f"在{max_retries}次尝试后出现错误：{str(e)}"
                continue
        
        self.logger.error(f"Failed to complete stability analysis after {max_retries} attempts")
        return f"在{max_retries}次尝试后未能生成有效的稳定性分析结果。"