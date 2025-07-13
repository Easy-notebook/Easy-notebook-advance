"""
后端决定的Step/Stage流转逻辑规范
Backend-Driven Step/Stage Flow Logic Specification

This module defines the detailed logic for how the backend intelligently decides
when to proceed to the next step or stage in the DCLS workflow.
"""

from typing import Dict, Any, List, Optional, Callable
from enum import Enum
from dataclasses import dataclass
import logging

from domain.interfaces import AgentResult
from application.workflow.workflow_controller import FlowDecision, WorkflowState


class FlowConditionType(Enum):
    """流程条件类型"""
    RESULT_QUALITY = "result_quality"
    DATA_COMPLETENESS = "data_completeness"
    EXECUTION_SUCCESS = "execution_success"
    DEPENDENCY_SATISFACTION = "dependency_satisfaction"
    USER_CONFIRMATION = "user_confirmation"
    ERROR_THRESHOLD = "error_threshold"
    TIME_CONSTRAINT = "time_constraint"
    BUSINESS_RULE = "business_rule"


@dataclass
class FlowCondition:
    """流程条件定义"""
    condition_type: FlowConditionType
    operator: str  # ">=", "<=", "==", "!=", "contains", "exists"
    threshold_value: Any
    weight: float  # 权重 (0.0 - 1.0)
    is_mandatory: bool = False
    description: str = ""
    evaluation_function: Optional[Callable] = None


@dataclass
class FlowRule:
    """流程规则定义"""
    rule_id: str
    rule_name: str
    source_stage: str
    source_step: str
    target_decision: FlowDecision
    conditions: List[FlowCondition]
    priority: int  # 优先级，数字越小优先级越高
    confidence_boost: float = 0.0  # 置信度提升
    metadata: Dict[str, Any] = None


