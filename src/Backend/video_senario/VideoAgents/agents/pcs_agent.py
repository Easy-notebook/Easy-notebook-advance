from .base_agent import BaseAgent
from DCLSAgents.prompts.pcs_prompts import *
import json
import pandas as pd

class PCSAgent(BaseAgent):
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
            model=llm if llm else "gpt-5-mini",
            system_prompt=system_message
        )
        self.context_description = context_description
        self.problem_description = problem_description
        self.info("PCS Evaluation Agent initialized")
    
    def generate_workflow_cli(self, user_goal:str, problem_description:str, context_description:str):
        """CLI method for generating workflow"""
        input_data = WORKFLOW_GENERATION_TEMPLATE.format(
            user_goal=user_goal,
            problem_description=problem_description,
            context_description=context_description
        )
        response = self.analyzing(input_data)
        if response:
            return response
        else:
            return [{"error": "Could not generate workflow"}]

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
        self.info("Starting problem definition evaluation")
        input_data = HYPOTHESIS_GENERATION_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            unit_check=unit_check,
            relevant_variables_analysis=relevant_variables_analysis
        )

        response = self.analyzing(input_data)
        
        if response:
            self.info("Successfully evaluated problem definition")
            return response
        else:
            self.warning("Failed to parse PCS evaluation result")
            return [{"预测性": "无法评估", "稳定性": "无法评估"}]


    
    def generate_stability_strategy_cli(self, eda_summary, model_training_strategy):
        """CLI method for generating stability analysis strategy"""
        input_data = f"""Based on the EDA findings and model training strategy:
EDA Summary: {json.dumps(eda_summary, ensure_ascii=False)}
Model Training Strategy: {json.dumps(model_training_strategy, ensure_ascii=False)}

Problem: {self.problem_description}
Context: {self.context_description}

Generate a comprehensive stability analysis strategy that includes:
1. Data variation approaches for robustness testing
2. Model stability evaluation framework
3. Performance consistency metrics
4. Risk assessment methodology
5. Validation procedures for different data scenarios

Return as a structured stability analysis plan."""
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate stability strategy"}]
    
    def generate_dataset_variations_cli(self, stability_strategy, csv_file_path, model_training_code):
        """CLI method for generating dataset variations for stability analysis"""
        df = pd.read_csv(csv_file_path)
        dataset_info = {
            "rows": len(df),
                "columns": list(df.columns),
                "dtypes": df.dtypes.to_dict()
            }
            
        input_data = f"""Based on the stability strategy and dataset characteristics:
Stability Strategy: {json.dumps(stability_strategy, ensure_ascii=False)}
Dataset Info: {json.dumps(dataset_info, ensure_ascii=False, default=str)}
Model Training Code: {model_training_code}

Problem: {self.problem_description}
Context: {self.context_description}

Generate a comprehensive plan for creating dataset variations that includes:
1. Data sampling strategies
2. Feature perturbation methods
3. Noise injection approaches
4. Outlier handling variations
5. Missing data scenarios
6. Cross-validation splits

Return as a structured dataset variation plan with specific parameters for each variation type."""
        
        response = self.analyzing(input_data)
        
        if response:
            return response
        else:
            return [{"error": "Could not generate dataset variations"}]
    
    def generate_dataset_variations_code_cli(self, csv_file_path, dataset_variations):
        """CLI method for generating code to create dataset variations"""
        input_data = f"""Generate Python code to create dataset variations based on the plan:
CSV File Path: {csv_file_path}
Dataset Variations Plan: {json.dumps(dataset_variations, ensure_ascii=False)}

Problem: {self.problem_description}
Context: {self.context_description}

Generate Python code that:
1. Loads the original dataset
2. Creates multiple variations based on the plan parameters
3. Saves variations to separate files
4. Returns summary of created variations
5. Includes proper error handling

Return the code wrapped in ```python``` tags."""
        
        response = self.coding(input_data)
        return response

    def select_stage_actions_cli(self, stage_name: str, stage_goal: str,
                                available_actions: list, current_data_state: str, user_goal: str):
        """
        为特定阶段选择必要的actions
        
        参数：
        - stage_name: 阶段名称
        - stage_goal: 阶段目标
        - available_actions: 可用的actions列表
        - current_data_state: 当前数据状态
        - user_goal: 用户目标
        
        返回值：
        - 选择的actions配置JSON
        """
        self.info(f"Selecting actions for stage: {stage_name}")
        
        # 格式化available_actions为字符串
        actions_str = "\n".join([f"- {action}" for action in available_actions])
        
        input_data = STAGE_ACTION_SELECTION_TEMPLATE.format(
            stage_name=stage_name,
            stage_goal=stage_goal,
            available_actions=actions_str,
            current_data_state=current_data_state,
            user_goal=user_goal
        )
        
        response = self.analyzing(input_data)
        
        if response:
            self.info(f"Successfully selected actions for stage: {stage_name}")
            return response
        else:
            self.warning(f"Failed to select actions for stage: {stage_name}")
            return {
                "error": f"Could not select actions for stage: {stage_name}",
                "fallback": {
                    "stage_analysis": f"Default execution for {stage_name}",
                    "selected_actions": [{"action_id": action, "necessity": "必需", "reason": "Default selection", "provides": "Basic functionality"} for action in available_actions[:3]],
                    "execution_order": available_actions[:3],
                    "skip_actions": []
                }
            }
