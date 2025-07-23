"""
Legacy Bridge - 向后兼容性桥接层
将新的OOP架构包装成与原有代码兼容的接口
"""

import os
import sys
from typing import Dict, List
import logging

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.config.settings import get_config, load_config_from_env
from shared.di_container import DIContainerBuilder
from infrastructure.llm.llm_factory import LLMFactory
from infrastructure.agents.factory.agent_factory import AgentFactory
from domain.interfaces import ILLMProvider, IDataCleaningAgent, IPredictionAgent, IProblemDefinitionAgent, AgentConfig


class LegacyAgentBridge:
    """桥接层，将新架构的Agent包装成原有接口"""
    
    def __init__(self):
        self._service_provider = None
        self._logger = logging.getLogger(__name__)
        self._initialize_services()
    
    def _initialize_services(self):
        """初始化服务"""
        try:
            # Load configuration
            config = load_config_from_env()
            
            # Setup dependency injection
            builder = DIContainerBuilder()
            
            # Register LLM provider
            def create_llm_provider() -> ILLMProvider:
                factory = LLMFactory()
                return factory.create_from_config(config.llm)
            
            builder.add_singleton(ILLMProvider, factory=create_llm_provider)
            
            # Register agent factory
            def create_agent_factory(llm_provider: ILLMProvider) -> AgentFactory:
                return AgentFactory(llm_provider)
            
            builder.add_singleton(AgentFactory, factory=create_agent_factory)
            
            self._service_provider = builder.build_provider()
            self._config = config
            
        except Exception as e:
            self._logger.error(f"Failed to initialize services: {str(e)}")
            raise
    
    def create_problem_definition_agent(
        self, 
        memory=None, 
        llm=None, 
        problem_description: str = "",
        context_description: str = ""
    ):
        """创建问题定义Agent - 兼容原有接口"""
        try:
            factory = self._service_provider.get_service(AgentFactory)
            
            config = AgentConfig(
                max_retries=self._config.agent_defaults.max_retries,
                timeout=self._config.agent_defaults.timeout,
                temperature=self._config.agent_defaults.temperature,
                max_tokens=self._config.agent_defaults.max_tokens
            )
            
            agent = factory.create_problem_definition_agent(
                config=config,
                problem_description=problem_description,
                context_description=context_description
            )
            
            # Wrap with legacy interface
            return LegacyProblemDefinitionAgentWrapper(agent)
            
        except Exception as e:
            self._logger.error(f"Failed to create problem definition agent: {str(e)}")
            raise
    
    def create_data_cleaning_agent(
        self, 
        memory=None, 
        llm=None, 
        problem_description: str = "",
        context_description: str = "",
        check_unit: str = "",
        var_json: Dict = None,
        hyp_json: List = None
    ):
        """创建数据清理Agent - 兼容原有接口"""
        try:
            factory = self._service_provider.get_service(AgentFactory)
            
            config = AgentConfig(
                max_retries=self._config.agent_defaults.max_retries,
                timeout=self._config.agent_defaults.timeout,
                temperature=self._config.agent_defaults.temperature,
                max_tokens=self._config.agent_defaults.max_tokens
            )
            
            agent = factory.create_data_cleaning_agent(
                config=config,
                problem_description=problem_description,
                context_description=context_description
            )
            
            # Wrap with legacy interface
            return LegacyDataCleaningAgentWrapper(agent, check_unit, var_json, hyp_json)
            
        except Exception as e:
            self._logger.error(f"Failed to create data cleaning agent: {str(e)}")
            raise
    
    def create_prediction_agent(
        self, 
        problem_description: str,
        context_description: str,
        eda_summary: str,
        memory=None, 
        llm=None
    ):
        """创建预测Agent - 兼容原有接口"""
        try:
            factory = self._service_provider.get_service(AgentFactory)
            
            config = AgentConfig(
                max_retries=self._config.agent_defaults.max_retries,
                timeout=self._config.agent_defaults.timeout,
                temperature=self._config.agent_defaults.temperature,
                max_tokens=self._config.agent_defaults.max_tokens
            )
            
            agent = factory.create_prediction_agent(
                config=config,
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary
            )
            
            # Wrap with legacy interface
            return LegacyPredictionAgentWrapper(agent)
            
        except Exception as e:
            self._logger.error(f"Failed to create prediction agent: {str(e)}")
            raise


