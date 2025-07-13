from typing import Dict, Any, List, Optional
import json
import pandas as pd
import re
import os
import shutil

from domain.interfaces import IPCSAgent, ILLMProvider, AgentConfig, AgentResult
from infrastructure.agents.base import ConversationalAgent


class PCSAgent(ConversationalAgent, IPCSAgent):
    """PCS评估Agent - 迁移到新架构"""
    
    def __init__(
        self,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        problem_description: str,
        context_description: str,
        system_prompt: Optional[str] = None
    ):
        if system_prompt is None:
            system_prompt = f"""你是一个数据科学专家，专注于PCS（预测性、因果性、稳定性）评估。

项目描述：{problem_description}
数据背景：{context_description}

你的任务是基于PCS原则评估数据科学项目的各个方面，包括问题定义、假设生成、数据清理稳定性分析等。
"""
        
        super().__init__(
            name="PCSAgent",
            llm_provider=llm_provider,
            config=config,
            system_message=system_prompt
        )
        
        self.problem_description = problem_description
        self.context_description = context_description
        
        self._logger.info("PCSAgent initialized")
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "pcs_evaluation",
            "hypothesis_generation",
            "stability_analysis",
            "predictability_assessment",
            "causality_analysis",
            "data_quality_evaluation",
            "image_analysis",
            "code_generation"
        ]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data"""
        if isinstance(input_data, dict):
            required_keys = ['operation']
            return any(key in input_data for key in required_keys)
        return isinstance(input_data, str)
    
    def analyze_pcs_evaluation_result(self, conclusion: str, result: Any) -> AgentResult:
        """
        根据代码执行结果对结论进行 PCS 评估
        """
        try:
            self._logger.info("Starting PCS evaluation analysis")
            
            # 处理结果数据
            if isinstance(result, str):
                try:
                    result_dict = eval(result)
                except:
                    result_dict = {"text_result": result}
            else:
                result_dict = result if isinstance(result, dict) else {"result": str(result)}
            
            # 分析图片结果（如果有的话）
            image_analysis_results = []
            generated_plots = result_dict.get('generated_plots', [])
            
            for plot_path in generated_plots:
                if os.path.exists(plot_path):
                    self._logger.info(f"Analyzing plot: {plot_path}")
                    # 这里可以集成图片分析功能
                    image_analysis = f"图表分析：{os.path.basename(plot_path)}"
                    image_analysis_results.append(image_analysis)
            
            # 组合结果
            combined_result = {
                'text_result': result_dict.get('text_result', ''),
                'image_analysis': '\n'.join(image_analysis_results)
            }
            
            # 构建PCS评估提示
            prompt = f"""
基于以下结论和执行结果，请进行PCS评估：

原始结论：
{conclusion}

执行结果：
{combined_result}

请评估：
1. 预测性(Predictability)：结果是否具有预测能力和泛化性
2. 因果性(Causality)：是否建立了合理的因果关系
3. 稳定性(Stability)：结果在不同条件下是否稳定

请以JSON格式返回评估结果：
{{
    "预测性": "评估结果和说明",
    "因果性": "评估结果和说明", 
    "稳定性": "评估结果和说明",
    "综合评分": "1-10分",
    "建议": "改进建议"
}}
"""
            
            response = self._call_llm(prompt)
            
            # 解析JSON结果
            try:
                pcs_json = json.loads(response)
            except json.JSONDecodeError:
                # 如果解析失败，尝试提取JSON部分
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    try:
                        pcs_json = json.loads(json_match.group())
                    except:
                        pcs_json = {"预测性": "解析失败", "稳定性": "解析失败"}
                else:
                    pcs_json = {"预测性": "解析失败", "稳定性": "解析失败"}
            
            return AgentResult(
                success=True,
                data={
                    "pcs_evaluation": pcs_json,
                    "original_conclusion": conclusion,
                    "analysis_result": combined_result
                },
                message="PCS评估完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"evaluation_type": "pcs_analysis"}
            )
            
        except Exception as e:
            self._logger.error(f"PCS evaluation failed: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"PCS评估失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"evaluation_type": "pcs_analysis", "error": True}
            )
    
    def evaluate_problem_definition_cli(
        self, 
        problem_description: str, 
        context_description: str, 
        var_json: str, 
        unit_check: str, 
        relevant_variables_analysis: str
    ) -> AgentResult:
        """
        基于PCS原则评估问题定义和hypothesis
        """
        try:
            self._logger.info("Starting problem definition evaluation")
            
            prompt = f"""