class DCLSFlowLogicSpecification:
    """
    DCLS工作流流转逻辑规范
    
    定义了详细的后端决策规则，用于确定何时进入下一个step或stage
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 初始化流程规则
        self.flow_rules = self._initialize_dcls_flow_rules()
        
        # 初始化阶段特定逻辑
        self.stage_specific_logic = self._initialize_stage_specific_logic()
        
        # 初始化步骤依赖关系
        self.step_dependencies = self._initialize_step_dependencies()
        
        self.logger.info("DCLS Flow Logic Specification initialized")
    
    def _initialize_dcls_flow_rules(self) -> List[FlowRule]:
        """初始化DCLS工作流的流转规则"""
        rules = []
        
        # Stage 0: Data Loading and Hypothesis Proposal Rules
        
        # Step 1 -> Step 2: Problem Definition Complete
        rules.append(FlowRule(
            rule_id="s0_step1_to_step2",
            rule_name="Problem Definition to Data Loading",
            source_stage="stage_0",
            source_step="step_1",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.7,
                    weight=0.4,
                    is_mandatory=True,
                    description="Problem definition quality must be >= 70%"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["problem_analysis", "variable_identification"],
                    weight=0.4,
                    is_mandatory=True,
                    description="Must contain problem analysis and variable identification"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.EXECUTION_SUCCESS,
                    operator="==",
                    threshold_value=True,
                    weight=0.2,
                    is_mandatory=True,
                    description="Agent execution must be successful"
                )
            ],
            priority=1,
            confidence_boost=0.2
        ))
        
        # Step 2 -> Step 3: Data Loading Complete
        rules.append(FlowRule(
            rule_id="s0_step2_to_step3",
            rule_name="Data Loading to Variable Analysis",
            source_stage="stage_0",
            source_step="step_2",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["data_summary", "basic_analysis"],
                    weight=0.5,
                    is_mandatory=True,
                    description="Must contain data summary and basic analysis"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.6,
                    weight=0.3,
                    is_mandatory=True,
                    description="Data loading quality must be >= 60%"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=0.8,
                    weight=0.2,
                    description="Data must be >= 80% complete",
                    evaluation_function=lambda result: self._evaluate_data_completeness(result)
                )
            ],
            priority=1,
            confidence_boost=0.15
        ))
        
        # Step 3 -> Step 4: Variable Analysis Complete
        rules.append(FlowRule(
            rule_id="s0_step3_to_step4",
            rule_name="Variable Analysis to Hypothesis Generation",
            source_stage="stage_0",
            source_step="step_3",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["variable_analysis", "relevant_variables"],
                    weight=0.6,
                    is_mandatory=True,
                    description="Must contain variable analysis and relevant variables"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=3,
                    weight=0.4,
                    description="Must identify at least 3 relevant variables",
                    evaluation_function=lambda result: self._count_relevant_variables(result)
                )
            ],
            priority=1,
            confidence_boost=0.1
        ))
        
        # Step 4 -> Stage 1: Hypothesis Generation Complete
        rules.append(FlowRule(
            rule_id="s0_step4_to_s1",
            rule_name="Hypothesis Generation to Data Cleaning Stage",
            source_stage="stage_0",
            source_step="step_4",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STAGE,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["hypotheses", "pcs_evaluation"],
                    weight=0.5,
                    is_mandatory=True,
                    description="Must contain hypotheses and PCS evaluation"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=2,
                    weight=0.3,
                    description="Must have at least 2 testable hypotheses",
                    evaluation_function=lambda result: self._count_testable_hypotheses(result)
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.75,
                    weight=0.2,
                    is_mandatory=True,
                    description="PCS evaluation quality must be >= 75%"
                )
            ],
            priority=1,
            confidence_boost=0.3
        ))
        
        # Stage 1: Data Cleaning and Validation Rules
        
        # Step 1 -> Step 2: Quality Assessment Complete
        rules.append(FlowRule(
            rule_id="s1_step1_to_step2",
            rule_name="Quality Assessment to Data Cleaning",
            source_stage="stage_1",
            source_step="step_1",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["quality_issues", "cleaning_plan"],
                    weight=0.6,
                    is_mandatory=True,
                    description="Must contain quality issues and cleaning plan"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator="<=",
                    threshold_value=10,
                    weight=0.4,
                    description="Must have manageable number of issues (<=10)",
                    evaluation_function=lambda result: self._count_data_issues(result)
                )
            ],
            priority=1,
            confidence_boost=0.15
        ))
        
        # Step 2 -> Step 3: Data Cleaning Complete
        rules.append(FlowRule(
            rule_id="s1_step2_to_step3",
            rule_name="Data Cleaning to Stability Analysis",
            source_stage="stage_1",
            source_step="step_2",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["cleaned_dataset", "cleaning_report"],
                    weight=0.5,
                    is_mandatory=True,
                    description="Must contain cleaned dataset and cleaning report"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=0.95,
                    weight=0.3,
                    description="Cleaned data completeness must be >= 95%",
                    evaluation_function=lambda result: self._evaluate_cleaning_completeness(result)
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.8,
                    weight=0.2,
                    is_mandatory=True,
                    description="Cleaning quality must be >= 80%"
                )
            ],
            priority=1,
            confidence_boost=0.2
        ))
        
        # Step 3 -> Stage 2: Stability Analysis Complete
        rules.append(FlowRule(
            rule_id="s1_step3_to_s2",
            rule_name="Stability Analysis to Model Development Stage",
            source_stage="stage_1",
            source_step="step_3",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STAGE,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["stability_datasets", "stability_report"],
                    weight=0.4,
                    is_mandatory=True,
                    description="Must contain stability datasets and report"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=3,
                    weight=0.3,
                    description="Must have at least 3 stable dataset versions",
                    evaluation_function=lambda result: self._count_stable_datasets(result)
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.7,
                    weight=0.3,
                    is_mandatory=True,
                    description="Stability analysis quality must be >= 70%"
                )
            ],
            priority=1,
            confidence_boost=0.25
        ))
        
        # Stage 2: Model Development Rules
        
        # Step 1 -> Step 2: EDA Complete
        rules.append(FlowRule(
            rule_id="s2_step1_to_step2",
            rule_name="EDA to Model Training",
            source_stage="stage_2",
            source_step="step_1",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["eda_results", "insights"],
                    weight=0.5,
                    is_mandatory=True,
                    description="Must contain EDA results and insights"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=5,
                    weight=0.3,
                    description="Must have at least 5 key insights",
                    evaluation_function=lambda result: self._count_key_insights(result)
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.65,
                    weight=0.2,
                    is_mandatory=True,
                    description="EDA quality must be >= 65%"
                )
            ],
            priority=1,
            confidence_boost=0.15
        ))
        
        # Step 2 -> Step 3: Model Training Complete
        rules.append(FlowRule(
            rule_id="s2_step2_to_step3",
            rule_name="Model Training to Model Evaluation",
            source_stage="stage_2",
            source_step="step_2",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["trained_models", "model_performance"],
                    weight=0.4,
                    is_mandatory=True,
                    description="Must contain trained models and performance metrics"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=3,
                    weight=0.3,
                    description="Must have at least 3 trained models",
                    evaluation_function=lambda result: self._count_trained_models(result)
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=0.6,
                    weight=0.3,
                    description="Best model performance must be >= 60%",
                    evaluation_function=lambda result: self._get_best_model_performance(result)
                )
            ],
            priority=1,
            confidence_boost=0.2
        ))
        
        # Step 3 -> Stage 3: Model Evaluation Complete
        rules.append(FlowRule(
            rule_id="s2_step3_to_s3",
            rule_name="Model Evaluation to Results Communication Stage",
            source_stage="stage_2",
            source_step="step_3",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STAGE,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["evaluation_results", "model_comparison"],
                    weight=0.5,
                    is_mandatory=True,
                    description="Must contain evaluation results and model comparison"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=0.7,
                    weight=0.3,
                    description="Final model performance must be >= 70%",
                    evaluation_function=lambda result: self._evaluate_final_model_performance(result)
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.75,
                    weight=0.2,
                    is_mandatory=True,
                    description="Evaluation quality must be >= 75%"
                )
            ],
            priority=1,
            confidence_boost=0.3
        ))
        
        # Stage 3: Results Communication Rules
        
        # Step 1 -> Step 2: Results Analysis Complete
        rules.append(FlowRule(
            rule_id="s3_step1_to_step2",
            rule_name="Results Analysis to Report Generation",
            source_stage="stage_3",
            source_step="step_1",
            target_decision=FlowDecision.PROCEED_TO_NEXT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["final_analysis", "key_findings"],
                    weight=0.6,
                    is_mandatory=True,
                    description="Must contain final analysis and key findings"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=3,
                    weight=0.4,
                    description="Must have at least 3 key findings",
                    evaluation_function=lambda result: self._count_key_findings(result)
                )
            ],
            priority=1,
            confidence_boost=0.15
        ))
        
        # Step 2 -> Complete: Report Generation Complete
        rules.append(FlowRule(
            rule_id="s3_step2_complete",
            rule_name="Report Generation to Workflow Complete",
            source_stage="stage_3",
            source_step="step_2",
            target_decision=FlowDecision.COMPLETE_WORKFLOW,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.DATA_COMPLETENESS,
                    operator="contains",
                    threshold_value=["comprehensive_report", "recommendations"],
                    weight=0.5,
                    is_mandatory=True,
                    description="Must contain comprehensive report and recommendations"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.RESULT_QUALITY,
                    operator=">=",
                    threshold_value=0.8,
                    weight=0.3,
                    is_mandatory=True,
                    description="Report quality must be >= 80%"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.BUSINESS_RULE,
                    operator=">=",
                    threshold_value=5,
                    weight=0.2,
                    description="Must have at least 5 actionable recommendations",
                    evaluation_function=lambda result: self._count_recommendations(result)
                )
            ],
            priority=1,
            confidence_boost=0.4
        ))
        
        # Error Handling Rules
        
        # Generic retry rule for any step with recoverable errors
        rules.append(FlowRule(
            rule_id="generic_retry_rule",
            rule_name="Generic Error Retry",
            source_stage="*",  # Apply to any stage
            source_step="*",   # Apply to any step
            target_decision=FlowDecision.REPEAT_CURRENT_STEP,
            conditions=[
                FlowCondition(
                    condition_type=FlowConditionType.EXECUTION_SUCCESS,
                    operator="==",
                    threshold_value=False,
                    weight=0.6,
                    is_mandatory=True,
                    description="Execution must have failed"
                ),
                FlowCondition(
                    condition_type=FlowConditionType.ERROR_THRESHOLD,
                    operator="<",
                    threshold_value=3,
                    weight=0.4,
                    is_mandatory=True,
                    description="Retry count must be less than 3",
                    evaluation_function=lambda result: self._get_retry_count(result)
                )
            ],
            priority=10,  # Lower priority
            confidence_boost=0.1
        ))
        
        return rules
    
    def _initialize_stage_specific_logic(self) -> Dict[str, Dict[str, Any]]:
        """初始化阶段特定逻辑"""
        return {
            "stage_0": {
                "name": "Data Loading and Hypothesis Proposal",
                "completion_requirements": {
                    "min_steps_completed": 4,
                    "required_outputs": ["hypotheses", "pcs_evaluation", "variable_analysis"],
                    "quality_threshold": 0.7
                },
                "auto_progression": True,
                "allows_skipping": False,
                "max_execution_time": 3600,  # 1 hour
                "critical_outputs": ["hypotheses"]
            },
            "stage_1": {
                "name": "Data Cleaning and Validation",
                "completion_requirements": {
                    "min_steps_completed": 3,
                    "required_outputs": ["cleaned_dataset", "stability_datasets"],
                    "quality_threshold": 0.75
                },
                "auto_progression": True,
                "allows_skipping": False,
                "max_execution_time": 7200,  # 2 hours
                "critical_outputs": ["cleaned_dataset", "stability_datasets"]
            },
            "stage_2": {
                "name": "Model Development and Analysis",
                "completion_requirements": {
                    "min_steps_completed": 3,
                    "required_outputs": ["trained_models", "evaluation_results"],
                    "quality_threshold": 0.7
                },
                "auto_progression": True,
                "allows_skipping": False,
                "max_execution_time": 10800,  # 3 hours
                "critical_outputs": ["trained_models", "evaluation_results"]
            },
            "stage_3": {
                "name": "Results Communication and Delivery",
                "completion_requirements": {
                    "min_steps_completed": 2,
                    "required_outputs": ["comprehensive_report", "recommendations"],
                    "quality_threshold": 0.8
                },
                "auto_progression": False,  # May require user review
                "allows_skipping": False,
                "max_execution_time": 1800,  # 30 minutes
                "critical_outputs": ["comprehensive_report"]
            }
        }
    
    def _initialize_step_dependencies(self) -> Dict[str, Dict[str, List[str]]]:
        """初始化步骤依赖关系"""
        return {
            "stage_0": {
                "step_1": [],  # No dependencies
                "step_2": ["step_1"],
                "step_3": ["step_1", "step_2"],
                "step_4": ["step_1", "step_2", "step_3"]
            },
            "stage_1": {
                "step_1": [],  # Depends on stage_0 completion
                "step_2": ["step_1"],
                "step_3": ["step_1", "step_2"]
            },
            "stage_2": {
                "step_1": [],  # Depends on stage_1 completion
                "step_2": ["step_1"],
                "step_3": ["step_1", "step_2"]
            },
            "stage_3": {
                "step_1": [],  # Depends on stage_2 completion
                "step_2": ["step_1"]
            }
        }
    
    def evaluate_flow_conditions(
        self, 
        rule: FlowRule, 
        agent_result: AgentResult, 
        workflow_state: WorkflowState
    ) -> Tuple[bool, float, List[str]]:
        """
        评估流程条件
        
        Returns:
        - bool: 是否满足条件
        - float: 置信度分数
        - List[str]: 评估详情
        """
        total_weight = 0.0
        satisfied_weight = 0.0
        evaluation_details = []
        mandatory_failed = False
        
        for condition in rule.conditions:
            total_weight += condition.weight
            
            # 评估条件
            is_satisfied = self._evaluate_single_condition(condition, agent_result, workflow_state)
            
            if is_satisfied:
                satisfied_weight += condition.weight
                evaluation_details.append(f"✅ {condition.description}")
            else:
                evaluation_details.append(f"❌ {condition.description}")
                if condition.is_mandatory:
                    mandatory_failed = True
        
        # 计算置信度
        if total_weight > 0:
            confidence = satisfied_weight / total_weight
        else:
            confidence = 0.0
        
        # 如果有强制条件失败，则整体失败
        overall_satisfied = not mandatory_failed and confidence >= 0.6
        
        # 应用规则的置信度提升
        if overall_satisfied:
            confidence = min(1.0, confidence + rule.confidence_boost)
        
        return overall_satisfied, confidence, evaluation_details
    
    def _evaluate_single_condition(
        self, 
        condition: FlowCondition, 
        agent_result: AgentResult, 
        workflow_state: WorkflowState
    ) -> bool:
        """评估单个条件"""
        try:
            if condition.evaluation_function:
                # 使用自定义评估函数
                return condition.evaluation_function(agent_result) >= condition.threshold_value
            
            # 标准评估逻辑
            if condition.condition_type == FlowConditionType.RESULT_QUALITY:
                return self._evaluate_result_quality(agent_result) >= condition.threshold_value
            
            elif condition.condition_type == FlowConditionType.DATA_COMPLETENESS:
                return self._evaluate_data_completeness_condition(
                    agent_result, condition.operator, condition.threshold_value
                )
            
            elif condition.condition_type == FlowConditionType.EXECUTION_SUCCESS:
                return agent_result.success == condition.threshold_value
            
            elif condition.condition_type == FlowConditionType.DEPENDENCY_SATISFACTION:
                return self._evaluate_dependency_satisfaction(workflow_state, condition.threshold_value)
            
            # 其他条件类型的评估逻辑...
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error evaluating condition {condition.condition_type}: {str(e)}")
            return False
    
    def get_applicable_rules(self, stage_id: str, step_id: str) -> List[FlowRule]:
        """获取适用于当前stage和step的规则"""
        applicable_rules = []
        
        for rule in self.flow_rules:
            # 检查是否适用于当前stage和step
            if (rule.source_stage == "*" or rule.source_stage == stage_id) and \
               (rule.source_step == "*" or rule.source_step == step_id):
                applicable_rules.append(rule)
        
        # 按优先级排序
        applicable_rules.sort(key=lambda r: r.priority)
        
        return applicable_rules
    
    # Business rule evaluation functions
    
    def _evaluate_data_completeness(self, result: AgentResult) -> float:
        """评估数据完整性"""
        if not result.data or not isinstance(result.data, dict):
            return 0.0
        
        # 检查数据集的完整性指标
        if 'completeness_score' in result.data:
            return result.data['completeness_score']
        
        # 估算完整性
        missing_ratio = result.data.get('missing_percentage', 0.0)
        return max(0.0, 1.0 - missing_ratio / 100.0)
    
    def _count_relevant_variables(self, result: AgentResult) -> int:
        """计算相关变量数量"""
        if not result.data:
            return 0
        
        relevant_vars = result.data.get('relevant_variables', [])
        if isinstance(relevant_vars, list):
            return len(relevant_vars)
        elif isinstance(relevant_vars, dict):
            return len(relevant_vars.keys())
        
        return 0
    
    def _count_testable_hypotheses(self, result: AgentResult) -> int:
        """计算可测试假设数量"""
        if not result.data:
            return 0
        
        hypotheses = result.data.get('hypotheses', [])
        if isinstance(hypotheses, list):
            testable_count = 0
            for h in hypotheses:
                if isinstance(h, dict) and h.get('testable', False):
                    testable_count += 1
            return testable_count
        
        return 0
    
    def _count_data_issues(self, result: AgentResult) -> int:
        """计算数据质量问题数量"""
        if not result.data:
            return 0
        
        issues = result.data.get('quality_issues', [])
        return len(issues) if isinstance(issues, list) else 0
    
    def _evaluate_cleaning_completeness(self, result: AgentResult) -> float:
        """评估清理完整性"""
        if not result.data:
            return 0.0
        
        return result.data.get('cleaning_completeness', 0.0)
    
    def _count_stable_datasets(self, result: AgentResult) -> int:
        """计算稳定数据集数量"""
        if not result.data:
            return 0
        
        datasets = result.data.get('stability_datasets', [])
        return len(datasets) if isinstance(datasets, list) else 0
    
    def _count_key_insights(self, result: AgentResult) -> int:
        """计算关键洞察数量"""
        if not result.data:
            return 0
        
        insights = result.data.get('key_insights', [])
        return len(insights) if isinstance(insights, list) else 0
    
    def _count_trained_models(self, result: AgentResult) -> int:
        """计算训练模型数量"""
        if not result.data:
            return 0
        
        models = result.data.get('trained_models', [])
        return len(models) if isinstance(models, list) else 0
    
    def _get_best_model_performance(self, result: AgentResult) -> float:
        """获取最佳模型性能"""
        if not result.data:
            return 0.0
        
        performance = result.data.get('model_performance', {})
        if isinstance(performance, dict):
            best_model = performance.get('best_model', {})
            return best_model.get('validation_score', 0.0)
        
        return 0.0
    
    def _evaluate_final_model_performance(self, result: AgentResult) -> float:
        """评估最终模型性能"""
        if not result.data:
            return 0.0
        
        evaluation_results = result.data.get('evaluation_results', {})
        if isinstance(evaluation_results, dict):
            return evaluation_results.get('final_score', 0.0)
        
        return 0.0
    
    def _count_key_findings(self, result: AgentResult) -> int:
        """计算关键发现数量"""
        if not result.data:
            return 0
        
        findings = result.data.get('key_findings', [])
        return len(findings) if isinstance(findings, list) else 0
    
    def _count_recommendations(self, result: AgentResult) -> int:
        """计算建议数量"""
        if not result.data:
            return 0
        
        recommendations = result.data.get('recommendations', [])
        return len(recommendations) if isinstance(recommendations, list) else 0
    
    def _get_retry_count(self, result: AgentResult) -> int:
        """获取重试次数"""
        if not result.metadata:
            return 0
        
        return result.metadata.get('retry_count', 0)
    
    def _evaluate_result_quality(self, result: AgentResult) -> float:
        """评估结果质量"""
        if not result.success:
            return 0.0
        
        quality_score = 0.0
        
        # 基于执行成功
        quality_score += 0.3
        
        # 基于数据完整性
        if result.data and isinstance(result.data, dict):
            data_score = min(1.0, len(result.data) / 5.0)  # 假设5个字段为完整
            quality_score += data_score * 0.4
        
        # 基于执行时间(合理范围内)
        if 0 < result.execution_time < 300:  # 5分钟内
            quality_score += 0.2
        
        # 基于Token使用效率
        if 0 < result.tokens_used < 10000:
            quality_score += 0.1
        
        return min(1.0, quality_score)
    
    def _evaluate_data_completeness_condition(
        self, 
        result: AgentResult, 
        operator: str, 
        threshold: Any
    ) -> bool:
        """评估数据完整性条件"""
        if not result.data:
            return False
        
        if operator == "contains":
            if isinstance(threshold, list):
                return all(key in result.data for key in threshold)
            else:
                return threshold in result.data
        
        elif operator == "exists":
            return threshold in result.data
        
        return False
    
    def _evaluate_dependency_satisfaction(
        self, 
        workflow_state: WorkflowState, 
        required_dependencies: List[str]
    ) -> bool:
        """评估依赖满足情况"""
        return all(dep in workflow_state.completed_steps for dep in required_dependencies)