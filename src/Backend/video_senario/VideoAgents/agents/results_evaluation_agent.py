# agents/results_evaluation_agent.py
from .base_agent import BaseAgent
from DCLSAgents.prompts.results_evaluation_prompts import *
import json
import os

class ResultsEvaluationAgent(BaseAgent):
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
            model=llm if llm else "gpt-5-mini",
            system_prompt=system_message_content
        )
        self.info("ResultsEvaluationAgent initialized")


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
        self.info(f"Starting test datasets generation for {original_dataset_path}")
        data_dir = os.path.dirname(original_dataset_path)
        code_dir = os.path.join(data_dir, 'code')
        os.makedirs(code_dir, exist_ok=True)

        code_file = os.path.join(code_dir, "generate_best_five_datasets.py")
        stability_dir = os.path.join(data_dir, 'stability_analysis')
        dataset_dir = os.path.join(data_dir, 'dataset')

        for attempt in range(max_attempts):
            try:
                self.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                self.info("Generating best five datasets code")
                code = self.generate_test_datasets_code(
                    multiple_datasets_code_path=multiple_datasets_code_path,
                    original_dataset_path=original_dataset_path
                )
                
                if "未生成代码" in code:
                    self.warning("Failed to generate test datasets code")
                    continue

                self.info("Executing test datasets code")
                result = self.execute_generated_code(code, save_path=code_file)
                if "代码执行失败，已达到最大重试次数" in result:
                    self.warning(f"Code execution failed after max retries, attempting regeneration")
                    continue
                
                # 检查稳定性分析目录是否存在
                if not os.path.exists(stability_dir):
                    self.warning("Stability analysis directory not found")
                    continue
                
                # 获取稳定性分析目录中的CSV文件名
                stability_files = [f for f in os.listdir(stability_dir) if f.endswith('.csv')]
                if not stability_files:
                    self.warning("No CSV files found in stability analysis directory")
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
                                    self.info(f"Removed unused dataset: {file}")
                                except Exception as e:
                                    self.error(f"Error removing file {file}: {str(e)}")
                
                self.info("Successfully executed test datasets code and cleaned up datasets")
                return {"结果": result}
                
            except Exception as e:
                self.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue

        return {"结果": f"在{max_attempts}次尝试后未能成功生成和执行代码。"}


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
        pass
    
    def generate_results_evaluation_framework_cli(self, stability_summary, report_template):
        """CLI method for generating results evaluation framework"""
        input_data = RESULTS_EVALUATION_FRAMEWORK_TEMPLATE.format(
            stability_summary=stability_summary,
            report_template=report_template,
            problem_description=self.problem_description,
            context_description=self.context_description,
            best_five_result=self.best_five_result
        )
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate evaluation framework"}]

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
            
            response = self.analyzing(input_data)
            
            if response:
                return response
            else:
                return [{"error": "Could not generate test dataset strategy"}]
        except Exception as e:
            return [{"error": f"Error generating test dataset strategy: {str(e)}"}]
    
    def generate_test_datasets_plan_cli(self, csv_file_path, test_strategy, evaluation_framework):
        """CLI method for generating test datasets plan"""
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
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate test datasets plan"}]
    
    def generate_test_validation_code_cli(self, test_generation_plan, csv_file_path):
        """CLI method for generating test validation code"""
        try:
            input_data = TEST_VALIDATION_CODE_TEMPLATE.format(
                test_generation_plan=json.dumps(test_generation_plan, ensure_ascii=False),
                csv_file_path=csv_file_path,
                problem_description=self.problem_description,
                context_description=self.context_description
            )
            
            response = self.coding(input_data)
            return response
        except Exception as e:
            return f"# Error generating test validation code: {str(e)}"
    
    def generate_final_evaluation_strategy_cli(self, evaluation_framework, test_plan, validation_code):
        """CLI method for generating final evaluation strategy"""
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
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate final evaluation strategy"}]
    
    def generate_dcls_final_report_cli(self, problem_description, context_description, final_evaluation_strategy):
        """CLI method for generating DCLS final report"""
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
10. should not contain header markdown more than level 4(eg. #, ##, ###)

Return as a comprehensive markdown report."""
        
        response = self.answer(input_data)
        return response
    
    def generate_actionable_recommendations_cli(self, dcls_report):
        """CLI method for generating actionable recommendations"""
        
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
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate actionable recommendations"}]
        
    def generate_final_evaluation_code_cli(self, evaluation_strategy, test_validation_code, csv_file_path):
        """CLI method for generating final evaluation code"""
        input_data = FINAL_EVALUATION_CODE_TEMPLATE.format(
            evaluation_strategy=json.dumps(evaluation_strategy, ensure_ascii=False),
            test_validation_code=test_validation_code,
            csv_file_path=csv_file_path,
            problem_description=self.problem_description,
            context_description=self.context_description
        )
        
        response = self.coding(input_data)
        return response

