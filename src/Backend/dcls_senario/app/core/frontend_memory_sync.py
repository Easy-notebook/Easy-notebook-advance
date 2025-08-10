"""
前端记忆同步系统
从前端获取记忆状态，为后端Agent提供上下文
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json

class FrontendMemorySync:
    """前端记忆同步器 - 从前端状态中提取和组织记忆信息"""
    
    def __init__(self, frontend_state: Dict[str, Any]):
        self.frontend_state = frontend_state or {}
        self.variables = self.frontend_state.get("variables", {})
        self.memories = self._extract_memories()
        self.goal_context = self._build_goal_context()
    
    def _extract_memories(self) -> Dict[str, Any]:
        """从前端状态中提取记忆信息"""
        memories = {
            "analysis_results": [],
            "data_insights": [],
            "decisions": [],
            "agent_interactions": [],
            "code_executions": [],
            "variable_history": []
        }
        
        # 从variables中提取分析结果
        for key, value in self.variables.items():
            if key.endswith("_analysis") or key.endswith("_result"):
                memories["analysis_results"].append({
                    "type": key,
                    "content": value,
                    "timestamp": datetime.now().isoformat()
                })
            elif key.endswith("_insight") or key.endswith("_discovery"):
                memories["data_insights"].append({
                    "type": key,
                    "content": value,
                    "timestamp": datetime.now().isoformat()
                })
        
        # 从前端状态中提取其他记忆类型
        if "memory" in self.frontend_state:
            frontend_memory = self.frontend_state["memory"]
            for memory_type, memory_list in frontend_memory.items():
                if memory_type in memories:
                    memories[memory_type].extend(memory_list)
        
        return memories
    
    def _build_goal_context(self) -> Dict[str, Any]:
        """构建目标上下文"""
        user_goal = self.variables.get("user_goal", "Complete data science analysis")
        problem_description = self.variables.get("problem_description", "")
        
        return {
            "user_goal": user_goal,
            "problem_description": problem_description,
            "current_stage": self._identify_current_stage(),
            "completed_stages": self._get_completed_stages(),
            "available_data": self._get_available_data_info(),
            "key_findings": self._extract_key_findings(),
            "next_priorities": self._suggest_next_priorities()
        }
    
    def _identify_current_stage(self) -> str:
        """识别当前阶段"""
        # 基于已有变量推断当前阶段
        if self.has_variable("model_evaluation_results"):
            return "model_evaluation"
        elif self.has_variable("trained_model"):
            return "model_training"
        elif self.has_variable("feature_engineering_complete"):
            return "feature_engineering"
        elif self.has_variable("data_cleaning_complete"):
            return "data_cleaning"
        elif self.has_variable("eda_complete"):
            return "exploratory_analysis"
        elif self.has_variable("column_names"):
            return "data_structure_discovery"
        else:
            return "data_existence_establishment"
    
    def _get_completed_stages(self) -> List[str]:
        """获取已完成的阶段"""
        completed = []
        
        stage_indicators = {
            "data_existence_establishment": ["csv_file_path", "column_names"],
            "data_structure_discovery": ["top_5_lines", "dataset_shape"],
            "data_integrity_assurance": ["missing_value_analysis", "data_quality_report"],
            "data_insight_acquisition": ["correlation_analysis", "eda_complete"],
            "feature_engineering": ["feature_engineering_complete", "processed_features"],
            "model_training": ["trained_model", "model_performance"],
            "model_evaluation": ["model_evaluation_results", "final_metrics"]
        }
        
        for stage, indicators in stage_indicators.items():
            if any(self.has_variable(indicator) for indicator in indicators):
                completed.append(stage)
        
        return completed
    
    def _get_available_data_info(self) -> Dict[str, Any]:
        """获取可用数据信息"""
        data_info = {}
        
        # 基础数据信息
        if self.has_variable("csv_file_path"):
            data_info["csv_file_path"] = self.get_variable("csv_file_path")
        
        if self.has_variable("column_names"):
            data_info["columns"] = self.get_variable("column_names")
            data_info["column_count"] = len(data_info["columns"]) if isinstance(data_info["columns"], list) else 0
        
        if self.has_variable("dataset_shape"):
            data_info["shape"] = self.get_variable("dataset_shape")
        
        if self.has_variable("target_variable"):
            data_info["target_variable"] = self.get_variable("target_variable")
        
        # 数据质量信息
        if self.has_variable("missing_value_analysis"):
            data_info["missing_values"] = self.get_variable("missing_value_analysis")
        
        if self.has_variable("data_types"):
            data_info["data_types"] = self.get_variable("data_types")
        
        return data_info
    
    def _extract_key_findings(self) -> List[Dict[str, Any]]:
        """提取关键发现"""
        findings = []
        
        # 从分析结果中提取关键发现
        for result in self.memories["analysis_results"]:
            if isinstance(result["content"], dict):
                content = result["content"]
                if "key_insights" in content:
                    findings.extend(content["key_insights"])
                elif "summary" in content:
                    findings.append({
                        "type": "summary",
                        "content": content["summary"],
                        "source": result["type"]
                    })
        
        # 从数据洞察中提取
        for insight in self.memories["data_insights"]:
            findings.append({
                "type": "insight",
                "content": insight["content"],
                "source": insight["type"]
            })
        
        return findings
    
    def _suggest_next_priorities(self) -> List[str]:
        """基于当前状态建议下一步优先级"""
        current_stage = self._identify_current_stage()
        
        priority_map = {
            "data_existence_establishment": [
                "Verify data accessibility and load dataset",
                "Extract column names and basic structure",
                "Validate target variable presence"
            ],
            "data_structure_discovery": [
                "Analyze data types and distributions",
                "Identify missing values patterns",
                "Generate data preview and summary statistics"
            ],
            "data_integrity_assurance": [
                "Handle missing values appropriately",
                "Detect and address outliers",
                "Validate data consistency"
            ],
            "data_insight_acquisition": [
                "Perform correlation analysis",
                "Generate visualizations",
                "Identify feature relationships"
            ],
            "feature_engineering": [
                "Create new features based on insights",
                "Encode categorical variables",
                "Scale numerical features"
            ],
            "model_training": [
                "Select appropriate algorithms",
                "Train and tune models",
                "Validate model performance"
            ],
            "model_evaluation": [
                "Evaluate final model performance",
                "Generate predictions",
                "Create model interpretation"
            ]
        }
        
        return priority_map.get(current_stage, ["Continue with current analysis"])
    
    def has_variable(self, var_name: str) -> bool:
        """检查是否存在某个变量"""
        return var_name in self.variables and self.variables[var_name] is not None
    
    def get_variable(self, var_name: str, default=None):
        """获取变量值"""
        return self.variables.get(var_name, default)
    
    def get_analysis_history(self, analysis_type: str = None) -> List[Dict[str, Any]]:
        """获取分析历史"""
        if analysis_type:
            return [r for r in self.memories["analysis_results"] if analysis_type in r["type"]]
        return self.memories["analysis_results"]
    
    def get_insights_summary(self) -> Dict[str, Any]:
        """获取洞察摘要"""
        return {
            "total_insights": len(self.memories["data_insights"]),
            "total_analyses": len(self.memories["analysis_results"]),
            "key_findings": self._extract_key_findings(),
            "current_stage": self._identify_current_stage(),
            "completion_rate": len(self._get_completed_stages()) / 7 * 100  # 7个主要阶段
        }
    
    def get_missing_variables(self, required_variables: List[str]) -> List[str]:
        """获取缺失的必需变量"""
        return [var for var in required_variables if not self.has_variable(var)]
    
    def suggest_variable_recovery(self, missing_variables: List[str]) -> Dict[str, str]:
        """建议变量恢复策略"""
        recovery_strategies = {}
        
        for var in missing_variables:
            if var == "column_names":
                if self.has_variable("csv_file_path"):
                    recovery_strategies[var] = "reload_from_csv"
                else:
                    recovery_strategies[var] = "request_user_input"
            elif var == "top_5_lines":
                if self.has_variable("csv_file_path"):
                    recovery_strategies[var] = "regenerate_preview"
                else:
                    recovery_strategies[var] = "request_data_upload"
            elif var == "target_variable":
                recovery_strategies[var] = "request_user_specification"
            else:
                recovery_strategies[var] = "regenerate_from_available_data"
        
        return recovery_strategies
    
    def create_agent_context(self, agent_name: str = None) -> Dict[str, Any]:
        """为Agent创建上下文"""
        context = {
            "goal_context": self.goal_context,
            "available_data": self._get_available_data_info(),
            "analysis_history": self.memories["analysis_results"],
            "insights": self.memories["data_insights"],
            "current_variables": self.variables,
            "insights_summary": self.get_insights_summary(),
            "next_priorities": self._suggest_next_priorities(),
            "timestamp": datetime.now().isoformat()
        }
        
        if agent_name:
            # 为特定Agent过滤相关信息
            context["agent_specific"] = self._get_agent_specific_context(agent_name)
        
        return context
    
    def _get_agent_specific_context(self, agent_name: str) -> Dict[str, Any]:
        """获取特定Agent的上下文"""
        agent_contexts = {
            "PCSAgent": {
                "focus": "stage_selection_and_planning",
                "relevant_data": ["user_goal", "problem_description", "current_stage"],
                "decision_history": [d for d in self.memories["decisions"] if "stage" in d.get("type", "")]
            },
            "DataCleaningAgent": {
                "focus": "data_quality_and_preprocessing",
                "relevant_data": ["missing_value_analysis", "data_quality_report", "outlier_detection"],
                "previous_actions": [a for a in self.memories["agent_interactions"] if "cleaning" in a.get("type", "")]
            },
            "EDAAgent": {
                "focus": "exploratory_data_analysis",
                "relevant_data": ["correlation_analysis", "distribution_analysis", "feature_relationships"],
                "insights": [i for i in self.memories["data_insights"] if "eda" in i.get("type", "")]
            }
        }
        
        return agent_contexts.get(agent_name, {})

def create_frontend_memory_sync(frontend_state: Dict[str, Any]) -> FrontendMemorySync:
    """创建前端记忆同步器"""
    return FrontendMemorySync(frontend_state)
