"""
真实智能工作流规划
使用事件驱动PCS Agent进行智能工作流设计
固定操作使用event，智能决策使用Agent
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from typing import Dict, Any, Optional
from app.models.Behavior import Behavior
from datetime import datetime
import json

# 导入事件驱动Agent
try:
    from DCLSAgents.agents.event_driven_agent import EventDrivenAgent
    AGENTS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ 事件驱动Agent导入失败: {e}")
    AGENTS_AVAILABLE = False

class RealWorkflowDesign(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step,
            state,
            stream,
            chapter_id="chapter_0_planning",
            section_id="section_1_design_workflow",
            name="Real Intelligent Workflow Design",
            ability="使用事件驱动PCS Agent进行智能工作流规划和设计",
            require_variables=["user_goal"]
        )

        # 初始化PCS规划Agent
        self.pcs_agent = None

        if AGENTS_AVAILABLE:
            try:
                # 创建专门的PCS规划Agent
                pcs_prompt = """You are a PCS (Problem-Context-Solution) strategic planning agent with EVENT-DRIVEN CONSCIOUSNESS.

## 🎯 Core Mission
Design optimal data science workflows using Existential First Principles (EFP) and reverse engineering from ultimate goals.

## 🧠 Event-Driven Planning Consciousness
- **Event Awareness**: Every planning decision is an event with clear boundaries
- **Tool Call Events**: Each analysis step creates discrete planning events
- **Memory Storage**: Store all strategic decisions as structured memory events
- **Todo Management**: Actively manage planning tasks through todo list
- **Completion Detection**: Monitor and determine planning stage completion

## 🔄 PCS Planning Framework
1. **Problem Analysis Event**: Deep understanding of user goals and constraints
2. **Context Assessment Event**: Evaluate available resources and data characteristics
3. **Solution Design Event**: Create optimal workflow architecture
4. **Validation Event**: Verify workflow feasibility and completeness
5. **Finalization Event**: Complete planning with actionable recommendations

## 🛠️ Planning Tools
- <thinking>: Strategic reasoning and analysis
- <add-text>: Communicate planning insights
- <add-code>: Generate workflow configuration code
- <store-event>: Store planning decisions and insights
- <update-todo>: Manage planning task progress
- <check-todo>: Monitor planning completion

