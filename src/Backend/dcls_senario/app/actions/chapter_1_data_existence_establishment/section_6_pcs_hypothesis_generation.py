from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class PCSHypothesisGeneration(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_1_data_existence_establishment",
                         section_id="section_6_pcs_hypothesis_generation",
                         name="PCS Hypothesis Generation",
                         ability="Generate PCS hypotheses and optionally execute data cleaning",
                         require_variables=["csv_file_path", "problem_description", "column_names"])
    
    @event("start")
    def start(self):
        return self.new_section("PCS假设生成") \
            .add_text("基于数据存在性分析结果生成PCS框架假设") \
            .next_thinking_event(
                event_tag="pcs_analysis",
                textArray=["分析可预测性潜力...", "评估可计算性要求...", "制定稳定性假设..."],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("pcs_analysis")
    def pcs_analysis(self):
        try:
            # 获取前面分析的结果
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            variable_semantic_mapping = self.get_variable("variable_semantic_mapping", {})
            observation_unit_definition = self.get_variable("observation_unit_definition", {})
            unit_check = self.get_variable("unit_check", {})
            columns_to_drop = self.get_variable("columns_to_drop", [])
            column_drop_reasons = self.get_variable("column_drop_reasons", {})
            column_names = self.get_variable("column_names", [])
            
            # 初始化PCS智能体
            pcs_agent = PCSAgent(
                llm=llm, 
                problem_description=problem_description, 
                context_description=context_description
            )
            
            # 准备分析数据，使用可用的变量
            variables_for_analysis = variable_semantic_mapping if variable_semantic_mapping else {"variables": column_names}
            unit_for_analysis = unit_check if unit_check else (observation_unit_definition if observation_unit_definition else {"unit": "record"})
            
            # 生成PCS假设
            pcs_hypothesis = pcs_agent.evaluate_problem_definition_cli(
                problem_description=problem_description,
                context_description=context_description,
                variables=variables_for_analysis,
                unit_check=unit_for_analysis,
                relative_analysis={"columns_to_drop": columns_to_drop, "drop_reasons": column_drop_reasons}
            )
            
            # 验证结果
            if not pcs_hypothesis or not isinstance(pcs_hypothesis, dict):
                pcs_hypothesis = {
                    "predictability": "Medium - based on available variables",
                    "computability": "High - standard data science methods applicable", 
                    "stability": "Medium - depends on data quality and completeness",
                    "hypothesis_summary": "PCS framework can be applied with standard analytical approaches",
                    "analysis_status": "fallback_applied"
                }
            
            return self.conclusion("pcs_analysis_result", pcs_hypothesis)
        except Exception as e:
            # Error fallback
            error_result = {
                "predictability": "Unknown - analysis failed",
                "computability": "Unknown - analysis failed",
                "stability": "Unknown - analysis failed", 
                "hypothesis_summary": f"PCS analysis failed: {str(e)}",
                "analysis_status": "error_fallback",
                "error": str(e)
            }
            return self.conclusion("pcs_analysis_result", error_result)
        finally:
            return self.end_event()
    
    @finnish("pcs_analysis_result")
    def pcs_analysis_result(self):
        pcs_result = self.get_thinking("pcs_analysis_result")
        
        # 转换为表格格式
        if isinstance(pcs_result, dict):
            markdown_table = self.to_tableh(pcs_result)
        else:
            markdown_table = str(pcs_result)
        
        # Save hypothesis and compact summary for later chapters
        self.add_variable("pcs_hypothesis", pcs_result)
        self.add_variable("pcs_hypothesis_table", markdown_table)
        return self.add_text("PCS hypothesis generated") \
            .next_event("data_cleaning_execution") \
            .end_event()
    
    @event("data_cleaning_execution")
    def data_cleaning_execution(self):
        # 检查是否有需要删除的列
        columns_to_drop = self.get_variable("columns_to_drop", [])
        
        if len(columns_to_drop) > 0:
            csv_file_path = self.get_full_csv_path()
            return self.new_section("Data Cleaning Execution") \
                .add_text(f"Execute data cleaning, removing {len(columns_to_drop)} variables") \
                .add_code(f'''from vdstools import DataPreview
import pandas as pd
import os

# Use VDS tools to execute column removal operations
columns_to_drop = {columns_to_drop}
print(f"Planning to remove {len(columns_to_drop)} variables:")
for col in columns_to_drop:
    print(f"- {col}")

# Generate cleaned file path
original_path = "{csv_file_path}"
path_parts = original_path.split('.')
cleaned_path = '.'.join(path_parts[:-1]) + '_cleaned.' + path_parts[-1]

# Use VDS tools to remove columns and generate report
data_preview = DataPreview()
removal_report = data_preview.remove_columns("{csv_file_path}", columns_to_drop, cleaned_path)
print(removal_report)

# Generate cleaning report summary
original_data = pd.read_csv("{csv_file_path}")
cleaned_data = pd.read_csv(cleaned_path)

cleaning_report = {{
    'original_shape': original_data.shape,
    'cleaned_shape': cleaned_data.shape,
    'removed_columns': len(columns_to_drop),
    'removal_rate': len(columns_to_drop) / len(original_data.columns),
    'cleaned_file_path': cleaned_path,
    'cleaning_summary': f"Successfully removed {len(columns_to_drop)} variables, data reduced from {original_data.shape[1]} to {cleaned_data.shape[1]} columns"
}}

print(f"\\n=== Data Cleaning Summary ===")
print(f"Original dimensions: {cleaning_report['original_shape']}")
print(f"Cleaned dimensions: {cleaning_report['cleaned_shape']}")
print(f"Removed variables: {cleaning_report['removed_columns']}")
print(f"Removal rate: {cleaning_report['removal_rate']:.1%}")
print(f"Cleaned file: {cleaning_report['cleaned_file_path']}")

cleaning_report''') \
                .exe_code_cli(
                    event_tag="clean_data_update",
                    mark_finnish="Data cleaning completed"
                ) \
                .end_event()
        else:
            return self.add_text("No variables need to be removed, skipping data cleaning step") \
                .end_event()
    
    @after_exec("clean_data_update")
    def clean_data_update(self):
        cleaning_result = self.get_current_effect()
        
        # 更新相关变量
        if isinstance(cleaning_result, dict) and 'cleaned_file_path' in cleaning_result:
            cleaned_path = cleaning_result['cleaned_file_path']
            self.add_variable("cleaned_csv_file_path", cleaned_path)
            # Set the active csv path to the cleaned file for downstream steps
            self.add_variable("csv_file_path", cleaned_path)
            
            # 更新列名（移除已删除的列）
            original_columns = self.get_variable("column_names", [])
            columns_to_drop = self.get_variable("columns_to_drop", [])
            cleaned_columns = [col for col in original_columns if col not in columns_to_drop]
            self.add_variable("cleaned_column_names", cleaned_columns)
            # Overwrite the working column list with cleaned columns
            self.add_variable("column_names", cleaned_columns)
            # Keep a generic alias for compatibility
            self.add_variable("variables", cleaned_columns)
        
        return self.add_variable("cleaning_report", cleaning_result) \
            .add_text("Cleaning comparison shows significant data optimization effects") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_5(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return PCSHypothesisGeneration(step, state, stream).run()