class LegacyProblemDefinitionAgentWrapper:
    """问题定义Agent的向后兼容包装器"""
    
    def __init__(self, agent: IProblemDefinitionAgent):
        self._agent = agent
        self.var_json = None
        self.unit_check = None
        self.data_corr = None
        self.logger = logging.getLogger(f"{__name__}.ProblemDefinitionWrapper")
    
    def execute_problem_definition(self, csv_file_path: str, problem_description: str, context_description: str):
        """执行问题定义 - 保持原有接口"""
        try:
            result = self._agent.execute({
                'operation': 'full_analysis',
                'dataset_path': csv_file_path,
                'problem_description': problem_description,
                'context_description': context_description
            })
            
            if result.success:
                # Extract data in original format
                data = result.data
                self.var_json = data.get('变量描述', {})
                self.unit_check = data.get('观测单位', '')
                self.data_corr = data.get('变量相关性', {})
                
                return {
                    "变量描述": self.var_json,
                    "观测单位": self.unit_check,
                    "变量相关性": self.data_corr
                }
            else:
                raise Exception(result.message)
                
        except Exception as e:
            self.logger.error(f"Problem definition execution failed: {str(e)}")
            raise


class LegacyDataCleaningAgentWrapper:
    """数据清理Agent的向后兼容包装器"""
    
    def __init__(self, agent: IDataCleaningAgent, check_unit: str = "", var_json: Dict = None, hyp_json: List = None):
        self._agent = agent
        self.check_unit = check_unit
        self.var_json = var_json or {}
        self.hyp_json = hyp_json or []
        self.logger = logging.getLogger(f"{__name__}.DataCleaningWrapper")
    
    def generate_cleaning_task_list(self):
        """生成清理任务列表 - 兼容接口"""
        # This is typically called with dataset path from the caller
        # For now, return a placeholder
        return ["分析数据质量", "识别问题", "生成清理计划", "执行清理", "验证结果"]
    
    def execute_cleaning_tasks(self, task_list: List[str], csv_file_path: str):
        """执行清理任务 - 兼容接口"""
        try:
            # Execute data cleaning workflow
            operations = []
            logs = []
            
            # Step 1: Identify issues
            issues_result = self._agent.identify_issues(csv_file_path)
            if issues_result.success:
                issues = issues_result.data.get('issues', [])
                logs.append(f"识别了 {len(issues)} 个数据质量问题")
                
                # Step 2: Generate cleaning plan
                plan_result = self._agent.generate_cleaning_plan(csv_file_path, issues)
                if plan_result.success:
                    operations = plan_result.data.get('cleaning_operations', [])
                    logs.append(f"生成了 {len(operations)} 个清理操作")
                else:
                    logs.append(f"清理计划生成失败: {plan_result.message}")
            else:
                logs.append(f"问题识别失败: {issues_result.message}")
            
            return operations, logs
            
        except Exception as e:
            self.logger.error(f"Cleaning tasks execution failed: {str(e)}")
            return [], [f"执行失败: {str(e)}"]
    
    def execute_cleaning_operations(self, csv_file_path: str, operations: List[Dict]):
        """执行清理操作 - 兼容接口"""
        try:
            if not operations:
                # Generate operations first
                issues_result = self._agent.identify_issues(csv_file_path)
                if issues_result.success:
                    plan_result = self._agent.generate_cleaning_plan(csv_file_path, issues_result.data.get('issues', []))
                    if plan_result.success:
                        operations = plan_result.data.get('cleaning_operations', [])
            
            # Execute cleaning
            result = self._agent.execute_cleaning(csv_file_path, {'cleaning_operations': operations})
            
            if result.success:
                return result.data.get('cleaned_dataset_path', csv_file_path)
            else:
                raise Exception(result.message)
                
        except Exception as e:
            self.logger.error(f"Cleaning operations execution failed: {str(e)}")
            return csv_file_path  # Return original path on failure
    
    def generate_eda_questions(self, csv_file_path: str):
        """生成EDA问题 - 占位符实现"""
        return ["数据分布如何？", "有哪些异常值？", "变量之间的相关性如何？"]
    
    def solve_eda_questions(self, eda_questions: List[str], csv_file_path: str):
        """解决EDA问题 - 占位符实现"""
        return {"questions_solved": len(eda_questions), "insights": "EDA分析完成"}
    
    def generate_eda_summary(self, eda_results: Dict):
        """生成EDA摘要 - 占位符实现"""
        return "EDA分析摘要：数据质量良好，已识别主要模式和关系。"


