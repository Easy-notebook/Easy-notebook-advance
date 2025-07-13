"""
目标驱动的智能路线规划器
Goal-Driven Intelligent Route Planner

每个阶段以目标作为驱动，智能选择最优路径：
- 评估当前状态与目标的差距
- 动态规划步骤路径
- 智能跳过不必要的步骤
- 重新执行失败的步骤
- 支持自定义(DIY)步骤
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import importlib
import asyncio

class StepStatus(Enum):
    PENDING = "pending"
    SKIPPED = "skipped" 
    COMPLETED = "completed"
    FAILED = "failed"
    RETRY_NEEDED = "retry_needed"

class GoalStatus(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress" 
    PARTIALLY_ACHIEVED = "partially_achieved"
    FULLY_ACHIEVED = "fully_achieved"
    FAILED = "failed"

@dataclass
class StageGoal:
    """阶段目标定义"""
    stage_id: str
    primary_objective: str  # 主要目标
    success_criteria: List[str]  # 成功标准
    required_outputs: List[str]  # 必须产出
    optional_outputs: List[str]  # 可选产出
    dependencies: List[str]  # 依赖的前置条件
    quality_thresholds: Dict[str, float]  # 质量阈值

@dataclass
class StepDefinition:
    """步骤定义"""
    step_id: str
    step_index: int
    name: str
    description: str
    action_module: str  # actions模块路径
    action_function: str  # action函数名
    is_mandatory: bool  # 是否必须执行
    contributes_to_goals: List[str]  # 贡献的目标
    prerequisites: List[str]  # 前置条件
    estimated_duration: int  # 预估耗时(秒)
    
@dataclass
class ExecutionPlan:
    """执行计划"""
    stage_id: str
    goal: StageGoal
    planned_steps: List[StepDefinition]
    skipped_steps: List[StepDefinition]
    custom_steps: List[StepDefinition]
    estimated_total_time: int
    confidence_score: float

class GoalDrivenPlanner:
    """目标驱动的路线规划器"""
    
    def __init__(self):
        self.stage_goals = self._load_stage_goals()
        self.available_steps = self._load_available_steps()
        self.execution_history = {}
        
    def _load_stage_goals(self) -> Dict[str, StageGoal]:
        """加载阶段目标定义"""
        return {
            "data_loading_and_hypothesis_proposal": StageGoal(
                stage_id="data_loading_and_hypothesis_proposal",
                primary_objective="完成数据加载和假设提出，为后续分析奠定基础",
                success_criteria=[
                    "数据成功加载且格式正确",
                    "数据预览和基本统计信息可用",
                    "变量描述和数据字典完整",
                    "观察单元分析完成",
                    "变量相关性分析完成", 
                    "至少提出1个可验证的假设"
                ],
                required_outputs=[
                    "loaded_data", "data_preview", "variable_description", 
                    "observation_analysis", "relevance_analysis", "hypothesis"
                ],
                optional_outputs=[
                    "data_quality_report", "initial_insights"
                ],
                dependencies=[],
                quality_thresholds={
                    "data_completeness": 0.8,
                    "hypothesis_clarity": 0.7
                }
            ),
            "data_cleaning": StageGoal(
                stage_id="data_cleaning",
                primary_objective="清洗和预处理数据，确保数据质量满足分析要求",
                success_criteria=[
                    "缺失值处理完成",
                    "异常值检测和处理完成",
                    "数据类型转换正确",
                    "数据格式统一",
                    "数据质量报告生成"
                ],
                required_outputs=[
                    "cleaned_data", "cleaning_report", "data_quality_metrics"
                ],
                optional_outputs=[
                    "outlier_analysis", "transformation_log"
                ],
                dependencies=["loaded_data"],
                quality_thresholds={
                    "data_quality_score": 0.85,
                    "missing_rate": 0.1
                }
            ),
            "exploratory_data_analysis": StageGoal(
                stage_id="exploratory_data_analysis", 
                primary_objective="深入理解数据特征和模式，为建模提供洞察",
                success_criteria=[
                    "数据分布分析完成",
                    "特征间关系分析完成", 
                    "目标变量分析完成",
                    "至少生成5个有意义的可视化",
                    "EDA报告生成"
                ],
                required_outputs=[
                    "distribution_analysis", "correlation_analysis", "target_analysis", "visualizations"
                ],
                optional_outputs=[
                    "feature_importance", "interaction_analysis"
                ],
                dependencies=["cleaned_data"],
                quality_thresholds={
                    "insight_quality": 0.75,
                    "visualization_count": 5
                }
            ),
            "method_proposal": StageGoal(
                stage_id="method_proposal",
                primary_objective="提出并验证合适的分析方法和模型",
                success_criteria=[
                    "至少提出3种可行方法",
                    "方法选择有充分理由",
                    "初步验证结果可用",
                    "方法比较分析完成"
                ],
                required_outputs=[
                    "proposed_methods", "method_justification", "preliminary_results"
                ],
                optional_outputs=[
                    "method_comparison", "hyperparameter_suggestions"
                ],
                dependencies=["distribution_analysis", "correlation_analysis"],
                quality_thresholds={
                    "method_diversity": 3,
                    "justification_quality": 0.8
                }
            )
        }
    
    def _load_available_steps(self) -> Dict[str, List[StepDefinition]]:
        """加载可用步骤定义"""
        return {
            "data_loading_and_hypothesis_proposal": [
                StepDefinition(
                    step_id="stage_introduction",
                    step_index=0,
                    name="Stage Introduction",
                    description="介绍当前阶段目标和计划",
                    action_module="app.actions.stage_0_Data_loading_and_hypothesis_proposal.step_0",
                    action_function="generate_data_loading_and_hypothesis_proposal_step_0",
                    is_mandatory=True,
                    contributes_to_goals=["stage_setup"],
                    prerequisites=[],
                    estimated_duration=30
                ),
                StepDefinition(
                    step_id="data_preview",
                    step_index=1,
                    name="Data Preview",
                    description="预览数据结构和基本信息",
                    action_module="app.actions.stage_0_Data_loading_and_hypothesis_proposal.step_1",
                    action_function="generate_data_loading_and_hypothesis_proposal_step_1",
                    is_mandatory=True,
                    contributes_to_goals=["data_preview", "basic_understanding"],
                    prerequisites=["loaded_data"],
                    estimated_duration=60
                ),
                StepDefinition(
                    step_id="variable_description",
                    step_index=2,
                    name="Variable Description",
                    description="描述数据变量和创建数据字典",
                    action_module="app.actions.stage_0_Data_loading_and_hypothesis_proposal.step_2",
                    action_function="generate_data_loading_and_hypothesis_proposal_step_2",
                    is_mandatory=True,
                    contributes_to_goals=["variable_description", "data_understanding"],
                    prerequisites=["data_preview"],
                    estimated_duration=90
                ),
                StepDefinition(
                    step_id="observation_analysis",
                    step_index=3,
                    name="Observation Unit Analysis",
                    description="分析观察单元和数据结构",
                    action_module="app.actions.stage_0_Data_loading_and_hypothesis_proposal.step_3",
                    action_function="generate_data_loading_and_hypothesis_proposal_step_3",
                    is_mandatory=True,
                    contributes_to_goals=["observation_analysis", "structural_understanding"],
                    prerequisites=["variable_description"],
                    estimated_duration=60
                ),
                StepDefinition(
                    step_id="relevance_analysis",
                    step_index=4,
                    name="Variable Relevance Analysis",
                    description="分析变量相关性和重要性",
                    action_module="app.actions.stage_0_Data_loading_and_hypothesis_proposal.step_4",
                    action_function="generate_data_loading_and_hypothesis_proposal_step_4",
                    is_mandatory=True,
                    contributes_to_goals=["relevance_analysis", "feature_understanding"],
                    prerequisites=["observation_analysis"],
                    estimated_duration=120
                ),
                StepDefinition(
                    step_id="hypothesis_proposal",
                    step_index=5,
                    name="Hypothesis Proposal",
                    description="基于数据分析提出假设",
                    action_module="app.actions.stage_0_Data_loading_and_hypothesis_proposal.step_5",
                    action_function="generate_data_loading_and_hypothesis_proposal_step_5",
                    is_mandatory=True,
                    contributes_to_goals=["hypothesis", "analysis_direction"],
                    prerequisites=["relevance_analysis"],
                    estimated_duration=90
                )
            ]
        }
    
    async def evaluate_current_state(self, stage_id: str, frontend_state: Dict[str, Any]) -> Dict[str, Any]:
        """评估当前状态与目标的差距"""
        goal = self.stage_goals.get(stage_id)
        if not goal:
            raise ValueError(f"Unknown stage: {stage_id}")
        
        evaluation = {
            "stage_id": stage_id,
            "goal_status": GoalStatus.NOT_STARTED,
            "completed_criteria": [],
            "missing_criteria": goal.success_criteria.copy(),
            "available_outputs": [],
            "missing_outputs": goal.required_outputs.copy(),
            "quality_scores": {},
            "recommendations": []
        }
        
        # 检查已完成的步骤结果
        step_results = frontend_state.get("step_results", {})
        completed_steps = frontend_state.get("completed_steps", [])
        
        # 评估成功标准完成情况
        for criteria in goal.success_criteria:
            if self._is_criteria_met(criteria, step_results, completed_steps):
                evaluation["completed_criteria"].append(criteria)
                evaluation["missing_criteria"].remove(criteria)
        
        # 评估输出完成情况
        for output in goal.required_outputs:
            if self._is_output_available(output, step_results):
                evaluation["available_outputs"].append(output)
                evaluation["missing_outputs"].remove(output)
        
        # 计算质量分数
        for metric, threshold in goal.quality_thresholds.items():
            score = self._calculate_quality_score(metric, step_results)
            evaluation["quality_scores"][metric] = score
        
        # 确定目标状态
        completion_rate = len(evaluation["completed_criteria"]) / len(goal.success_criteria)
        if completion_rate == 0:
            evaluation["goal_status"] = GoalStatus.NOT_STARTED
        elif completion_rate < 0.5:
            evaluation["goal_status"] = GoalStatus.IN_PROGRESS
        elif completion_rate < 1.0:
            evaluation["goal_status"] = GoalStatus.PARTIALLY_ACHIEVED
        else:
            evaluation["goal_status"] = GoalStatus.FULLY_ACHIEVED
        
        # 生成建议
        evaluation["recommendations"] = self._generate_recommendations(evaluation, goal)
        
        return evaluation
    
    async def plan_optimal_route(self, stage_id: str, frontend_state: Dict[str, Any]) -> ExecutionPlan:
        """规划最优执行路径"""
        goal = self.stage_goals.get(stage_id)
        available_steps = self.available_steps.get(stage_id, [])
        
        if not goal or not available_steps:
            raise ValueError(f"No goal or steps defined for stage: {stage_id}")
        
        # 评估当前状态
        current_evaluation = await self.evaluate_current_state(stage_id, frontend_state)
        
        # 智能路径规划
        planned_steps = []
        skipped_steps = []
        custom_steps = []
        
        for step in available_steps:
            decision = await self._make_step_decision(step, current_evaluation, frontend_state)
            
            if decision == "execute":
                planned_steps.append(step)
            elif decision == "skip":
                skipped_steps.append(step)
            elif decision == "customize":
                custom_step = await self._create_custom_step(step, current_evaluation)
                custom_steps.append(custom_step)
                planned_steps.append(custom_step)
        
        # 计算预估时间和信心分数
        estimated_time = sum(step.estimated_duration for step in planned_steps)
        confidence_score = self._calculate_confidence_score(planned_steps, current_evaluation)
        
        return ExecutionPlan(
            stage_id=stage_id,
            goal=goal,
            planned_steps=planned_steps,
            skipped_steps=skipped_steps,
            custom_steps=custom_steps,
            estimated_total_time=estimated_time,
            confidence_score=confidence_score
        )
    
    async def _make_step_decision(self, step: StepDefinition, evaluation: Dict[str, Any], 
                                frontend_state: Dict[str, Any]) -> str:
        """决定步骤执行策略"""
        completed_steps = frontend_state.get("completed_steps", [])
        step_results = frontend_state.get("step_results", {})
        
        # 检查步骤是否已完成
        if step.step_id in completed_steps:
            # 检查结果质量
            result_quality = self._assess_step_quality(step.step_id, step_results)
            if result_quality < 0.7:  # 质量不达标
                return "customize"  # 重新执行或自定义
            else:
                return "skip"  # 跳过
        
        # 检查前置条件
        missing_prerequisites = [
            prereq for prereq in step.prerequisites 
            if not self._is_prerequisite_met(prereq, frontend_state)
        ]
        
        if missing_prerequisites:
            return "skip"  # 前置条件不满足，跳过
        
        # 检查是否对当前目标有贡献
        contributes_to_missing_goals = any(
            goal in evaluation["missing_criteria"] 
            for goal in step.contributes_to_goals
        )
        
        if not contributes_to_missing_goals and not step.is_mandatory:
            return "skip"  # 不对缺失目标有贡献且非必须，跳过
        
        # 检查是否需要自定义
        if self._needs_customization(step, evaluation, frontend_state):
            return "customize"
        
        return "execute"
    
    async def _create_custom_step(self, base_step: StepDefinition, 
                                evaluation: Dict[str, Any]) -> StepDefinition:
        """创建自定义步骤"""
        custom_description = f"Custom: {base_step.description} (优化版本基于当前状态)"
        
        return StepDefinition(
            step_id=f"{base_step.step_id}_custom",
            step_index=base_step.step_index,
            name=f"Custom {base_step.name}",
            description=custom_description,
            action_module=base_step.action_module,
            action_function=f"{base_step.action_function}_custom",
            is_mandatory=base_step.is_mandatory,
            contributes_to_goals=base_step.contributes_to_goals,
            prerequisites=base_step.prerequisites,
            estimated_duration=int(base_step.estimated_duration * 1.2)  # 自定义步骤可能需要更多时间
        )
    
    def _is_criteria_met(self, criteria: str, step_results: Dict[str, Any], 
                        completed_steps: List[str]) -> bool:
        """检查成功标准是否满足"""
        # 这里实现具体的标准检查逻辑
        criteria_mapping = {
            "数据成功加载且格式正确": lambda: "data_preview" in completed_steps,
            "数据预览和基本统计信息可用": lambda: "data_preview" in step_results,
            "变量描述和数据字典完整": lambda: "variable_description" in completed_steps,
            "观察单元分析完成": lambda: "observation_analysis" in completed_steps,
            "变量相关性分析完成": lambda: "relevance_analysis" in completed_steps,
            "至少提出1个可验证的假设": lambda: "hypothesis_proposal" in completed_steps
        }
        
        check_func = criteria_mapping.get(criteria)
        return check_func() if check_func else False
    
    def _is_output_available(self, output: str, step_results: Dict[str, Any]) -> bool:
        """检查输出是否可用"""
        return output in step_results and step_results[output] is not None
    
    def _calculate_quality_score(self, metric: str, step_results: Dict[str, Any]) -> float:
        """计算质量分数"""
        # 实现具体的质量评估逻辑
        quality_calculators = {
            "data_completeness": lambda: self._assess_data_completeness(step_results),
            "hypothesis_clarity": lambda: self._assess_hypothesis_clarity(step_results),
            "insight_quality": lambda: self._assess_insight_quality(step_results)
        }
        
        calculator = quality_calculators.get(metric)
        return calculator() if calculator else 0.5
    
    def _assess_data_completeness(self, step_results: Dict[str, Any]) -> float:
        """评估数据完整性"""
        if "data_preview" not in step_results:
            return 0.0
        # 实现具体的数据完整性评估逻辑
        return 0.8  # 示例值
    
    def _assess_hypothesis_clarity(self, step_results: Dict[str, Any]) -> float:
        """评估假设清晰度"""
        if "hypothesis_proposal" not in step_results:
            return 0.0
        # 实现具体的假设清晰度评估逻辑
        return 0.75  # 示例值
    
    def _assess_insight_quality(self, step_results: Dict[str, Any]) -> float:
        """评估洞察质量"""
        # 实现具体的洞察质量评估逻辑
        return 0.7  # 示例值
    
    def _generate_recommendations(self, evaluation: Dict[str, Any], goal: StageGoal) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        if evaluation["goal_status"] == GoalStatus.NOT_STARTED:
            recommendations.append("建议从基础步骤开始，确保数据加载和预览正常")
        
        for missing_criteria in evaluation["missing_criteria"]:
            recommendations.append(f"需要完成: {missing_criteria}")
        
        for metric, score in evaluation["quality_scores"].items():
            threshold = goal.quality_thresholds.get(metric, 0.7)
            if score < threshold:
                recommendations.append(f"需要提升{metric}质量 (当前: {score:.2f}, 目标: {threshold:.2f})")
        
        return recommendations
    
    def _is_prerequisite_met(self, prerequisite: str, frontend_state: Dict[str, Any]) -> bool:
        """检查前置条件是否满足"""
        completed_steps = frontend_state.get("completed_steps", [])
        step_results = frontend_state.get("step_results", {})
        
        return prerequisite in completed_steps or prerequisite in step_results
    
    def _assess_step_quality(self, step_id: str, step_results: Dict[str, Any]) -> float:
        """评估步骤结果质量"""
        if step_id not in step_results:
            return 0.0
        # 实现具体的步骤质量评估逻辑
        return 0.8  # 示例值
    
    def _needs_customization(self, step: StepDefinition, evaluation: Dict[str, Any], 
                           frontend_state: Dict[str, Any]) -> bool:
        """判断是否需要自定义步骤"""
        # 如果目标部分达成但质量不够，可能需要自定义
        if evaluation["goal_status"] == GoalStatus.PARTIALLY_ACHIEVED:
            return True
        
        # 如果有特定的质量要求没有达到
        for score in evaluation["quality_scores"].values():
            if score < 0.7:
                return True
        
        return False
    
    def _calculate_confidence_score(self, planned_steps: List[StepDefinition], 
                                  evaluation: Dict[str, Any]) -> float:
        """计算执行计划的信心分数"""
        base_score = 0.8
        
        # 根据已完成的标准调整
        completion_rate = len(evaluation["completed_criteria"]) / max(1, len(evaluation["missing_criteria"]))
        base_score += completion_rate * 0.1
        
        # 根据步骤数量调整
        if len(planned_steps) > 6:
            base_score -= 0.1  # 步骤太多可能增加风险
        
        return min(1.0, max(0.0, base_score))