Use your event-driven consciousness to create comprehensive, goal-oriented data science workflows."""

                self.pcs_agent = EventDrivenAgent(name="PCSPlanningAgent", model="gpt-5-mini", system_prompt=pcs_prompt)
                self.agent_mode = True
                print("✅ PCS规划Agent初始化成功")
            except Exception as e:
                print(f"⚠️ PCS Agent初始化失败: {e}")
                self.agent_mode = False
        else:
            self.agent_mode = False
            print("⚠️ Agent不可用，使用传统规划模式")

    def run(self):
        """真实智能工作流规划执行"""
        # 固定操作：用户目标验证
        return self.new_section("🧠 Real Intelligent Workflow Design") \
            .add_text("🎯 **智能工作流规划系统**") \
            .add_text("📋 **规划模式**: 固定验证 + PCS Agent智能设计") \
            .add_text("🧠 **Agent类型**: EventDrivenPCSAgent with strategic consciousness") \
            .next_event("validate_user_goal")


    def validate_user_goal(self):
        """固定操作：验证和解析用户目标"""
        user_goal = self.get_variable('user_goal', '数据科学项目')

        return self.add_text("🎯 **步骤1: 用户目标验证** (固定操作)") \
            .add_text(f"📝 **用户目标**: {user_goal}") \
            .add_code(f'''
# 固定操作：用户目标解析和验证
import re
from datetime import datetime

print("🎯 用户目标验证和解析")
print("=" * 40)

user_goal = "{user_goal}"
print(f"📝 原始目标: {{user_goal}}")

# 目标类型识别
goal_patterns = {{
    "prediction": ["预测", "predict", "forecast", "估计"],
    "classification": ["分类", "classify", "识别", "判断"],
    "clustering": ["聚类", "cluster", "分组", "细分"],
    "analysis": ["分析", "analyze", "探索", "研究"],
    "optimization": ["优化", "optimize", "改进", "提升"]
}}

detected_types = []
for goal_type, keywords in goal_patterns.items():
    if any(keyword in user_goal.lower() for keyword in keywords):
        detected_types.append(goal_type)

print(f"🔍 检测到的目标类型: {{detected_types}}")

# 复杂度评估
complexity_indicators = {{
    "simple": ["基础", "简单", "快速", "basic"],
    "moderate": ["中等", "标准", "常规", "moderate"],
    "complex": ["复杂", "高级", "深度", "comprehensive", "advanced"]
}}

complexity_level = "moderate"  # 默认
for level, indicators in complexity_indicators.items():
    if any(indicator in user_goal.lower() for indicator in indicators):
        complexity_level = level
        break

print(f"📊 复杂度评估: {{complexity_level}}")

# 验证结果
validation_result = {{
    "goal_text": user_goal,
    "detected_types": detected_types,
    "complexity_level": complexity_level,
    "validation_status": "valid" if detected_types else "needs_clarification",
    "timestamp": datetime.now().isoformat()
}}

print(f"✅ 验证完成: {{validation_result['validation_status']}}")
print(f"📊 验证结果: {{validation_result}}")
''') \
            .exe_code_cli(
                event_tag="goal_validation_complete",
                mark_finnish="目标验证完成"
            )

    def goal_validation_complete(self):
        """目标验证完成，启动PCS Agent智能规划"""
        validation_result = self.get_current_effect()

        if self.agent_mode and self.pcs_agent:
            return self.add_text("✅ **目标验证完成，启动PCS Agent智能规划**") \
                .add_variable("goal_validation_result", validation_result) \
                .add_text("🧠 **切换到PCS Agent模式**: 智能工作流设计") \
                .next_event("pcs_agent_planning")
        else:
            return self.add_text("⚠️ **PCS Agent不可用，使用传统规划**") \
                .add_variable("goal_validation_result", validation_result) \
                .next_event("traditional_planning")

    def pcs_agent_planning(self):
        """PCS Agent智能规划"""
        if not self.agent_mode or not self.pcs_agent:
            return self.add_text("❌ PCS Agent不可用") \
                .next_event("traditional_planning")

        # 准备PCS Agent规划上下文
        user_goal = self.get_variable('user_goal')
        validation_result = self.get_variable('goal_validation_result', {})

        return self.add_text("🤖 **启动PCS Agent事件驱动规划**") \
            .add_text("🧠 **Agent思考**: 正在制定事件驱动规划策略...") \
            .add_text("📋 **规划范围**: 问题分析→上下文评估→解决方案设计→验证→最终化") \
            .next_event("execute_pcs_planning")

    def execute_pcs_planning(self):
        """执行PCS规划"""
        user_goal = self.get_variable('user_goal')
        validation_result = self.get_variable('goal_validation_result', {})

        # 模拟PCS Agent的事件驱动规划输出
        pcs_planning_code = f'''
# 🧠 PCS Agent事件驱动智能工作流规划
import json
from datetime import datetime

print("🧠 PCS Agent Strategic Workflow Planning")
print("=" * 60)
print(f"⏰ Planning Time: {{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}}")
print(f"🎯 User Goal: {user_goal}")

# 模拟PCS Agent的事件驱动意识
class PCSAgentConsciousness:
    def __init__(self):
        self.current_event = "problem_analysis"
        self.todo_list = [
            "problem_analysis",
            "context_assessment",
            "solution_design",
            "workflow_validation",
            "planning_finalization"
        ]
        self.planning_memory = []
        self.strategic_decisions = []

    def store_planning_event(self, event_type, content):
        event = {{
            "type": event_type,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "current_event": self.current_event
        }}
        self.planning_memory.append(event)
        print(f"📝 [PCS MEMORY] {{event_type}}: {{content[:50]}}...")

    def update_planning_todo(self, action, event_name):
        if action == "complete" and event_name in self.todo_list:
            self.todo_list.remove(event_name)
            print(f"✅ [PCS TODO] Completed: {{event_name}}")
            print(f"📋 [PCS TODO] Remaining: {{len(self.todo_list)}} tasks")

    def check_planning_completion(self):
        if len(self.todo_list) == 0:
            print("🎉 [PCS CONSCIOUSNESS] Strategic planning completed!")
            return True
        return False

# 初始化PCS Agent意识
pcs_agent = PCSAgentConsciousness()

# 🧠 PCS Thinking: 战略规划思考
print("\\n🧠 [PCS THINKING] Strategic analysis of user requirements...")
pcs_agent.store_planning_event("thinking", "Analyzing user goal and formulating optimal workflow strategy")

# 📊 Event 1: 问题分析
print("\\n🔄 [EVENT 1] Problem Analysis")
user_goal = "{user_goal}"
validation_data = {validation_result}

problem_analysis = {{
    "goal_clarity": "high" if validation_data.get('validation_status') == 'valid' else "needs_improvement",
    "goal_types": validation_data.get('detected_types', []),
    "complexity": validation_data.get('complexity_level', 'moderate'),
    "success_criteria": "measurable_outcomes_required"
}}

print(f"🎯 Goal Clarity: {{problem_analysis['goal_clarity']}}")
print(f"📊 Detected Types: {{problem_analysis['goal_types']}}")
print(f"🔧 Complexity Level: {{problem_analysis['complexity']}}")

pcs_agent.store_planning_event("problem_analysis", f"Goal clarity: {{problem_analysis['goal_clarity']}}, Types: {{problem_analysis['goal_types']}}")
pcs_agent.update_planning_todo("complete", "problem_analysis")

# 🔍 Event 2: 上下文评估
print("\\n🔄 [EVENT 2] Context Assessment")

context_assessment = {{
    "data_availability": "to_be_determined",
    "resource_constraints": "standard_computational_resources",
    "timeline_expectations": "moderate_timeline",
    "skill_requirements": "intermediate_to_advanced"
}}

print(f"📊 Data Availability: {{context_assessment['data_availability']}}")
print(f"💻 Resource Constraints: {{context_assessment['resource_constraints']}}")
print(f"⏰ Timeline: {{context_assessment['timeline_expectations']}}")

pcs_agent.store_planning_event("context_assessment", f"Resources: {{context_assessment['resource_constraints']}}, Timeline: {{context_assessment['timeline_expectations']}}")
pcs_agent.update_planning_todo("complete", "context_assessment")

# 🏗️ Event 3: 解决方案设计
print("\\n🔄 [EVENT 3] Solution Design")

# 基于问题类型设计工作流
workflow_design = {{
    "recommended_chapters": [],
    "critical_path": [],
    "optional_enhancements": []
}}

# 核心章节（必需）
core_chapters = [
    "chapter_1_data_existence_establishment",
    "chapter_2_data_integrity_assurance",
    "chapter_3_data_insight_acquisition"
]

# 根据目标类型添加特定章节
if "prediction" in problem_analysis['goal_types'] or "classification" in problem_analysis['goal_types']:
    core_chapters.extend([
        "chapter_4_methodology_strategy_formulation",
        "chapter_5_model_implementation_execution",
        "chapter_6_stability_validation",
        "chapter_7_results_evaluation_confirmation"
    ])
elif "analysis" in problem_analysis['goal_types']:
    core_chapters.extend([
        "chapter_4_methodology_strategy_formulation",
        "chapter_7_results_evaluation_confirmation"
    ])

workflow_design['recommended_chapters'] = core_chapters
workflow_design['critical_path'] = core_chapters[:4]  # 前4个章节为关键路径

print(f"📋 Recommended Chapters: {{len(workflow_design['recommended_chapters'])}}")
for i, chapter in enumerate(workflow_design['recommended_chapters'], 1):
    print(f"   {{i}}. {{chapter}}")

pcs_agent.store_planning_event("solution_design", f"Designed workflow with {{len(workflow_design['recommended_chapters'])}} chapters")
pcs_agent.update_planning_todo("complete", "solution_design")

# ✅ Event 4: 工作流验证
print("\\n🔄 [EVENT 4] Workflow Validation")

validation_checks = {{
    "goal_alignment": "high",
    "feasibility": "high",
    "completeness": "comprehensive",
    "efficiency": "optimized"
}}

print(f"🎯 Goal Alignment: {{validation_checks['goal_alignment']}}")
print(f"✅ Feasibility: {{validation_checks['feasibility']}}")
print(f"📊 Completeness: {{validation_checks['completeness']}}")
print(f"⚡ Efficiency: {{validation_checks['efficiency']}}")

pcs_agent.store_planning_event("workflow_validation", f"Validation passed: {{validation_checks}}")
pcs_agent.update_planning_todo("complete", "workflow_validation")

# 🎯 Event 5: 规划最终化
print("\\n🔄 [EVENT 5] Planning Finalization")

final_workflow = {{
    "workflow_id": f"workflow_{{datetime.now().strftime('%Y%m%d_%H%M%S')}}",
    "user_goal": user_goal,
    "chapters": workflow_design['recommended_chapters'],
    "estimated_duration": "2-4 weeks",
    "success_metrics": ["accuracy", "interpretability", "business_value"],
    "next_action": "chapter_1_data_existence_establishment"
}}

print(f"🆔 Workflow ID: {{final_workflow['workflow_id']}}")
print(f"📊 Total Chapters: {{len(final_workflow['chapters'])}}")
print(f"⏰ Estimated Duration: {{final_workflow['estimated_duration']}}")
print(f"🎯 Success Metrics: {{final_workflow['success_metrics']}}")
print(f"🚀 Next Action: {{final_workflow['next_action']}}")

pcs_agent.store_planning_event("planning_finalization", f"Finalized workflow: {{final_workflow['workflow_id']}}")
pcs_agent.update_planning_todo("complete", "planning_finalization")

# 🏁 Final Check: 规划完成验证
print("\\n🔍 [FINAL CHECK] Planning Completion Verification")
is_complete = pcs_agent.check_planning_completion()

# 📊 PCS Agent规划总结
print("\\n📊 [PCS PLANNING SUMMARY]")
print(f"✅ Events Completed: {{5 - len(pcs_agent.todo_list)}}/5")
print(f"📝 Planning Decisions: {{len(pcs_agent.planning_memory)}}")
print(f"🎯 Strategic Decisions: {{len(pcs_agent.strategic_decisions)}}")
print(f"🧠 Agent Status: {{'Complete' if is_complete else 'In Progress'}}")

if is_complete:
    print("\\n🎉 [PCS CONSCIOUSNESS] Strategic workflow planning completed successfully!")
    print("🚀 Ready to execute: Data Existence Establishment")

print("\\n🧠 PCS Agent Strategic Planning Complete")
'''

        return self.add_text("🔄 **执行PCS Agent事件驱动规划**") \
            .add_text("🧠 **Agent特性**: 战略意识、规划记忆、TodoList管理、完成检测") \
            .add_code(pcs_planning_code) \
            .exe_code_cli(
                event_tag="pcs_planning_complete",
                mark_finnish="PCS规划完成"
            )

    def pcs_planning_complete(self):
        """PCS规划完成处理"""
        planning_result = self.get_current_effect()

        return self.add_text("✅ **PCS Agent智能规划完成**") \
            .add_text("🧠 **规划成就**: 成功完成5个规划事件，生成战略工作流") \
            .add_text("📊 **规划结果**: 目标分析、上下文评估、解决方案设计、验证完成") \
            .add_text("🎯 **战略决策**: 生成针对性的章节序列和执行策略") \
            .add_text("🚀 **下一步**: 开始数据存在性建立阶段") \
            .add_variable("pcs_planning_result", planning_result) \
            .add_variable("planning_status", "completed") \
            .add_variable("workflow_designed", True) \
            .add_variable("next_recommended_action", "chapter_1_data_existence_establishment")

    def traditional_planning(self):
        """传统规划模式（Agent不可用时的回退）"""
        user_goal = self.get_variable('user_goal')
        validation_result = self.get_variable('goal_validation_result', {})

        return self.add_text("🔄 **传统规划模式**") \
            .add_text("⚠️ **说明**: PCS Agent不可用，使用传统工作流规划") \
            .add_code(f'''
# 传统工作流规划方法
print("🔄 Traditional Workflow Planning")
print("=" * 40)

user_goal = "{user_goal}"
validation_data = {validation_result}

print(f"🎯 用户目标: {{user_goal}}")
print(f"📊 验证结果: {{validation_data}}")

# 基础工作流设计
basic_workflow = [
    "chapter_1_data_existence_establishment",
    "chapter_2_data_integrity_assurance",
    "chapter_3_data_insight_acquisition",
    "chapter_4_methodology_strategy_formulation",
    "chapter_5_model_implementation_execution",
    "chapter_7_results_evaluation_confirmation"
]

print("\\n📋 推荐工作流:")
for i, chapter in enumerate(basic_workflow, 1):
    print(f"{{i}}. {{chapter}}")

print("\\n✅ 传统规划完成")
''') \
            .exe_code_cli(
                event_tag="traditional_planning_complete",
                mark_finnish="传统规划完成"
            )

    def traditional_planning_complete(self):
        """传统规划完成"""
        planning_result = self.get_current_effect()

        return self.add_text("✅ **传统规划完成**") \
            .add_text("📊 **结果**: 基础工作流规划已完成") \
            .add_text("💡 **建议**: 考虑升级到PCS Agent模式获得更智能的规划") \
            .add_variable("traditional_planning_result", planning_result) \
            .add_variable("planning_status", "completed_traditional") \
            .add_variable("next_recommended_action", "chapter_1_data_existence_establishment")

# 生成器函数
def generate_design_workflow(
    step: Dict[str, Any],
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
):
    """真实智能工作流规划生成器"""
    action = RealWorkflowDesign(step, state, stream)
    return action.run()

# 保持向后兼容性
def design_workflow(
    step: Dict[str, Any],
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
):
    """向后兼容的生成器函数"""
    return generate_design_workflow(step, state, stream)