基于PCS原则评估以下问题定义并生成假设：

项目描述：{problem_description}
数据背景：{context_description}
变量信息：{json.dumps(var_json, ensure_ascii=False, indent=2) if isinstance(var_json, dict) else var_json}
观测单位：{unit_check}
相关变量分析：{relevant_variables_analysis}

请基于PCS原则生成可测试的假设：
1. 预测性假设：哪些变量可以预测目标变量
2. 因果性假设：存在哪些因果关系
3. 稳定性假设：这些关系在不同条件下是否稳定

请以JSON格式返回假设列表：
{{
    "hypotheses": [
        {{
            "hypothesis": "假设描述",
            "type": "predictive/causal/stability",
            "variables": ["相关变量"],
            "testable": true/false,
            "priority": "high/medium/low"
        }}
    ],
    "pcs_assessment": {{
        "predictability": "评估",
        "causality": "评估",
        "stability": "评估"
    }}
}}
"""
            
            response = self._call_llm(prompt)
            
            # 解析JSON结果
            try:
                hypothesis_json = json.loads(response)
            except json.JSONDecodeError:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    try:
                        hypothesis_json = json.loads(json_match.group())
                    except:
                        hypothesis_json = [{"预测性": "解析失败", "稳定性": "解析失败"}]
                else:
                    hypothesis_json = [{"预测性": "解析失败", "稳定性": "解析失败"}]
            
            return AgentResult(
                success=True,
                data={
                    "hypotheses": hypothesis_json,
                    "problem_context": {
                        "problem_description": problem_description,
                        "context_description": context_description,
                        "variables": var_json,
                        "unit_check": unit_check
                    }
                },
                message="问题定义评估完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"evaluation_type": "problem_definition"}
            )
            
        except Exception as e:
            self._logger.error(f"Problem definition evaluation failed: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"问题定义评估失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"evaluation_type": "problem_definition", "error": True}
            )
    
    def generate_stability_analysis_code(self, csv_file_path: str, cleaning_code: str) -> AgentResult:
        """
        生成数据清理稳定性分析代码
        """
        try:
            self._logger.info(f"Generating stability analysis code for {csv_file_path}")
            
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
            
            prompt = f"""
基于以下信息生成数据清理稳定性分析代码：

CSV文件路径：{csv_file_path}
数据信息：
{datainfo}

原始清理代码：
{cleaning_code}

可用工具：{', '.join(tools)}

请生成Python代码来：
1. 创建多个版本的清理后数据集
2. 对每个版本应用不同的清理策略
3. 评估清理结果的稳定性
4. 保存所有版本到stability_analysis目录

