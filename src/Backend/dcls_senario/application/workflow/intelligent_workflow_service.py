"""
智能工作流服务
Intelligent Workflow Service

统一的工作流管理服务，集成：
- 目标驱动的路径规划
- 智能动作执行
- 动态步骤调整
- 质量监控和优化
"""

from typing import Dict, Any, List, Optional, Tuple
import asyncio
from dataclasses import dataclass
from enum import Enum

from application.workflow.goal_driven_planner import GoalDrivenPlanner, ExecutionPlan, StageGoal, GoalStatus
from application.workflow.action_executor import ActionExecutor, ActionResult, ExecutionResult

class WorkflowDecision(Enum):
    CONTINUE_NEXT_STEP = "continue_next_step"
    REPEAT_CURRENT_STEP = "repeat_current_step"
    SKIP_TO_STEP = "skip_to_step"
    JUMP_TO_STAGE = "jump_to_stage"
    CUSTOMIZE_STEP = "customize_step"
    COMPLETE_STAGE = "complete_stage"
    PAUSE_WORKFLOW = "pause_workflow"

@dataclass
class WorkflowState:
    """工作流状态"""
    current_stage_id: str
    current_step_index: int
    execution_plan: Optional[ExecutionPlan]
    goal_evaluation: Dict[str, Any]
    completed_steps: List[str]
    step_results: Dict[str, Any]
    quality_scores: Dict[str, float]
    total_execution_time: float
    last_decision: Optional[WorkflowDecision] = None
    decision_reasoning: str = ""

@dataclass
class WorkflowResponse:
    """工作流响应"""
    step_result: ActionResult
    next_decision: WorkflowDecision
    reasoning: str
    updated_state: WorkflowState
    recommendations: List[str]
    agent_thinking: Optional[Dict[str, Any]] = None