class LegacyPredictionAgentWrapper:
    """预测Agent的向后兼容包装器"""
    
    def __init__(self, agent: IPredictionAgent):
        self._agent = agent
        self.response_variable = None
        self.logger = logging.getLogger(f"{__name__}.PredictionWrapper")
    
    def identify_response_variable(self, data_path: str):
        """识别响应变量 - 兼容接口"""
        # This would use the new agent's capabilities
        # For now, return a placeholder
        return {"response_variable": "target", "confidence": 0.8}
    
    def suggest_feature_engineering_methods(self, data_path: str):
        """建议特征工程方法 - 兼容接口"""
        # Use new agent
        try:
            # This would be implemented in the actual agent
            return [{"method": "标准化", "description": "对数值特征进行标准化"}]
        except Exception as e:
            self.logger.error(f"Feature engineering suggestion failed: {str(e)}")
            return []
    
    def suggest_modeling_methods(self):
        """建议建模方法 - 兼容接口"""
        try:
            result = self._agent.execute({
                'operation': 'suggest_models',
                'dataset_path': '',  # Would be provided in real usage
                'problem_type': 'classification'
            })
            
            if result.success:
                return result.data.get('models', [])
            else:
                return []
                
        except Exception as e:
            self.logger.error(f"Model suggestion failed: {str(e)}")
            return []
    
    def train_and_evaluate_combined_models(self, model_methods, feature_engineering_methods, csv_path):
        """训练和评估组合模型 - 兼容接口"""
        try:
            result = self._agent.execute({
                'operation': 'train_models',
                'dataset_path': csv_path,
                'model_configs': model_methods
            })
            
            if result.success:
                return result.data
            else:
                return {"error": result.message}
                
        except Exception as e:
            self.logger.error(f"Model training failed: {str(e)}")
            return {"error": str(e)}


# Global bridge instance
_bridge = None


def get_legacy_bridge() -> LegacyAgentBridge:
    """获取全局桥接实例"""
    global _bridge
    if _bridge is None:
        _bridge = LegacyAgentBridge()
    return _bridge


# Legacy factory functions for backward compatibility
def ProblemDefinitionAndDataCollectionAgent(memory=None, llm=None, **kwargs):
    """兼容原有的Agent创建方式"""
    bridge = get_legacy_bridge()
    return bridge.create_problem_definition_agent(
        memory=memory, 
        llm=llm,
        problem_description=kwargs.get('problem_description', ''),
        context_description=kwargs.get('context_description', '')
    )


def DataCleaningAndEDA_Agent(memory=None, llm=None, problem_description="", context_description="", 
                            check_unit="", var_json=None, hyp_json=None):
    """兼容原有的Agent创建方式"""
    bridge = get_legacy_bridge()
    return bridge.create_data_cleaning_agent(
        memory=memory,
        llm=llm,
        problem_description=problem_description,
        context_description=context_description,
        check_unit=check_unit,
        var_json=var_json,
        hyp_json=hyp_json
    )


def PredictionAndInferenceAgent(problem_description, context_description, eda_summary, memory=None, llm=None):
    """兼容原有的Agent创建方式"""
    bridge = get_legacy_bridge()
    return bridge.create_prediction_agent(
        problem_description=problem_description,
        context_description=context_description,
        eda_summary=eda_summary,
        memory=memory,
        llm=llm
    )