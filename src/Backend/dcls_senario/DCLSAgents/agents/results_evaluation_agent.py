# agents/results_evaluation_agent.py
from .base_agent import BaseDSLC_Agent
from DCLSAgents.prompts.results_evaluation_prompts import *
import json
import re
import os

class ResultsEvaluationAgent(BaseDSLC_Agent):
    def __init__(self, problem_description, context_description, best_five_result, memory=None, llm=None):
        self.problem_description = problem_description
        self.context_description = context_description
        self.best_five_result = best_five_result
        
        system_message_content = RESULTS_EVALUATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            best_five_result=best_five_result
        )
        
        super().__init__(
            name="Results Evaluation",
            system_message=system_message_content,
            memory=memory,
            llm=llm
        )
        self.logger.info("ResultsEvaluationAgent initialized")

    def generate_test_datasets_code(self, multiple_datasets_code_path, original_dataset_path):
        """
        根据生成多个数据集的代码，生成只生成五个最佳拟合数据集的代码。
        
        参数：
        - multiple_datasets_code_path: 稳定性数据集的代码文件路径
        - original_dataset_path: 原始数据集路径
        
        返回值：
        - 生成的Python代码字符串，用于创建五个最佳拟合数据集
        """
        self.logger.info(f"Generating code for test datasets based on {multiple_datasets_code_path}")
        try:
            # 读取生成多个数据集的代码
            with open(multiple_datasets_code_path, 'r', encoding='utf-8') as f:
                multiple_datasets_code = f.read()
            
            input_data = BEST_FIVE_DATASETS_TEMPLATE.format(
                original_dataset_path=original_dataset_path,
                multiple_datasets_code=multiple_datasets_code
            )
            
            generated_code, _ = self.chat_with_memory(input_data, None)
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            
            if code_match:
                extracted_code = code_match.group(1)
                final_code = extracted_code
                self.logger.info("Successfully generated test datasets code")
                return f"```python\n{final_code}\n```"
            self.logger.warning("Failed to extract Python code from generated text")
            return "未生成代码。"
        except FileNotFoundError:
            self.logger.error(f"Multiple datasets code file not found: {multiple_datasets_code_path}")
            return f"找不到多数据集生成代码文件：{multiple_datasets_code_path}"
        except Exception as e:
            self.logger.error(f"Error generating best five datasets code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"

    def generate_and_execute_test_datasets(self, multiple_datasets_code_path, original_dataset_path, data_dir, max_attempts=3):
        """
        生成并执行生成最佳五个数据集的代码，并根据稳定性分析结果清理数据集。

        参数：
        - multiple_datasets_code_path: 生成多个数据集的代码文件路径
        - original_dataset_path: 原始数据集路径
        - data_dir: 数据根目录路径
        - max_attempts: 代码生成的最大尝试次数

        返回值：
        - 包含代码执行结果的字典
        """
        self.logger.info(f"Starting test datasets generation for {original_dataset_path}")
        data_dir = os.path.dirname(original_dataset_path)
        code_dir = os.path.join(data_dir, 'code')
        os.makedirs(code_dir, exist_ok=True)

        code_file = os.path.join(code_dir, "generate_best_five_datasets.py")
        stability_dir = os.path.join(data_dir, 'stability_analysis')
        dataset_dir = os.path.join(data_dir, 'dataset')

        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                self.logger.info("Generating best five datasets code")
                code = self.generate_test_datasets_code(
                    multiple_datasets_code_path=multiple_datasets_code_path,
                    original_dataset_path=original_dataset_path
                )
                
                if "未生成代码" in code:
                    self.logger.warning("Failed to generate test datasets code")
                    continue

                self.logger.info("Executing test datasets code")
                result = self.execute_generated_code(code, save_path=code_file)
                if "代码执行失败，已达到最大重试次数" in result:
                    self.logger.warning(f"Code execution failed after max retries, attempting regeneration")
                    continue
                
                # 检查稳定性分析目录是否存在
                if not os.path.exists(stability_dir):
                    self.logger.warning("Stability analysis directory not found")
                    continue
                
                # 获取稳定性分析目录中的CSV文件名
                stability_files = [f for f in os.listdir(stability_dir) if f.endswith('.csv')]
                if not stability_files:
                    self.logger.warning("No CSV files found in stability analysis directory")
                    continue
                
                # 清理dataset目录
                if os.path.exists(dataset_dir):
                    dataset_files = os.listdir(dataset_dir)
                    for file in dataset_files:
                        if file.endswith('.csv'):
                            # 只保留在稳定性分析中出现的文件
                            if file not in stability_files:
                                file_path = os.path.join(dataset_dir, file)
                                try:
                                    os.remove(file_path)
                                    self.logger.info(f"Removed unused dataset: {file}")
                                except Exception as e:
                                    self.logger.error(f"Error removing file {file}: {str(e)}")
                
                self.logger.info("Successfully executed test datasets code and cleaned up datasets")
                return {"结果": result}
                
            except Exception as e:
                self.logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue

        return {"结果": f"在{max_attempts}次尝试后未能成功生成和执行代码。"}

    def generate_model_evaluation_code(self, model_training_code_path, train_dataset_path, eval_dataset_path):
        """
        生成模型评估代码，使用最佳拟合的数据集和算法进行训练和评估。
        
        参数：
        - model_training_code_path: 原始建模代码文件路径
        - train_dataset_path: 训练数据集路径
        - eval_dataset_path: 评估数据集路径
        
        返回值：
        - 生成的Python代码字符串，用于训练模型和评估数据集
        """
        self.logger.info(f"Generating model evaluation code for {eval_dataset_path}")
        try:
            # 读取原始建模代码
            with open(model_training_code_path, 'r', encoding='utf-8') as f:
                model_training_code = f.read()
            
            input_data = MODEL_EVALUATION_TEMPLATE.format(
                train_dataset_path=train_dataset_path,
                eval_dataset_path=eval_dataset_path,
                model_training_code=model_training_code
            )
            
            generated_code, _ = self.chat_with_memory(input_data, None)
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            
            if code_match:
                extracted_code = code_match.group(1)
                path_setup_code = '''import os,sys,re
current_path = os.path.abspath(__file__)
match = re.search(r'(.*MyAgent)', current_path)
if not match:
    raise FileNotFoundError("Could not find MyAgent directory")
sys.path.append(match.group(1))
from tools.ml_tools import *
from tools.ml_tools import transform_features,reduce_dimensions,select_features,discretize_features,create_polynomial_features

'''
                final_code = path_setup_code + extracted_code
                self.logger.info("Successfully generated model evaluation code")
                return f"```python\n{final_code}\n```"
            self.logger.warning("Failed to extract Python code from generated text")
            return "未生成代码。"
        except FileNotFoundError:
            self.logger.error(f"Model training code file not found: {model_training_code_path}")
            return f"找不到建模代码文件：{model_training_code_path}"
        except Exception as e:
            self.logger.error(f"Error generating model evaluation code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"

    def generate_and_execute_model_evaluation(self, model_training_code_path, train_dataset_path, eval_dataset_path, max_attempts=5):
        """
        生成并执行模型评估代码。

        参数：
        - model_training_code_path: 原始建模代码文件路径
        - train_dataset_path: 训练数据集路径
        - eval_dataset_path: 评估数据集路径
        - max_attempts: 代码生成的最大尝试次数

        返回值：
        - 包含代码执行结果的字典
        """
        self.logger.info(f"Starting model evaluation for {eval_dataset_path}")
        data_dir = os.path.dirname(eval_dataset_path)
        code_dir = os.path.join(data_dir, 'code')
        os.makedirs(code_dir, exist_ok=True)

        code_file = os.path.join(code_dir, "model_evaluation.py")

        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                self.logger.info("Generating model evaluation code")
                code = self.generate_model_evaluation_code(
                    model_training_code_path=model_training_code_path,
                    train_dataset_path=train_dataset_path,
                    eval_dataset_path=eval_dataset_path
                )
                
                if "未生成代码" in code:
                    self.logger.warning("Failed to generate model evaluation code")
                    continue

                self.logger.info("Executing model evaluation code")
                result = self.execute_generated_code(code, save_path=code_file)
                if "代码执行失败，已达到最大重试次数，需要重新生成代码。" in result:
                    self.logger.warning(f"Code execution failed after max retries, attempting regeneration")
                    continue  # 尝试重新生成代码
                
                self.logger.info("Successfully executed model evaluation code")
                return {"结果": result}
                
            except Exception as e:
                self.logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue  # 尝试下一次

        return {"结果": f"在{max_attempts}次尝试后未能成功生成和执行代码。"}
    
    def generate_results_evaluation_framework_cli(self, stability_summary, report_template):
        """CLI method for generating results evaluation framework"""
        try:
            input_data = RESULTS_EVALUATION_FRAMEWORK_TEMPLATE.format(
                stability_summary=stability_summary,
                report_template=report_template,
                problem_description=self.problem_description,
                context_description=self.context_description,
                best_five_result=self.best_five_result
            )
            
            response = self.execute(input_data)
            framework = self.parse_llm_json(response)
            
            if framework:
                return framework
            else:
                return [{"error": "Could not generate evaluation framework"}]
        except Exception as e:
            return [{"error": f"Error generating evaluation framework: {str(e)}"}]
    
    def generate_test_dataset_strategy_cli(self, evaluation_framework):
        """CLI method for generating test dataset strategy"""
        try:
            input_data = f"""Based on the evaluation framework:
Evaluation Framework: {evaluation_framework}

Problem: {self.problem_description}
Context: {self.context_description}

Generate a comprehensive test dataset strategy that includes:
1. Test data generation approaches
2. Dataset validation criteria
3. Quality control measures
4. Coverage requirements
5. Sampling strategies

Return as a structured test dataset strategy."""
            
            response = self.execute(input_data)
            strategy = self.parse_llm_json(response)
            
            if strategy:
                return strategy
            else:
                return [{"error": "Could not generate test dataset strategy"}]
        except Exception as e:
            return [{"error": f"Error generating test dataset strategy: {str(e)}"}]
    
    def generate_test_datasets_plan_cli(self, csv_file_path, test_strategy, evaluation_framework):
        """CLI method for generating test datasets plan"""
        try:
            input_data = f"""Based on the test strategy and evaluation framework:
CSV File Path: {csv_file_path}
Test Strategy: {test_strategy}
Evaluation Framework: {evaluation_framework}

Problem: {self.problem_description}
Context: {self.context_description}

Generate a detailed plan for creating test datasets that includes:
1. Specific dataset variations to create
2. Generation parameters and settings
3. Validation procedures for each dataset
4. Expected outcomes and quality metrics
5. Implementation timeline

Return as a structured test datasets generation plan."""
            
            response = self.execute(input_data)
            plan = self.parse_llm_json(response)
            
            if plan:
                return plan
            else:
                return [{"error": "Could not generate test datasets plan"}]
        except Exception as e:
            return [{"error": f"Error generating test datasets plan: {str(e)}"}]
    
    def generate_test_validation_code_cli(self, test_generation_plan, csv_file_path):
        """CLI method for generating test validation code"""
        try:
            input_data = TEST_VALIDATION_CODE_TEMPLATE.format(
                test_generation_plan=json.dumps(test_generation_plan, ensure_ascii=False),
                csv_file_path=csv_file_path,
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
            return f"# Error generating test validation code: {str(e)}"
    
    def generate_final_evaluation_strategy_cli(self, evaluation_framework, test_plan, validation_code):
        """CLI method for generating final evaluation strategy"""
        try:
            input_data = f"""Based on evaluation components:
Evaluation Framework: {evaluation_framework}
Test Plan: {test_plan}
Validation Code: {validation_code}

Problem: {self.problem_description}
Context: {self.context_description}

Generate a comprehensive final evaluation strategy that includes:
1. Complete evaluation methodology
2. Final testing procedures
3. Results analysis framework
4. Quality assurance measures
5. Success criteria and metrics

Return as a structured final evaluation strategy."""
            
            response = self.execute(input_data)
            strategy = self.parse_llm_json(response)
            
            if strategy:
                return strategy
            else:
                return [{"error": "Could not generate final evaluation strategy"}]
        except Exception as e:
            return [{"error": f"Error generating final evaluation strategy: {str(e)}"}]
    
    def generate_dcls_final_report_cli(self, problem_description, context_description, final_evaluation_strategy):
        """CLI method for generating DCLS final report"""
        try:
            input_data = f"""Generate a comprehensive DCLS (Data-Centric Learning Science) final report:
Problem Description: {problem_description}
Context Description: {context_description}
Final Evaluation Strategy: {final_evaluation_strategy}
Best Results: {self.best_five_result}

The report should include:
1. Executive Summary
2. Methodology Overview
3. Data Analysis Results
4. Model Performance Evaluation
5. Stability Analysis Findings
6. Final Recommendations
7. Implementation Guidelines
8. Risk Assessment and Mitigation
9. Future Research Directions

Return as a comprehensive markdown report."""
            
            response = self.execute(input_data)
            # Extract markdown report if wrapped
            markdown_match = re.search(r"```markdown\n(.*?)\n```", response, re.DOTALL)
            if markdown_match:
                return markdown_match.group(1).strip()
            else:
                return response
        except Exception as e:
            return f"# Error generating DCLS final report: {str(e)}"
    
    def generate_actionable_recommendations_cli(self, dcls_report):
        """CLI method for generating actionable recommendations"""
        try:
            input_data = f"""Based on the comprehensive DCLS report:
DCLS Report: {dcls_report}

Problem: {self.problem_description}
Context: {self.context_description}

Generate specific, actionable recommendations that include:
1. Immediate next steps
2. Implementation priorities
3. Resource requirements
4. Success metrics
5. Timeline estimates
6. Risk mitigation strategies
7. Quality checkpoints

Return as a structured list of actionable recommendations."""
            
            response = self.execute(input_data)
            recommendations = self.parse_llm_json(response)
            
            if recommendations:
                return recommendations
            else:
                return [{"error": "Could not generate actionable recommendations"}]
        except Exception as e:
            return [{"error": f"Error generating actionable recommendations: {str(e)}"}]
    
    def generate_final_evaluation_code_cli(self, evaluation_strategy, test_validation_code, csv_file_path):
        """CLI method for generating final evaluation code"""
        try:
            input_data = FINAL_EVALUATION_CODE_TEMPLATE.format(
                evaluation_strategy=json.dumps(evaluation_strategy, ensure_ascii=False),
                test_validation_code=test_validation_code,
                csv_file_path=csv_file_path,
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
            return f"# Error generating final evaluation code: {str(e)}"