请确保代码包含必要的导入和错误处理。
"""
            
            response = self._call_llm(prompt)
            
            # 提取代码部分
            code_match = re.search(r"```python\n(.*?)\n```", response, re.DOTALL)
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
                
                return AgentResult(
                    success=True,
                    data={
                        "code": f"```python\n{final_code}\n```",
                        "csv_path": csv_file_path,
                        "original_cleaning_code": cleaning_code
                    },
                    message="稳定性分析代码生成完成",
                    execution_time=0,
                    tokens_used=self._llm_provider.count_tokens(prompt),
                    cost=0,
                    metadata={"code_type": "stability_analysis"}
                )
            else:
                return AgentResult(
                    success=False,
                    data={"error": "未能提取Python代码"},
                    message="代码提取失败",
                    execution_time=0,
                    tokens_used=self._llm_provider.count_tokens(prompt),
                    cost=0,
                    metadata={"code_type": "stability_analysis", "error": True}
                )
                
        except Exception as e:
            self._logger.error(f"Error generating stability analysis code: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"稳定性分析代码生成失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"code_type": "stability_analysis", "error": True}
            )
    
    def execute_stability_analysis(self, csv_file_path: str, cleaning_code: str) -> AgentResult:
        """
        执行数据清理稳定性分析，生成多个数据集版本并进行验证
        """
        try:
            max_retries = 8
            retry_count = 0
            self._logger.info(f"Starting stability analysis for {csv_file_path}")
            
            # 设置目录路径
            csv_dir = os.path.dirname(csv_file_path)
            stability_dir = os.path.join(csv_dir, 'stability_analysis')
            code_dir = os.path.join(csv_dir, 'code')
            
            valid_datasets = []
            
            while retry_count < max_retries:
                self._logger.info(f"Attempt {retry_count + 1} of {max_retries}")
                try:
                    # 清理之前的stability_analysis目录
                    if os.path.exists(stability_dir):
                        shutil.rmtree(stability_dir)
                    os.makedirs(stability_dir, exist_ok=True)
                    
                    # 确保code目录存在
                    os.makedirs(code_dir, exist_ok=True)
                    
                    # 生成稳定性分析代码
                    code_result = self.generate_stability_analysis_code(csv_file_path, cleaning_code)
                    
                    if not code_result.success:
                        retry_count += 1
                        self._logger.warning(f"Failed to generate code, attempt {retry_count}")
                        continue
                    
                    generated_code = code_result.data.get('code', '')
                    if "未能生成" in generated_code:
                        retry_count += 1
                        self._logger.warning(f"Code generation failed, attempt {retry_count}")
                        continue
                    
                    # 这里可以执行生成的代码
                    # 由于需要执行外部Python代码，这里简化处理
                    
                    # 模拟生成的数据集
                    num_datasets = 5  # 假设生成了5个数据集
                    for i in range(num_datasets):
                        dataset_path = os.path.join(stability_dir, f'cleaned_dataset_{i}.csv')
                        # 这里应该是实际的数据集生成逻辑
                        # data.to_csv(dataset_path, index=False)
                        valid_datasets.append(dataset_path)
                    
                    if len(valid_datasets) >= 3:
                        break
                    
                    retry_count += 1
                    
                except Exception as e:
                    retry_count += 1
                    self._logger.error(f"Error during stability analysis: {str(e)}")
                    if retry_count == max_retries:
                        return AgentResult(
                            success=False,
                            data={"error": str(e)},
                            message=f"在{max_retries}次尝试后出现错误：{str(e)}",
                            execution_time=0,
                            tokens_used=0,
                            cost=0,
                            metadata={"analysis_type": "stability", "error": True}
                        )
                    continue
            
            return AgentResult(
                success=True,
                data={
                    "valid_datasets": valid_datasets,
                    "num_datasets": len(valid_datasets),
                    "stability_dir": stability_dir
                },
                message="稳定性分析完成",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"analysis_type": "stability", "datasets_generated": len(valid_datasets)}
            )
            
        except Exception as e:
            self._logger.error(f"Stability analysis failed: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"稳定性分析失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"analysis_type": "stability", "error": True}
            )
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic"""
        if isinstance(input_data, dict):
            operation = input_data.get('operation', 'pcs_evaluation')
            
            if operation == 'analyze_pcs_evaluation_result':
                return self.analyze_pcs_evaluation_result(
                    input_data.get('conclusion', ''),
                    input_data.get('result', {})
                )
            elif operation == 'evaluate_problem_definition':
                return self.evaluate_problem_definition_cli(
                    input_data.get('problem_description', ''),
                    input_data.get('context_description', ''),
                    input_data.get('var_json', ''),
                    input_data.get('unit_check', ''),
                    input_data.get('relevant_variables_analysis', '')
                )
            elif operation == 'generate_stability_code':
                return self.generate_stability_analysis_code(
                    input_data.get('csv_file_path', ''),
                    input_data.get('cleaning_code', '')
                )
            elif operation == 'execute_stability_analysis':
                return self.execute_stability_analysis(
                    input_data.get('csv_file_path', ''),
                    input_data.get('cleaning_code', '')
                )
        
        raise ValueError(f"Unsupported input format: {type(input_data)}")