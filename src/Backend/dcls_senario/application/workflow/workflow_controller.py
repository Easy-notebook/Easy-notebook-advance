from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
import logging

from domain.interfaces import AgentResult


class StepStatus(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_INPUT = "requires_input"
    READY_FOR_NEXT = "ready_for_next"


class StageStatus(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class FlowDecision(Enum):
    CONTINUE_CURRENT_STEP = "continue_current_step"
    PROCEED_TO_NEXT_STEP = "proceed_to_next_step"
    PROCEED_TO_NEXT_STAGE = "proceed_to_next_stage"
    REPEAT_CURRENT_STEP = "repeat_current_step"
    REQUIRE_USER_INPUT = "require_user_input"
    COMPLETE_WORKFLOW = "complete_workflow"
    HANDLE_ERROR = "handle_error"


@dataclass
class StepInfo:
    step_id: str
    step_name: str
    stage_id: str
    required_inputs: List[str]
    expected_outputs: List[str]
    agent_type: str
    dependencies: List[str]
    is_optional: bool = False
    retry_count: int = 0
    max_retries: int = 3


@dataclass 
class StageInfo:
    stage_id: str
    stage_name: str
    steps: List[StepInfo]
    stage_dependencies: List[str]
    completion_criteria: Dict[str, Any]


@dataclass
class WorkflowState:
    current_stage_id: str
    current_step_id: str
    completed_steps: List[str]
    completed_stages: List[str]
    step_results: Dict[str, AgentResult]
    stage_results: Dict[str, Dict[str, Any]]
    workflow_metadata: Dict[str, Any]
    errors: List[Dict[str, Any]]


@dataclass
class FlowControlDecision:
    decision: FlowDecision
    next_step_id: Optional[str]
    next_stage_id: Optional[str]
    required_inputs: List[str]
    reasons: List[str]
    confidence: float  # 0.0 to 1.0
    metadata: Dict[str, Any]


class IntelligentWorkflowController:
    """
    智能工作流控制器 - 管理后端驱动的step/stage流转决策
    
    Features:
    1. 基于agent结果智能决策下一步操作
    2. 支持动态工作流调整
    3. 维护无状态后端设计
    4. 提供前端状态管理接口
    5. 错误处理和重试逻辑
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 定义DCLS工作流的stages和steps
        self.workflow_definition = self._initialize_dcls_workflow()
        
        # 决策规则配置
        self.decision_rules = self._initialize_decision_rules()
        
        # 初始化详细的流程逻辑规范
        from application.workflow.flow_logic_specification import DCLSFlowLogicSpecification
        self.flow_logic_spec = DCLSFlowLogicSpecification()
        
        self.logger.info("IntelligentWorkflowController initialized with detailed flow logic")
    
    def _initialize_dcls_workflow(self) -> List[StageInfo]:
        """初始化DCLS工作流定义"""
        
        # Stage 0: Data Loading and Hypothesis Proposal
        stage_0_steps = [
            StepInfo(
                step_id="step_1",
                step_name="Problem Definition",
                stage_id="stage_0", 
                required_inputs=["problem_description", "context_description"],
                expected_outputs=["problem_analysis", "variable_identification"],
                agent_type="ProblemDefinitionAgent",
                dependencies=[]
            ),
            StepInfo(
                step_id="step_2", 
                step_name="Data Loading and Exploration",
                stage_id="stage_0",
                required_inputs=["dataset_path"],
                expected_outputs=["data_summary", "data_quality_report"],
                agent_type="DataAnalysisAgent",
                dependencies=["step_1"]
            ),
            StepInfo(
                step_id="step_3",
                step_name="Variable Analysis",
                stage_id="stage_0",
                required_inputs=["dataset_path", "problem_context"],
                expected_outputs=["variable_analysis", "relevant_variables"],
                agent_type="DataAnalysisAgent", 
                dependencies=["step_2"]
            ),
            StepInfo(
                step_id="step_4",
                step_name="Hypothesis Generation", 
                stage_id="stage_0",
                required_inputs=["problem_context", "variable_analysis"],
                expected_outputs=["hypotheses", "pcs_evaluation"],
                agent_type="PCSAgent",
                dependencies=["step_3"]
            )
        ]
        
        # Stage 1: Data Cleaning and Validation
        stage_1_steps = [
            StepInfo(
                step_id="step_1",
                step_name="Data Quality Assessment",
                stage_id="stage_1",
                required_inputs=["dataset_path", "hypotheses"],
                expected_outputs=["quality_issues", "cleaning_plan"],
                agent_type="DataCleaningAgent",
                dependencies=[]
            ),
            StepInfo(
                step_id="step_2",
                step_name="Data Cleaning Implementation",
                stage_id="stage_1", 
                required_inputs=["dataset_path", "cleaning_plan"],
                expected_outputs=["cleaned_dataset", "cleaning_report"],
                agent_type="DataCleaningAgent",
                dependencies=["step_1"]
            ),
            StepInfo(
                step_id="step_3",
                step_name="Stability Analysis",
                stage_id="stage_1",
                required_inputs=["cleaned_dataset", "cleaning_code"],
                expected_outputs=["stability_datasets", "stability_report"],
                agent_type="PCSAgent",
                dependencies=["step_2"]
            )
        ]
        
        # Stage 2: Model Development and Analysis
        stage_2_steps = [
            StepInfo(
                step_id="step_1", 
                step_name="Exploratory Data Analysis",
                stage_id="stage_2",
                required_inputs=["cleaned_dataset", "hypotheses"],
                expected_outputs=["eda_results", "insights"],
                agent_type="AnalysisAgent",
                dependencies=[]
            ),
            StepInfo(
                step_id="step_2",
                step_name="Model Selection and Training",
                stage_id="stage_2",
                required_inputs=["cleaned_dataset", "eda_results"],
                expected_outputs=["trained_models", "model_performance"],
                agent_type="PredictionAgent", 
                dependencies=["step_1"]
            ),
            StepInfo(
                step_id="step_3",
                step_name="Model Evaluation",
                stage_id="stage_2",
                required_inputs=["trained_models", "test_datasets"],
                expected_outputs=["evaluation_results", "model_comparison"],
                agent_type="ResultsEvaluationAgent",
                dependencies=["step_2"]
            )
        ]
        
        # Stage 3: Results Communication and Delivery
        stage_3_steps = [
            StepInfo(
                step_id="step_1",
                step_name="Results Analysis",
                stage_id="stage_3",
                required_inputs=["evaluation_results", "model_performance"],
                expected_outputs=["final_analysis", "key_findings"],
                agent_type="ResultsCommunicationAgent",
                dependencies=[]
            ),
            StepInfo(
                step_id="step_2",
                step_name="Report Generation", 
                stage_id="stage_3",
                required_inputs=["final_analysis", "all_results"],
                expected_outputs=["comprehensive_report", "recommendations"],
                agent_type="ResultsCommunicationAgent",
                dependencies=["step_1"]
            )
        ]
        
        return [
            StageInfo(
                stage_id="stage_0",
                stage_name="Data Loading and Hypothesis Proposal",
                steps=stage_0_steps,
                stage_dependencies=[],
                completion_criteria={"required_outputs": ["hypotheses", "pcs_evaluation"]}
            ),
            StageInfo(
                stage_id="stage_1", 
                stage_name="Data Cleaning and Validation",
                steps=stage_1_steps,
                stage_dependencies=["stage_0"],
                completion_criteria={"required_outputs": ["stability_datasets", "cleaned_dataset"]}
            ),
            StageInfo(
                stage_id="stage_2",
                stage_name="Model Development and Analysis", 
                steps=stage_2_steps,
                stage_dependencies=["stage_1"],
                completion_criteria={"required_outputs": ["evaluation_results", "trained_models"]}
            ),
            StageInfo(
                stage_id="stage_3",
                stage_name="Results Communication and Delivery",
                steps=stage_3_steps, 
                stage_dependencies=["stage_2"],
                completion_criteria={"required_outputs": ["comprehensive_report", "recommendations"]}
            )
        ]
    
    def _initialize_decision_rules(self) -> Dict[str, Any]:
        """初始化决策规则配置"""
        return {
            "success_threshold": 0.8,  # Agent结果成功率阈值
            "quality_threshold": 0.7,  # 结果质量阈值
            "confidence_threshold": 0.6,  # 决策置信度阈值
            "max_retry_attempts": 3,  # 最大重试次数
            "required_data_completeness": 0.9,  # 数据完整性要求
            "stage_completion_requirements": {
                "stage_0": ["hypotheses", "variable_analysis"],
                "stage_1": ["cleaned_dataset", "stability_analysis"],
                "stage_2": ["model_results", "evaluation_metrics"],
                "stage_3": ["final_report", "recommendations"]
            }
        }
    
    def analyze_and_decide_next_action(
        self, 
        current_state: WorkflowState, 
        latest_result: AgentResult,
        context: Dict[str, Any] = None
    ) -> FlowControlDecision:
        """
        分析当前状态和最新结果，决定下一步行动
        
        这是核心决策方法，实现智能工作流控制
        """
        try:
            self.logger.info(f"Analyzing workflow state for decision making")
            
            # 获取当前step和stage信息
            current_step = self._get_step_info(current_state.current_stage_id, current_state.current_step_id)
            current_stage = self._get_stage_info(current_state.current_stage_id)
            
            if not current_step or not current_stage:
                return self._create_error_decision("Invalid current step or stage")
            
            # 分析最新结果质量
            result_quality = self._analyze_result_quality(latest_result, current_step)
            
            # 检查当前step是否完成
            step_completion = self._check_step_completion(latest_result, current_step, current_state)
            
            # 检查stage完成状态
            stage_completion = self._check_stage_completion(current_stage, current_state)
            
            # 基于分析结果做决策
            decision = self._make_flow_decision(
                result_quality=result_quality,
                step_completion=step_completion,
                stage_completion=stage_completion,
                current_state=current_state,
                context=context or {}
            )
            
            self.logger.info(f"Flow decision made: {decision.decision.value}")
            return decision
            
        except Exception as e:
            self.logger.error(f"Error in workflow decision making: {str(e)}")
            return self._create_error_decision(f"Decision making error: {str(e)}")
    
    def _analyze_result_quality(self, result: AgentResult, step: StepInfo) -> Dict[str, Any]:
        """分析agent结果质量"""
        quality_score = 0.0
        quality_factors = []
        
        # 基础成功检查
        if result.success:
            quality_score += 0.3
            quality_factors.append("execution_success")
        
        # 数据完整性检查
        if result.data and isinstance(result.data, dict):
            expected_outputs = step.expected_outputs
            provided_outputs = list(result.data.keys())
            
            completeness = len(set(provided_outputs) & set(expected_outputs)) / len(expected_outputs)
            quality_score += completeness * 0.4
            quality_factors.append(f"data_completeness_{completeness:.2f}")
        
        # 执行时间合理性检查
        if result.execution_time < 300:  # 5分钟内
            quality_score += 0.1
            quality_factors.append("reasonable_execution_time")
        
        # Token使用效率检查
        if result.tokens_used > 0 and result.tokens_used < 10000:
            quality_score += 0.1
            quality_factors.append("efficient_token_usage")
        
        # 错误信息检查
        if not result.data.get('error') and 'error' not in result.message.lower():
            quality_score += 0.1
            quality_factors.append("no_errors_detected")
        
        return {
            "score": min(quality_score, 1.0),
            "factors": quality_factors,
            "is_acceptable": quality_score >= self.decision_rules["quality_threshold"]
        }
    
    def _check_step_completion(self, result: AgentResult, step: StepInfo, state: WorkflowState) -> Dict[str, Any]:
        """检查step完成状态"""
        completion_status = {
            "is_complete": False,
            "missing_outputs": [],
            "has_errors": False,
            "retry_needed": False,
            "reasons": []
        }
        
        # 检查是否有错误
        if not result.success or result.data.get('error'):
            completion_status["has_errors"] = True
            completion_status["reasons"].append("execution_errors")
            
            # 检查是否需要重试
            if step.retry_count < step.max_retries:
                completion_status["retry_needed"] = True
                completion_status["reasons"].append("retry_available")
        
        # 检查输出完整性
        if result.data and isinstance(result.data, dict):
            expected_outputs = set(step.expected_outputs)
            provided_outputs = set(result.data.keys())
            missing_outputs = expected_outputs - provided_outputs
            
            if missing_outputs:
                completion_status["missing_outputs"] = list(missing_outputs)
                completion_status["reasons"].append("incomplete_outputs")
            else:
                completion_status["is_complete"] = True
                completion_status["reasons"].append("all_outputs_provided")
        
        return completion_status
    
    def _check_stage_completion(self, stage: StageInfo, state: WorkflowState) -> Dict[str, Any]:
        """检查stage完成状态"""
        completion_status = {
            "is_complete": False,
            "completed_steps": [],
            "remaining_steps": [],
            "can_proceed": False,
            "completion_percentage": 0.0
        }
        
        # 统计已完成的步骤
        stage_steps = [step.step_id for step in stage.steps]
        completed_steps = [step_id for step_id in stage_steps if step_id in state.completed_steps]
        remaining_steps = [step_id for step_id in stage_steps if step_id not in state.completed_steps]
        
        completion_status["completed_steps"] = completed_steps
        completion_status["remaining_steps"] = remaining_steps
        completion_status["completion_percentage"] = len(completed_steps) / len(stage_steps) if stage_steps else 0.0
        
        # 检查是否可以进入下一个stage
        required_outputs = self.decision_rules["stage_completion_requirements"].get(stage.stage_id, [])
        available_outputs = []
        
        for step_id, result in state.step_results.items():
            if result.success and result.data:
                available_outputs.extend(result.data.keys())
        
        has_required_outputs = all(output in available_outputs for output in required_outputs)
        
        if not remaining_steps and has_required_outputs:
            completion_status["is_complete"] = True
            completion_status["can_proceed"] = True
        elif completion_status["completion_percentage"] >= 0.8 and has_required_outputs:
            completion_status["can_proceed"] = True
        
        return completion_status
    
    def _make_flow_decision(
        self,
        result_quality: Dict[str, Any],
        step_completion: Dict[str, Any], 
        stage_completion: Dict[str, Any],
        current_state: WorkflowState,
        context: Dict[str, Any]
    ) -> FlowControlDecision:
        """基于详细流程逻辑规范制定流程决策"""
        
        # 获取适用的流程规则
        applicable_rules = self.flow_logic_spec.get_applicable_rules(
            current_state.current_stage_id,
            current_state.current_step_id
        )
        
        # 获取最新的agent结果
        latest_result = list(current_state.step_results.values())[-1] if current_state.step_results else None
        
        if not latest_result:
            # 如果没有结果，返回默认决策
            return self._create_default_decision(current_state, ["No agent result available"])
        
        best_decision = None
        best_confidence = 0.0
        all_evaluation_details = []
        
        # 评估每个适用的规则
        for rule in applicable_rules:
            try:
                is_satisfied, confidence, details = self.flow_logic_spec.evaluate_flow_conditions(
                    rule, latest_result, current_state
                )
                
                all_evaluation_details.extend([f"[{rule.rule_name}] {detail}" for detail in details])
                
                if is_satisfied and confidence > best_confidence:
                    best_confidence = confidence
                    best_decision = self._create_decision_from_rule(rule, current_state, confidence, details)
                    
                self.logger.debug(f"Rule {rule.rule_id}: satisfied={is_satisfied}, confidence={confidence:.2f}")
                
            except Exception as e:
                self.logger.error(f"Error evaluating rule {rule.rule_id}: {str(e)}")
                all_evaluation_details.append(f"[{rule.rule_name}] ❌ Rule evaluation error: {str(e)}")
        
        # 如果有最佳决策，返回它
        if best_decision:
            best_decision.reasons.extend(all_evaluation_details)
            self.logger.info(f"Selected decision: {best_decision.decision.value} with confidence {best_confidence:.2f}")
            return best_decision
        
        # 如果没有规则匹配，使用回退逻辑
        return self._create_fallback_decision(
            current_state, 
            result_quality, 
            step_completion, 
            stage_completion, 
            all_evaluation_details
        )
    
    def _create_decision_from_rule(
        self, 
        rule, 
        current_state: WorkflowState, 
        confidence: float, 
        details: List[str]
    ) -> FlowControlDecision:
        """从规则创建流程决策"""
        
        next_step_id = None
        next_stage_id = None
        required_inputs = []
        
        # 根据决策类型确定下一步
        if rule.target_decision == FlowDecision.PROCEED_TO_NEXT_STEP:
            next_step = self._get_next_step_in_stage(current_state.current_stage_id, current_state.current_step_id)
            if next_step:
                next_step_id = next_step.step_id
                next_stage_id = current_state.current_stage_id
                required_inputs = next_step.required_inputs
        
        elif rule.target_decision == FlowDecision.PROCEED_TO_NEXT_STAGE:
            next_stage = self._get_next_stage(current_state.current_stage_id)
            if next_stage:
                next_stage_id = next_stage.stage_id
                next_step_id = next_stage.steps[0].step_id
                required_inputs = next_stage.steps[0].required_inputs
        
        elif rule.target_decision == FlowDecision.REPEAT_CURRENT_STEP:
            next_step_id = current_state.current_step_id
            next_stage_id = current_state.current_stage_id
            current_step = self._get_step_info(current_state.current_stage_id, current_state.current_step_id)
            if current_step:
                required_inputs = current_step.required_inputs
        
        elif rule.target_decision == FlowDecision.REQUIRE_USER_INPUT:
            next_step_id = current_state.current_step_id
            next_stage_id = current_state.current_stage_id
            # required_inputs will be determined by the specific condition
        
        return FlowControlDecision(
            decision=rule.target_decision,
            next_step_id=next_step_id,
            next_stage_id=next_stage_id,
            required_inputs=required_inputs,
            reasons=details,
            confidence=confidence,
            metadata={
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "rule_priority": rule.priority,
                "stage_transition": f"{current_state.current_stage_id} -> {next_stage_id}" if next_stage_id != current_state.current_stage_id else None,
                "step_transition": f"{current_state.current_step_id} -> {next_step_id}" if next_step_id != current_state.current_step_id else None
            }
        )
    
    def _create_fallback_decision(
        self,
        current_state: WorkflowState,
        result_quality: Dict[str, Any],
        step_completion: Dict[str, Any],
        stage_completion: Dict[str, Any],
        evaluation_details: List[str]
    ) -> FlowControlDecision:
        """创建回退决策（当没有规则匹配时）"""
        
        reasons = ["No specific rules matched, using fallback logic"] + evaluation_details
        
        # 错误处理优先
        if step_completion["has_errors"]:
            if step_completion["retry_needed"]:
                return FlowControlDecision(
                    decision=FlowDecision.REPEAT_CURRENT_STEP,
                    next_step_id=current_state.current_step_id,
                    next_stage_id=current_state.current_stage_id,
                    required_inputs=[],
                    reasons=reasons + ["Fallback: Retry on error"],
                    confidence=0.6,
                    metadata={"fallback_reason": "retry_on_error"}
                )
            else:
                return FlowControlDecision(
                    decision=FlowDecision.HANDLE_ERROR,
                    next_step_id=None,
                    next_stage_id=None,
                    required_inputs=["error_resolution"],
                    reasons=reasons + ["Fallback: Handle unrecoverable error"],
                    confidence=0.8,
                    metadata={"fallback_reason": "unrecoverable_error"}
                )
        
        # 如果结果质量可接受且步骤完成
        if result_quality["is_acceptable"] and step_completion["is_complete"]:
            # 尝试进入下一步
            next_step = self._get_next_step_in_stage(current_state.current_stage_id, current_state.current_step_id)
            if next_step:
                return FlowControlDecision(
                    decision=FlowDecision.PROCEED_TO_NEXT_STEP,
                    next_step_id=next_step.step_id,
                    next_stage_id=current_state.current_stage_id,
                    required_inputs=next_step.required_inputs,
                    reasons=reasons + ["Fallback: Proceed to next step"],
                    confidence=0.5,
                    metadata={"fallback_reason": "next_step"}
                )
            else:
                # 当前stage的所有步骤完成，尝试进入下一stage
                next_stage = self._get_next_stage(current_state.current_stage_id)
                if next_stage:
                    return FlowControlDecision(
                        decision=FlowDecision.PROCEED_TO_NEXT_STAGE,
                        next_step_id=next_stage.steps[0].step_id,
                        next_stage_id=next_stage.stage_id,
                        required_inputs=next_stage.steps[0].required_inputs,
                        reasons=reasons + ["Fallback: Proceed to next stage"],
                        confidence=0.6,
                        metadata={"fallback_reason": "next_stage"}
                    )
                else:
                    # 所有stage完成
                    return FlowControlDecision(
                        decision=FlowDecision.COMPLETE_WORKFLOW,
                        next_step_id=None,
                        next_stage_id=None,
                        required_inputs=[],
                        reasons=reasons + ["Fallback: Workflow complete"],
                        confidence=0.9,
                        metadata={"fallback_reason": "workflow_complete"}
                    )
        
        # 默认：继续当前步骤
        return FlowControlDecision(
            decision=FlowDecision.CONTINUE_CURRENT_STEP,
            next_step_id=current_state.current_step_id,
            next_stage_id=current_state.current_stage_id,
            required_inputs=[],
            reasons=reasons + ["Fallback: Continue current step"],
            confidence=0.3,
            metadata={"fallback_reason": "continue_current"}
        )
    
    def _create_default_decision(self, current_state: WorkflowState, reasons: List[str]) -> FlowControlDecision:
        """创建默认决策"""
        return FlowControlDecision(
            decision=FlowDecision.CONTINUE_CURRENT_STEP,
            next_step_id=current_state.current_step_id,
            next_stage_id=current_state.current_stage_id,
            required_inputs=[],
            reasons=reasons,
            confidence=0.1,
            metadata={"default_decision": True}
        )
    
    def get_workflow_progress(self, state: WorkflowState) -> Dict[str, Any]:
        """获取工作流进度信息（为前端提供状态信息）"""
        progress = {
            "current_stage": state.current_stage_id,
            "current_step": state.current_step_id,
            "overall_progress": 0.0,
            "stage_progress": {},
            "completed_stages": state.completed_stages,
            "completed_steps": state.completed_steps,
            "next_actions": [],
            "required_inputs": []
        }
        
        total_steps = sum(len(stage.steps) for stage in self.workflow_definition)
        completed_steps_count = len(state.completed_steps)
        progress["overall_progress"] = completed_steps_count / total_steps if total_steps > 0 else 0.0
        
        # 计算每个stage的进度
        for stage in self.workflow_definition:
            stage_steps = [step.step_id for step in stage.steps]
            stage_completed = [step_id for step_id in stage_steps if step_id in state.completed_steps]
            progress["stage_progress"][stage.stage_id] = {
                "completion_percentage": len(stage_completed) / len(stage_steps) if stage_steps else 0.0,
                "completed_steps": stage_completed,
                "total_steps": len(stage_steps),
                "status": "completed" if len(stage_completed) == len(stage_steps) else 
                         "in_progress" if stage.stage_id == state.current_stage_id else "not_started"
            }
        
        # 获取下一个可能的操作
        current_step = self._get_step_info(state.current_stage_id, state.current_step_id)
        if current_step:
            progress["required_inputs"] = current_step.required_inputs
        
        return progress
    
    # Helper methods
    
    def _get_stage_info(self, stage_id: str) -> Optional[StageInfo]:
        """获取stage信息"""
        return next((stage for stage in self.workflow_definition if stage.stage_id == stage_id), None)
    
    def _get_step_info(self, stage_id: str, step_id: str) -> Optional[StepInfo]:
        """获取step信息"""
        stage = self._get_stage_info(stage_id)
        if stage:
            return next((step for step in stage.steps if step.step_id == step_id), None)
        return None
    
    def _get_next_stage(self, current_stage_id: str) -> Optional[StageInfo]:
        """获取下一个stage"""
        current_index = next((i for i, stage in enumerate(self.workflow_definition) if stage.stage_id == current_stage_id), -1)
        if current_index >= 0 and current_index + 1 < len(self.workflow_definition):
            return self.workflow_definition[current_index + 1]
        return None
    
    def _get_next_step_in_stage(self, stage_id: str, current_step_id: str) -> Optional[StepInfo]:
        """获取同一stage中的下一个step"""
        stage = self._get_stage_info(stage_id)
        if stage:
            current_index = next((i for i, step in enumerate(stage.steps) if step.step_id == current_step_id), -1)
            if current_index >= 0 and current_index + 1 < len(stage.steps):
                return stage.steps[current_index + 1]
        return None
    
    def _create_error_decision(self, error_message: str) -> FlowControlDecision:
        """创建错误决策"""
        return FlowControlDecision(
            decision=FlowDecision.HANDLE_ERROR,
            next_step_id=None,
            next_stage_id=None,
            required_inputs=["error_resolution"],
            reasons=[error_message],
            confidence=0.0,
            metadata={"error": True, "error_message": error_message}
        )
    
    def create_initial_workflow_state(self) -> WorkflowState:
        """创建初始工作流状态"""
        return WorkflowState(
            current_stage_id="stage_0",
            current_step_id="step_1",
            completed_steps=[],
            completed_stages=[],
            step_results={},
            stage_results={},
            workflow_metadata={
                "workflow_start_time": None,
                "workflow_id": None,
                "user_context": {}
            },
            errors=[]
        )
    
    def validate_workflow_state(self, state: WorkflowState) -> Tuple[bool, List[str]]:
        """验证工作流状态的有效性"""
        errors = []
        
        # 检查当前stage和step是否存在
        if not self._get_stage_info(state.current_stage_id):
            errors.append(f"Invalid current stage: {state.current_stage_id}")
        
        if not self._get_step_info(state.current_stage_id, state.current_step_id):
            errors.append(f"Invalid current step: {state.current_step_id} in stage {state.current_stage_id}")
        
        # 检查依赖关系
        current_step = self._get_step_info(state.current_stage_id, state.current_step_id)
        if current_step:
            missing_dependencies = [dep for dep in current_step.dependencies if dep not in state.completed_steps]
            if missing_dependencies:
                errors.append(f"Missing step dependencies: {missing_dependencies}")
        
        return len(errors) == 0, errors