class IntelligentWorkflowService:
    """智能工作流服务"""
    
    def __init__(self):
        self.goal_planner = GoalDrivenPlanner()
        self.action_executor = ActionExecutor()
        self.workflow_templates = self._load_workflow_templates()
        
    def _load_workflow_templates(self) -> Dict[str, Dict[str, Any]]:
        """加载工作流模板"""
        return {
            "data_analysis": {
                "name": "数据分析工作流",
                "description": "完整的数据科学分析流程",
                "stages": [
                    {
                        "id": "data_loading_and_hypothesis_proposal",
                        "name": "数据加载和假设提出",
                        "description": "加载数据并提出分析假设",
                        "is_mandatory": True
                    },
                    {
                        "id": "data_cleaning", 
                        "name": "数据清洗",
                        "description": "清洗和预处理数据",
                        "is_mandatory": True
                    },
                    {
                        "id": "exploratory_data_analysis",
                        "name": "探索性数据分析", 
                        "description": "深入分析数据特征和模式",
                        "is_mandatory": True
                    },
                    {
                        "id": "method_proposal",
                        "name": "方法提出",
                        "description": "提出并验证分析方法",
                        "is_mandatory": True
                    }
                ],
                "estimated_duration": 1800,  # 30分钟
                "quality_threshold": 0.75
            }
        }
    
    async def get_workflow_template(self, template_type: str = "data_analysis") -> Dict[str, Any]:
        """获取工作流模板"""
        template = self.workflow_templates.get(template_type)
        if not template:
            raise ValueError(f"Unknown workflow template: {template_type}")
        
        # 为每个阶段加载详细的步骤信息
        for stage in template["stages"]:
            stage_steps = self.goal_planner.available_steps.get(stage["id"], [])
            stage["steps"] = [
                {
                    "id": step.step_id,
                    "index": step.step_index,
                    "name": step.name,
                    "description": step.description,
                    "is_mandatory": step.is_mandatory,
                    "estimated_duration": step.estimated_duration
                }
                for step in stage_steps
            ]
        
        return template
    
    async def execute_step(self, step_request: Dict[str, Any]) -> WorkflowResponse:
        """执行工作流步骤的核心方法"""
        # 提取请求参数
        stage_id = step_request["stage_id"]
        step_id = step_request["step_id"]
        step_index = step_request["step_index"]
        context = step_request.get("context", {})
        variables = step_request.get("variables", {})
        frontend_state = step_request.get("frontend_state", {})
        
        # 构建当前状态
        current_state = self._build_current_state(step_request, frontend_state)
        
        # 评估当前目标状态
        goal_evaluation = await self.goal_planner.evaluate_current_state(stage_id, frontend_state)
        
        # 获取或更新执行计划
        execution_plan = await self.goal_planner.plan_optimal_route(stage_id, frontend_state)
        
        # 找到要执行的步骤
        target_step = self._find_step_in_plan(step_id, step_index, execution_plan)
        if not target_step:
            raise ValueError(f"Step {step_id} not found in execution plan")
        
        # 执行步骤
        action_result = await self.action_executor.execute_step(
            target_step, frontend_state, context
        )
        
        # 处理执行结果和agent thinking
        agent_thinking = self._extract_agent_thinking(action_result)
        
        # 智能决策下一步
        next_decision, reasoning = await self._make_intelligent_decision(
            action_result, execution_plan, goal_evaluation, current_state
        )
        
        # 更新工作流状态
        updated_state = self._update_workflow_state(
            current_state, action_result, goal_evaluation, execution_plan, 
            next_decision, reasoning
        )
        
        # 生成建议
        recommendations = await self._generate_recommendations(
            action_result, goal_evaluation, execution_plan
        )
        
        return WorkflowResponse(
            step_result=action_result,
            next_decision=next_decision,
            reasoning=reasoning,
            updated_state=updated_state,
            recommendations=recommendations,
            agent_thinking=agent_thinking
        )
    
    async def get_next_step_suggestion(self, current_context: Dict[str, Any]) -> Dict[str, Any]:
        """获取下一步建议"""
        stage_id = current_context["current_stage"]
        frontend_state = {
            "completed_steps": current_context.get("completed_steps", []),
            "step_results": current_context.get("step_results", {}),
            "stage_results": current_context.get("stage_results", {})
        }
        
        # 评估当前目标状态
        goal_evaluation = await self.goal_planner.evaluate_current_state(stage_id, frontend_state)
        
        # 获取执行计划
        execution_plan = await self.goal_planner.plan_optimal_route(stage_id, frontend_state)
        
        # 确定下一步
        next_step = self._determine_next_step(execution_plan, frontend_state)
        
        return {
            "should_proceed": next_step is not None,
            "next_step": {
                "step_id": next_step.step_id,
                "step_index": next_step.step_index,
                "name": next_step.name,
                "description": next_step.description
            } if next_step else None,
            "goal_status": goal_evaluation["goal_status"].value,
            "completion_rate": len(goal_evaluation["completed_criteria"]) / len(goal_evaluation["missing_criteria"]) if goal_evaluation["missing_criteria"] else 1.0,
            "recommendations": goal_evaluation["recommendations"]
        }
    
    async def get_stage_transition_suggestion(self, current_context: Dict[str, Any]) -> Dict[str, Any]:
        """获取阶段转换建议"""
        stage_id = current_context["current_stage"]
        frontend_state = {
            "completed_steps": current_context.get("completed_steps", []),
            "step_results": current_context.get("step_results", {}),
            "stage_results": current_context.get("stage_results", {})
        }
        
        # 评估当前阶段目标
        goal_evaluation = await self.goal_planner.evaluate_current_state(stage_id, frontend_state)
        
        # 判断是否可以转换阶段
        can_transition = goal_evaluation["goal_status"] in [GoalStatus.FULLY_ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED]
        
        # 获取下一个阶段
        next_stage = self._get_next_stage(stage_id)
        
        return {
            "should_transition": can_transition and next_stage is not None,
            "current_stage_status": goal_evaluation["goal_status"].value,
            "next_stage": next_stage,
            "completion_rate": len(goal_evaluation["completed_criteria"]) / max(1, len(goal_evaluation["completed_criteria"]) + len(goal_evaluation["missing_criteria"])),
            "missing_criteria": goal_evaluation["missing_criteria"],
            "quality_scores": goal_evaluation["quality_scores"],
            "recommendations": goal_evaluation["recommendations"]
        }
    
    async def validate_step_completion(self, validation_request: Dict[str, Any]) -> Dict[str, Any]:
        """验证步骤完成情况"""
        stage_id = validation_request["stage_id"]
        step_id = validation_request["step_id"]
        step_results = validation_request.get("step_results", {})
        
        # 使用action executor的质量评估
        quality_score = 0.0
        if step_results:
            # 创建一个临时的step definition用于质量评估
            temp_step = type('TempStep', (), {"step_id": step_id})()
            quality_score = await self.action_executor._evaluate_quality(temp_step, step_results)
        
        # 评估整体阶段状态
        frontend_state = {
            "completed_steps": validation_request.get("context", {}).get("completed_steps", []),
            "step_results": {step_id: step_results}
        }
        goal_evaluation = await self.goal_planner.evaluate_current_state(stage_id, frontend_state)
        
        return {
            "step_completed": quality_score >= 0.7,
            "quality_score": quality_score,
            "stage_completed": goal_evaluation["goal_status"] == GoalStatus.FULLY_ACHIEVED,
            "overall_progress": len(goal_evaluation["completed_criteria"]) / max(1, len(goal_evaluation["completed_criteria"]) + len(goal_evaluation["missing_criteria"])),
            "recommendations": goal_evaluation["recommendations"]
        }
    
    def _build_current_state(self, step_request: Dict[str, Any], 
                           frontend_state: Dict[str, Any]) -> WorkflowState:
        """构建当前工作流状态"""
        return WorkflowState(
            current_stage_id=step_request["stage_id"],
            current_step_index=step_request["step_index"],
            execution_plan=None,  # Will be set later
            goal_evaluation={},   # Will be set later
            completed_steps=frontend_state.get("completed_steps", []),
            step_results=frontend_state.get("step_results", {}),
            quality_scores={},
            total_execution_time=0.0
        )
    
    def _find_step_in_plan(self, step_id: str, step_index: int, 
                          execution_plan: ExecutionPlan):
        """在执行计划中找到指定步骤"""
        for step in execution_plan.planned_steps:
            if step.step_id == step_id or step.step_index == step_index:
                return step
        return None
    
    def _extract_agent_thinking(self, action_result: ActionResult) -> Optional[Dict[str, Any]]:
        """提取agent思考过程"""
        if action_result.thinking_logs:
            return {
                "agent_name": "WorkflowAgent",
                "current_step": f"Executing {action_result.step_id}",
                "thinking_process": action_result.thinking_logs,
                "execution_time": action_result.execution_time,
                "quality_score": action_result.quality_score
            }
        return None
    
    async def _make_intelligent_decision(self, action_result: ActionResult,
                                       execution_plan: ExecutionPlan,
                                       goal_evaluation: Dict[str, Any],
                                       current_state: WorkflowState) -> Tuple[WorkflowDecision, str]:
        """智能决策下一步行动"""
        
        # 如果执行失败，决定重试或跳过
        if action_result.execution_result == ExecutionResult.FAILURE:
            if action_result.retry_count < 2:
                return WorkflowDecision.REPEAT_CURRENT_STEP, "执行失败，尝试重新执行"
            else:
                return WorkflowDecision.SKIP_TO_STEP, "多次执行失败，跳过当前步骤"
        
        # 如果质量不达标，考虑重新执行或自定义
        if action_result.quality_score < 0.6:
            return WorkflowDecision.CUSTOMIZE_STEP, f"执行质量不达标 ({action_result.quality_score:.2f})，需要自定义优化"
        
        # 检查是否还有更多步骤
        current_step_index = current_state.current_step_index
        if current_step_index < len(execution_plan.planned_steps) - 1:
            return WorkflowDecision.CONTINUE_NEXT_STEP, "继续执行下一步"
        
        # 检查阶段是否完成
        if goal_evaluation["goal_status"] == GoalStatus.FULLY_ACHIEVED:
            return WorkflowDecision.COMPLETE_STAGE, "阶段目标已完全达成"
        elif goal_evaluation["goal_status"] == GoalStatus.PARTIALLY_ACHIEVED:
            missing_criteria = goal_evaluation["missing_criteria"]
            if len(missing_criteria) <= 2:  # 只有少量未完成标准
                return WorkflowDecision.COMPLETE_STAGE, f"阶段基本完成，仅剩少量标准: {missing_criteria}"
            else:
                return WorkflowDecision.CUSTOMIZE_STEP, f"需要额外步骤完成目标: {missing_criteria}"
        
        return WorkflowDecision.CONTINUE_NEXT_STEP, "继续工作流程"
    
    def _update_workflow_state(self, current_state: WorkflowState,
                             action_result: ActionResult,
                             goal_evaluation: Dict[str, Any],
                             execution_plan: ExecutionPlan,
                             next_decision: WorkflowDecision,
                             reasoning: str) -> WorkflowState:
        """更新工作流状态"""
        # 更新完成步骤
        if action_result.execution_result == ExecutionResult.SUCCESS:
            if action_result.step_id not in current_state.completed_steps:
                current_state.completed_steps.append(action_result.step_id)
        
        # 更新步骤结果
        current_state.step_results[action_result.step_id] = action_result.outputs
        
        # 更新质量分数
        current_state.quality_scores[action_result.step_id] = action_result.quality_score
        
        # 更新执行计划和目标评估
        current_state.execution_plan = execution_plan
        current_state.goal_evaluation = goal_evaluation
        
        # 更新决策信息
        current_state.last_decision = next_decision
        current_state.decision_reasoning = reasoning
        
        # 更新总执行时间
        current_state.total_execution_time += action_result.execution_time
        
        return current_state
    
    async def _generate_recommendations(self, action_result: ActionResult,
                                      goal_evaluation: Dict[str, Any],
                                      execution_plan: ExecutionPlan) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        # 基于执行结果的建议
        if action_result.quality_score < 0.7:
            recommendations.append(f"步骤 {action_result.step_id} 质量较低，建议优化执行参数")
        
        if action_result.execution_time > 60:  # 超过1分钟
            recommendations.append(f"步骤 {action_result.step_id} 执行时间较长，考虑优化性能")
        
        # 基于目标评估的建议
        recommendations.extend(goal_evaluation.get("recommendations", []))
        
        # 基于执行计划的建议
        if execution_plan.confidence_score < 0.7:
            recommendations.append("当前执行计划信心度较低，建议重新评估步骤安排")
        
        if len(execution_plan.skipped_steps) > 2:
            recommendations.append("跳过的步骤较多，可能影响最终结果质量")
        
        return recommendations
    
    def _determine_next_step(self, execution_plan: ExecutionPlan,
                           frontend_state: Dict[str, Any]):
        """确定下一个要执行的步骤"""
        completed_steps = frontend_state.get("completed_steps", [])
        
        for step in execution_plan.planned_steps:
            if step.step_id not in completed_steps:
                return step
        
        return None
    
    def _get_next_stage(self, current_stage_id: str) -> Optional[str]:
        """获取下一个阶段"""
        stage_order = [
            "data_loading_and_hypothesis_proposal",
            "data_cleaning", 
            "exploratory_data_analysis",
            "method_proposal"
        ]
        
        try:
            current_index = stage_order.index(current_stage_id)
            if current_index < len(stage_order) - 1:
                return stage_order[current_index + 1]
        except ValueError:
            pass
        
        return None
    
    def get_service_stats(self) -> Dict[str, Any]:
        """获取服务统计信息"""
        executor_stats = self.action_executor.get_execution_stats()
        
        return {
            "service_name": "IntelligentWorkflowService",
            "available_templates": list(self.workflow_templates.keys()),
            "supported_stages": list(self.goal_planner.stage_goals.keys()),
            "executor_stats": executor_stats
        }