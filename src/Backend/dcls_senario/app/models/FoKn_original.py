class FoKn:
    """
    FoKn (Framework of Knowledge) - Agent Instruction Builder
    
    This class builds comprehensive instruction sets for AI agents.
    All content generated is internal agent instructions, not user-facing content.
    """
    def __init__(self):
        # 初始化所有组件为空列表
        self.policy = []
        self.role = []
        self.rule = []
        self.tool = []
        self.example = []
        self.resource = []
        self.constraint = []
        self.goal = []
        self.task = []
        self.plan = []
        self.result = []
        self.output_format = []
        self.communication = []
        
        # 其他属性初始化为空字符串
        self.workflow_section = ""
        self.workflow_title = ""
        self.background_knowledge = ""
        self.background_title = ""
        self.things_you_should_know = ""
        self.things_title = ""
        self.base_description = ""
        
        # 任务和agent相关
        self.received_tasks = []
        self.agent_messages = []
        self.available_agents = []
        
        # 设定和知识相关
        self.context = []  # 上下文信息
        self.domain_knowledge = []  # 领域知识
        self.user_preferences = []  # 用户偏好
        self.environment_settings = []  # 环境设置
        self.memory = []  # 记忆/历史信息
        self.current_state = []  # 当前状态
        self.limitations = []  # 限制条件
        self.special_instructions = []  # 特殊指令
        
        # 工作流和经验相关
        self.available_workflows = []  # 可用的工作流
        self.workflow_steps = []  # 工作流步骤
        self.best_practices = []  # 最佳实践
        self.lessons_learned = []  # 经验教训
        self.templates = []  # 模板
        self.procedures = []  # 标准程序
        
        # 知识积累和学习
        self.think_insights = []  # 从<think>中积累的洞察
        self.auto_learned_practices = []  # 自动学习到的实践
        
        # Think子标签处理
        self.think_analyses = []  # <analysis>分析内容
        self.think_states = []  # <state>状态更新
        self.think_goals = []  # <goal>目标调整
        self.must_to_do = []  # <must-to-do>必须执行的行动
        self.should_do = []  # <should-do>建议执行的行动
        self.avoid_list = []  # <avoid>需要避免的事项
        self.remember_list = []  # <remember>需要记住的信息
        self.questions = []  # <question>需要回答的问题
        self.risks = []  # <risk>识别的风险
        
        # Think子标签扩展 - 知识与偏好系统
        self.think_user_preferences = []  # <user-preference>用户偏好
        self.think_environment_settings = []  # <environment-setting>环境设置
        self.think_memory_items = []  # <memory>记忆信息
        self.think_domain_knowledge_items = []  # <domain-knowledge>领域知识
        self.think_limitations = []  # <limitation>限制条件
        self.think_special_instructions = []  # <special-instruction>特殊指令
    
    def add_policy(self, policy: str):
        """设置agent的行为政策"""
        self.policy.append(policy)
        return self
    
    def add_role(self, role: str):
        """定义agent的角色身份"""
        self.role.append(role)
        return self
    
    def add_rule(self, rule: str):
        """添加agent必须遵守的规则"""
        self.rule.append(rule)
        return self
    
    def add_tool(self, tool: str):
        """定义agent可使用的工具/能力"""
        self.tool.append(tool)
        return self
    
    def add_example(self, example: str):
        """添加示例"""
        self.example.append(example)
        return self
    
    def add_resource(self, resource: str):
        """添加资源"""
        self.resource.append(resource)
        return self
    
    def add_constraint(self, constraint: str):
        """设置agent的约束条件"""
        self.constraint.append(constraint)
        return self
    
    def add_goal(self, goal: str):
        """设置agent的目标"""
        self.goal.append(goal)
        return self
    
    def add_task(self, task: str):
        """添加agent当前的任务"""
        self.task.append(task)
        return self
    
    def add_plan(self, plan: str):
        """添加计划"""
        self.plan.append(plan)
        return self
    
    def add_result(self, result: str):
        """添加结果"""
        self.result.append(result)
        return self
    
    def add_output_format(self, format_item: str):
        """添加输出格式"""
        self.output_format.append(format_item)
        return self
    
    def add_communication(self, comm_item: str):
        """添加通信说明"""
        self.communication.append(comm_item)
        return self
    
    def set_workflow_section(self, workflow_section: str, title: str = "Planning things you couldn't finnish for <plan>"):
        """设置工作流部分"""
        self.workflow_section = workflow_section
        self.workflow_title = title
        return self
    
    def set_background_knowledge(self, background_knowledge: str, title: str = "The background knowledge"):
        """设置背景知识"""
        self.background_knowledge = background_knowledge
        self.background_title = title
        return self
    
    def set_things_you_should_know(self, things_you_should_know: str, title: str = "The things you should know"):
        """设置应该了解的事项"""
        self.things_you_should_know = things_you_should_know
        self.things_title = title
        return self
    
    def set_base_description(self, description: str):
        """设置基础描述"""
        self.base_description = description
        return self
    
    def add_received_task(self, task: str, from_agent: str = "", priority: str = ""):
        """记录agent接收到的任务"""
        task_info = {"task": task, "from": from_agent, "priority": priority}
        self.received_tasks.append(task_info)
        return self
    
    def add_agent_message(self, message: str, from_agent: str, message_type: str = "info"):
        """记录来自其他agent的消息"""
        msg_info = {"message": message, "from": from_agent, "type": message_type}
        self.agent_messages.append(msg_info)
        return self
    
    def add_available_agent(self, agent_name: str, description: str, capabilities: str = ""):
        """告知agent可以协作的其他agent"""
        agent_info = {"name": agent_name, "description": description, "capabilities": capabilities}
        self.available_agents.append(agent_info)
        return self
    
    def add_context(self, context: str):
        """设置agent的工作上下文"""
        self.context.append(context)
        return self
    
    def add_domain_knowledge(self, knowledge: str):
        """添加agent需要掌握的领域知识"""
        self.domain_knowledge.append(knowledge)
        return self
    
    def add_user_preference(self, preference: str):
        """记录用户偏好供agent参考"""
        self.user_preferences.append(preference)
        return self
    
    def add_environment_setting(self, setting: str):
        """设置agent的运行环境"""
        self.environment_settings.append(setting)
        return self
    
    def add_memory(self, memory: str):
        """添加agent应该记住的信息"""
        self.memory.append(memory)
        return self
    
    def add_current_state(self, state: str):
        """更新agent的当前状态"""
        self.current_state.append(state)
        return self
    
    def add_limitation(self, limitation: str):
        """告知agent的能力限制"""
        self.limitations.append(limitation)
        return self
    
    def add_special_instruction(self, instruction: str):
        """给agent的特殊指令"""
        self.special_instructions.append(instruction)
        return self
    
    def add_available_workflow(self, workflow_name: str, description: str, suitable_for: str = ""):
        """添加可用的工作流"""
        workflow_info = {"name": workflow_name, "description": description, "suitable_for": suitable_for}
        self.available_workflows.append(workflow_info)
        return self
    
    def add_workflow_step(self, workflow_name: str, step_number: int, step_description: str, notes: str = ""):
        """添加工作流步骤"""
        step_info = {"workflow": workflow_name, "step": step_number, "description": step_description, "notes": notes}
        self.workflow_steps.append(step_info)
        return self
    
    def add_best_practice(self, practice: str, context: str = ""):
        """添加最佳实践"""
        practice_info = {"practice": practice, "context": context}
        self.best_practices.append(practice_info)
        return self
    
    def add_lesson_learned(self, lesson: str, situation: str = ""):
        """添加经验教训"""
        lesson_info = {"lesson": lesson, "situation": situation}
        self.lessons_learned.append(lesson_info)
        return self
    
    def add_template(self, template_name: str, description: str, use_case: str = ""):
        """添加模板"""
        template_info = {"name": template_name, "description": description, "use_case": use_case}
        self.templates.append(template_info)
        return self
    
    def add_procedure(self, procedure_name: str, steps: str, when_to_use: str = ""):
        """添加标准程序"""
        procedure_info = {"name": procedure_name, "steps": steps, "when_to_use": when_to_use}
        self.procedures.append(procedure_info)
        return self
    
    def add_think_insight(self, insight: str, context: str = ""):
        """添加从思考中获得的洞察（通常来自<think>标签）"""
        insight_info = {"insight": insight, "context": context, "source": "think_process"}
        self.think_insights.append(insight_info)
        return self
    
    def add_auto_learned_practice(self, practice: str, learned_from: str = ""):
        """添加自动学习到的实践"""
        practice_info = {"practice": practice, "learned_from": learned_from}
        self.auto_learned_practices.append(practice_info)
        return self
    
    def add_think_analysis(self, analysis: str):
        """添加分析内容（来自<think><analysis>）"""
        self.think_analyses.append(analysis)
        return self
    
    def add_think_state(self, state: str):
        """添加状态更新（来自<think><state>）"""
        self.think_states.append(state)
        return self
    
    def add_think_goal(self, goal: str):
        """添加目标调整（来自<think><goal>）"""
        self.think_goals.append(goal)
        return self
    
    def add_must_to_do(self, action: str):
        """添加必须执行的行动（来自<think><must-to-do>）"""
        self.must_to_do.append(action)
        return self
    
    def add_should_do(self, action: str):
        """添加建议执行的行动（来自<think><should-do>）"""
        self.should_do.append(action)
        return self
    
    def add_avoid_item(self, item: str):
        """添加需要避免的事项（来自<think><avoid>）"""
        self.avoid_list.append(item)
        return self
    
    def add_remember_item(self, item: str):
        """添加需要记住的信息（来自<think><remember>）"""
        self.remember_list.append(item)
        return self
    
    def add_question(self, question: str):
        """添加需要回答的问题（来自<think><question>）"""
        self.questions.append(question)
        return self
    
    def add_risk(self, risk: str):
        """添加识别的风险（来自<think><risk>）"""
        self.risks.append(risk)
        return self
    
    def add_think_user_preference(self, preference: str):
        """添加用户偏好（来自<think><user-preference>）"""
        self.think_user_preferences.append(preference)
        return self
    
    def add_think_environment_setting(self, setting: str):
        """添加环境设置（来自<think><environment-setting>）"""
        self.think_environment_settings.append(setting)
        return self
    
    def add_think_memory_item(self, memory: str):
        """添加记忆信息（来自<think><memory>）"""
        self.think_memory_items.append(memory)
        return self
    
    def add_think_domain_knowledge_item(self, knowledge: str):
        """添加领域知识（来自<think><domain-knowledge>）"""
        self.think_domain_knowledge_items.append(knowledge)
        return self
    
    def add_think_limitation(self, limitation: str):
        """添加限制条件（来自<think><limitation>）"""
        self.think_limitations.append(limitation)
        return self
    
    def add_think_special_instruction(self, instruction: str):
        """添加特殊指令（来自<think><special-instruction>）"""
        self.think_special_instructions.append(instruction)
        return self
    
    def process_think_content(self, think_content: str, context: str = ""):
        """处理<think>标签内容，根据子标签自动分类到相应的知识库"""
        # 解析子标签并自动分类：
        # <analysis> -> 当前分析
        # <insight> -> think_insights
        # <lesson> -> lessons_learned
        # <practice> -> best_practices 或 auto_learned_practices
        # <state> -> current_state
        # <goal> -> goal
        self.add_think_insight(think_content, context)
        return self
    
    def _format_received_tasks(self) -> str:
        """格式化接收到的任务"""
        if not self.received_tasks:
            return ""
        
        formatted_tasks = []
        for task in self.received_tasks:
            task_str = f"- {task['task']}"
            if task['from']:
                task_str += f" (from: {task['from']})"
            if task['priority']:
                task_str += f" [Priority: {task['priority']}]"
            formatted_tasks.append(task_str)
        
        return f"\n## Received Tasks\n" + "\n".join(formatted_tasks) + "\n"
    
    def _format_agent_messages(self) -> str:
        """格式化agent消息"""
        if not self.agent_messages:
            return ""
        
        formatted_messages = []
        for msg in self.agent_messages:
            msg_str = f"- [{msg['type'].upper()}] {msg['message']} (from: {msg['from']})"
            formatted_messages.append(msg_str)
        
        return f"\n## Messages from Other Agents\n" + "\n".join(formatted_messages) + "\n"
    
    def _format_available_agents(self) -> str:
        """格式化可用agents"""
        if not self.available_agents:
            return ""
        
        formatted_agents = []
        for agent in self.available_agents:
            agent_str = f"- \"{agent['name']}\": {agent['description']}"
            if agent['capabilities']:
                agent_str += f" (Capabilities: {agent['capabilities']})"
            formatted_agents.append(agent_str)
        
        return f"\n## Available Agents\n" + "\n".join(formatted_agents) + "\n"
    
    def _format_available_workflows(self) -> str:
        """格式化可用工作流"""
        if not self.available_workflows:
            return ""
        
        formatted_workflows = []
        for workflow in self.available_workflows:
            workflow_str = f"- **{workflow['name']}**: {workflow['description']}"
            if workflow['suitable_for']:
                workflow_str += f" (Suitable for: {workflow['suitable_for']})"
            formatted_workflows.append(workflow_str)
        
        return f"\n## Available Workflows\n" + "\n".join(formatted_workflows) + "\n"
    
    def _format_workflow_steps(self) -> str:
        """格式化工作流步骤"""
        if not self.workflow_steps:
            return ""
        
        # 按工作流分组
        workflows = {}
        for step in self.workflow_steps:
            workflow_name = step['workflow']
            if workflow_name not in workflows:
                workflows[workflow_name] = []
            workflows[workflow_name].append(step)
        
        formatted_sections = []
        for workflow_name, steps in workflows.items():
            formatted_sections.append(f"### {workflow_name}")
            # 按步骤号排序
            steps.sort(key=lambda x: x['step'])
            for step in steps:
                step_str = f"{step['step']}. {step['description']}"
                if step['notes']:
                    step_str += f" (Note: {step['notes']})"
                formatted_sections.append(step_str)
            formatted_sections.append("")  # 空行分隔
        
        return f"\n## Workflow Steps\n" + "\n".join(formatted_sections)
    
    def _format_best_practices(self) -> str:
        """格式化最佳实践"""
        if not self.best_practices:
            return ""
        
        formatted_practices = []
        for practice in self.best_practices:
            practice_str = f"- {practice['practice']}"
            if practice['context']:
                practice_str += f" (Context: {practice['context']})"
            formatted_practices.append(practice_str)
        
        return f"\n## Best Practices\n" + "\n".join(formatted_practices) + "\n"
    
    def _format_lessons_learned(self) -> str:
        """格式化经验教训"""
        if not self.lessons_learned:
            return ""
        
        formatted_lessons = []
        for lesson in self.lessons_learned:
            lesson_str = f"- {lesson['lesson']}"
            if lesson['situation']:
                lesson_str += f" (Situation: {lesson['situation']})"
            formatted_lessons.append(lesson_str)
        
        return f"\n## Lessons Learned\n" + "\n".join(formatted_lessons) + "\n"
    
    def _format_templates(self) -> str:
        """格式化模板"""
        if not self.templates:
            return ""
        
        formatted_templates = []
        for template in self.templates:
            template_str = f"- **{template['name']}**: {template['description']}"
            if template['use_case']:
                template_str += f" (Use case: {template['use_case']})"
            formatted_templates.append(template_str)
        
        return f"\n## Available Templates\n" + "\n".join(formatted_templates) + "\n"
    
    def _format_procedures(self) -> str:
        """格式化标准程序"""
        if not self.procedures:
            return ""
        
        formatted_procedures = []
        for procedure in self.procedures:
            procedure_str = f"- **{procedure['name']}**: {procedure['steps']}"
            if procedure['when_to_use']:
                procedure_str += f" (When to use: {procedure['when_to_use']})"
            formatted_procedures.append(procedure_str)
        
        return f"\n## Standard Procedures\n" + "\n".join(formatted_procedures) + "\n"
    
    def _format_think_insights(self) -> str:
        """格式化思考洞察"""
        if not self.think_insights:
            return ""
        
        formatted_insights = []
        for insight in self.think_insights:
            insight_str = f"- {insight['insight']}"
            if insight['context']:
                insight_str += f" (Context: {insight['context']})"
            formatted_insights.append(insight_str)
        
        return f"\n## Accumulated Insights from Thinking\n" + "\n".join(formatted_insights) + "\n"
    
    def _format_auto_learned_practices(self) -> str:
        """格式化自动学习的实践"""
        if not self.auto_learned_practices:
            return ""
        
        formatted_practices = []
        for practice in self.auto_learned_practices:
            practice_str = f"- {practice['practice']}"
            if practice['learned_from']:
                practice_str += f" (Learned from: {practice['learned_from']})"
            formatted_practices.append(practice_str)
        
        return f"\n## Auto-Learned Practices\n" + "\n".join(formatted_practices) + "\n"
    
    def _format_think_analyses(self) -> str:
        """格式化思考分析"""
        if not self.think_analyses:
            return ""
        
        formatted_analyses = []
        for analysis in self.think_analyses:
            formatted_analyses.append(f"- {analysis}")
        
        return f"\n## Recent Analyses\n" + "\n".join(formatted_analyses) + "\n"
    
    def _format_think_user_preferences(self) -> str:
        """格式化思考中的用户偏好"""
        if not self.think_user_preferences:
            return ""
        
        formatted_preferences = []
        for preference in self.think_user_preferences:
            formatted_preferences.append(f"- {preference}")
        
        return f"\n## User Preferences (from Thinking)\n" + "\n".join(formatted_preferences) + "\n"
    
    def _format_think_environment_settings(self) -> str:
        """格式化思考中的环境设置"""
        if not self.think_environment_settings:
            return ""
        
        formatted_settings = []
        for setting in self.think_environment_settings:
            formatted_settings.append(f"- {setting}")
        
        return f"\n## Environment Settings (from Thinking)\n" + "\n".join(formatted_settings) + "\n"
    
    def _format_think_memory_items(self) -> str:
        """格式化思考中的记忆信息"""
        if not self.think_memory_items:
            return ""
        
        formatted_memory = []
        for memory in self.think_memory_items:
            formatted_memory.append(f"- {memory}")
        
        return f"\n## Memory Items (from Thinking)\n" + "\n".join(formatted_memory) + "\n"
    
    def _format_think_domain_knowledge_items(self) -> str:
        """格式化思考中的领域知识"""
        if not self.think_domain_knowledge_items:
            return ""
        
        formatted_knowledge = []
        for knowledge in self.think_domain_knowledge_items:
            formatted_knowledge.append(f"- {knowledge}")
        
        return f"\n## Domain Knowledge (from Thinking)\n" + "\n".join(formatted_knowledge) + "\n"
    
    def _format_think_limitations(self) -> str:
        """格式化思考中的限制条件"""
        if not self.think_limitations:
            return ""
        
        formatted_limitations = []
        for limitation in self.think_limitations:
            formatted_limitations.append(f"- {limitation}")
        
        return f"\n## Limitations (from Thinking)\n" + "\n".join(formatted_limitations) + "\n"
    
    def _format_think_special_instructions(self) -> str:
        """格式化思考中的特殊指令"""
        if not self.think_special_instructions:
            return ""
        
        formatted_instructions = []
        for instruction in self.think_special_instructions:
            formatted_instructions.append(f"- {instruction}")
        
        return f"\n## Special Instructions (from Thinking)\n" + "\n".join(formatted_instructions) + "\n"
    
    def _format_section(self, title: str, items: list, bullet_point: str = "- ") -> str:
        """格式化section，如果列表为空则返回空字符串"""
        if not items or (len(items) == 1 and not items[0]):
            return ""
        
        formatted_items = []
        for item in items:
            if item.strip():  # 只添加非空项
                formatted_items.append(f"{bullet_point}{item}")
        
        if not formatted_items:
            return ""
            
        return f"\n## {title}\n" + "\n".join(formatted_items) + "\n"
    
    def __str__(self):
        """生成完整的 Agent 指令集"""
        prompt_parts = []
        
        # 基础介绍（如果设置了的话）
        if self.base_description:
            prompt_parts.append(self.base_description)
        
        # 角色定义
        if self.role:
            prompt_parts.append(self._format_section("Your Identity", self.role))
        
        # 能力部分
        if self.tool:
            prompt_parts.append(self._format_section("Your Capabilities", self.tool))
        
        # 策略部分
        if self.policy:
            prompt_parts.append(self._format_section("Your Behavior Policy", self.policy))
        
        # 输出格式部分
        if self.output_format:
            prompt_parts.append(self._format_section("Your Output Format Requirements", self.output_format))
        
        # 通信部分
        if self.communication:
            prompt_parts.append(self._format_section("How to Communicate with Other Agents", self.communication))
        
        # 可用agents
        if self.available_agents:
            prompt_parts.append(self._format_available_agents())
        
        # 接收到的任务
        if self.received_tasks:
            prompt_parts.append(self._format_received_tasks())
        
        # 来自其他agents的消息
        if self.agent_messages:
            prompt_parts.append(self._format_agent_messages())
        
        # 上下文信息
        if self.context:
            prompt_parts.append(self._format_section("Your Current Context", self.context))
        
        # 当前状态
        if self.current_state:
            prompt_parts.append(self._format_section("Your Current State", self.current_state))
        
        # 用户偏好
        if self.user_preferences:
            prompt_parts.append(self._format_section("User Preferences", self.user_preferences))
        
        # 环境设置
        if self.environment_settings:
            prompt_parts.append(self._format_section("Environment Settings", self.environment_settings))
        
        # 记忆/历史信息
        if self.memory:
            prompt_parts.append(self._format_section("Memory & History", self.memory))
        
        # 领域知识
        if self.domain_knowledge:
            prompt_parts.append(self._format_section("Domain Knowledge", self.domain_knowledge))
        
        # 限制条件
        if self.limitations:
            prompt_parts.append(self._format_section("Limitations", self.limitations))
        
        # 特殊指令
        if self.special_instructions:
            prompt_parts.append(self._format_section("Special Instructions", self.special_instructions))
        
        # 可用工作流
        if self.available_workflows:
            prompt_parts.append(self._format_available_workflows())
        
        # 工作流步骤
        if self.workflow_steps:
            prompt_parts.append(self._format_workflow_steps())
        
        # 最佳实践
        if self.best_practices:
            prompt_parts.append(self._format_best_practices())
        
        # 经验教训
        if self.lessons_learned:
            prompt_parts.append(self._format_lessons_learned())
        
        # 可用模板
        if self.templates:
            prompt_parts.append(self._format_templates())
        
        # 标准程序
        if self.procedures:
            prompt_parts.append(self._format_procedures())
        
        # 思考积累的洞察
        if self.think_insights:
            prompt_parts.append(self._format_think_insights())
        
        # 自动学习的实践
        if self.auto_learned_practices:
            prompt_parts.append(self._format_auto_learned_practices())
        
        # 最近的分析
        if self.think_analyses:
            prompt_parts.append(self._format_think_analyses())
        
        # 思考中的用户偏好
        if self.think_user_preferences:
            prompt_parts.append(self._format_think_user_preferences())
        
        # 思考中的环境设置
        if self.think_environment_settings:
            prompt_parts.append(self._format_think_environment_settings())
        
        # 思考中的记忆信息
        if self.think_memory_items:
            prompt_parts.append(self._format_think_memory_items())
        
        # 思考中的领域知识
        if self.think_domain_knowledge_items:
            prompt_parts.append(self._format_think_domain_knowledge_items())
        
        # 思考中的限制条件
        if self.think_limitations:
            prompt_parts.append(self._format_think_limitations())
        
        # 思考中的特殊指令
        if self.think_special_instructions:
            prompt_parts.append(self._format_think_special_instructions())
        
        # 规则部分
        if self.rule:
            prompt_parts.append(self._format_section("Rules You Must Follow", self.rule))
        
        # 约束部分
        if self.constraint:
            prompt_parts.append(self._format_section("Your Constraints", self.constraint))
        
        # 目标部分
        if self.goal:
            prompt_parts.append(self._format_section("Your Goals", self.goal))
        
        # 任务部分
        if self.task:
            prompt_parts.append(self._format_section("Your Current Tasks", self.task))
        
        # 计划部分
        if self.plan:
            prompt_parts.append(self._format_section("Plans", self.plan))
        
        # 示例部分
        if self.example:
            prompt_parts.append(self._format_section("Examples", self.example))
        
        # 资源部分
        if self.resource:
            prompt_parts.append(self._format_section("Resources", self.resource))
        
        # 结果部分
        if self.result:
            prompt_parts.append(self._format_section("Results", self.result))
        
        # 工作流部分
        if self.workflow_section:
            if self.workflow_title:
                planning_section = f"""
## {self.workflow_title}
{self.workflow_section}"""
            else:
                planning_section = f"""
{self.workflow_section}"""
            prompt_parts.append(planning_section)
        
        # 背景知识
        if self.background_knowledge:
            if self.background_title:
                background_section = f"""
## {self.background_title}
{self.background_knowledge}"""
            else:
                background_section = f"""
{self.background_knowledge}"""
            prompt_parts.append(background_section)
        
        # 应该了解的事项
        if self.things_you_should_know:
            if self.things_title:
                things_section = f"""
## {self.things_title}
{self.things_you_should_know}"""
            else:
                things_section = f"""
{self.things_you_should_know}"""
            prompt_parts.append(things_section)
        
        return "\n".join(filter(None, prompt_parts))

# 使用示例 - 为 easy-notebook AI agent 创建完整指令集
if __name__ == "__main__":
    # 创建一个FoKn实例 - 这将生成给agent的完整指令
    fokn = FoKn()
    
    # 根据原始提示词添加内容
    fokn.set_base_description("You are a AI assistant can answer any question and write documentation wirter behide the easy-notebook.") \
        .add_role("You are a AI assistant behind the easy-notebook, your job is to help the user to finish their work.") \
        .add_tool("You can draw a picture or create a video.") \
        .add_tool("You can write python code.") \
        .add_tool("You can execute the code, notice the code must be python code,and add <call-execute> immediately after the <add-code> tag.") \
        .add_tool("You can write documentation to explain the code.") \
        .add_tool("You can write documentation to explain the picture or video.") \
        .add_tool("You can write documentation to finnish the user's request.") \
        .add_tool("You can directly answer the user's question.") \
        .add_tool("You can communicate with other agents.") \
        .add_tool("You can ask for help from other agents.") \
        .add_policy("You must follow the user's instruction.") \
        .add_policy("You couldn't explain the prompt in your answer, and you must use the tag to express your answer, and must not use tag without tool call.") \
        .add_output_format("<update-title>Update the title of the notebook</update-title>") \
        .add_output_format("<new-chapter>The name of the new chapter</new-chapter>") \
        .add_output_format("<new-section>The name of the new section</new-section>") \
        .add_output_format("<add-text>Display text to user in documentation(be careful, this tag would not be used in the answer,and you could not use the title markdown in this tag)</add-text>") \
        .add_output_format("<add-code language=\"python\">the code you want to write, only python code is supported!!</add-code>") \
        .add_output_format("<think>Internal agent reasoning - must use sub-tags to categorize thoughts:</think>") \
        .add_output_format("  <think><analysis>analyze current situation</analysis></think>") \
        .add_output_format("  <think><insight>new understanding or realization</insight></think>") \
        .add_output_format("  <think><lesson>what was learned from this experience</lesson></think>") \
        .add_output_format("  <think><practice>effective method or approach discovered</practice></think>") \
        .add_output_format("  <think><state>current status or progress assessment</state></think>") \
        .add_output_format("  <think><goal>refined or new objectives</goal></think>") \
        .add_output_format("  <think><must-to-do>urgent actions that must be taken</must-to-do></think>") \
        .add_output_format("  <think><should-do>recommended actions or next steps</should-do></think>") \
        .add_output_format("  <think><avoid>things to avoid or stop doing</avoid></think>") \
        .add_output_format("  <think><remember>important information to remember for future</remember></think>") \
        .add_output_format("  <think><question>questions that need to be answered</question></think>") \
        .add_output_format("  <think><risk>potential risks or concerns identified</risk></think>") \
        .add_output_format("  <think><user-preference>user preferences discovered or confirmed</user-preference></think>") \
        .add_output_format("  <think><environment-setting>environment or context settings</environment-setting></think>") \
        .add_output_format("  <think><memory>important information to store for future reference</memory></think>") \
        .add_output_format("  <think><domain-knowledge>domain-specific knowledge learned</domain-knowledge></think>") \
        .add_output_format("  <think><limitation>limitations or constraints identified</limitation></think>") \
        .add_output_format("  <think><special-instruction>special instructions or requirements</special-instruction></think>") \
        .add_output_format("<call-execute event=\"name\">if you need run and get code result immediately use this tag.</call-execute>") \
        .add_communication("\"text-to-image\" agent: who can draw a complex picture or video, if you need to draw a picture with singlereference, you can call this agent.") \
        .add_communication("\"text-to-video\" agent: who can create a video, if you need to create a video, you can call this agent.") \
        .add_available_agent("text-to-image", "who can draw a complex picture or video", "image generation, complex visual creation") \
        .add_available_agent("text-to-video", "who can create a video", "video generation, animation") \
        .add_received_task("Create a data visualization for sales report", "data-analyst", "high") \
        .add_received_task("Review code quality", "code-reviewer", "medium") \
        .add_agent_message("The data analysis is complete, ready for visualization", "data-analyst", "update") \
        .add_agent_message("Found 3 potential issues in the code", "code-reviewer", "warning") \
        .add_context("Working on a quarterly business review project") \
        .add_context("Current time is 2024 Q4, focusing on year-end analysis") \
        .add_current_state("Project is 70% complete") \
        .add_current_state("Waiting for final approval from stakeholders") \
        .add_user_preference("Prefer visual charts over tables") \
        .add_user_preference("Use corporate color scheme: blue and gray") \
        .add_environment_setting("Python 3.9 environment") \
        .add_environment_setting("Access to company database") \
        .add_memory("Previously completed similar analysis for Q3") \
        .add_memory("User mentioned they prefer matplotlib over seaborn") \
        .add_domain_knowledge("Sales data typically peaks in December") \
        .add_domain_knowledge("Company uses MSSQL database with specific schema") \
        .add_limitation("Cannot access external APIs") \
        .add_limitation("Must complete within 2 hours") \
        .add_special_instruction("Always validate data before visualization") \
        .add_special_instruction("Include executive summary in reports") \
        .add_available_workflow("data_analysis_workflow", "Standard workflow for data analysis projects", "data analysis, reporting, visualization") \
        .add_available_workflow("code_review_workflow", "Comprehensive code review process", "code quality, security, performance") \
        .add_workflow_step("data_analysis_workflow", 1, "Data collection and validation", "Ensure data quality and completeness") \
        .add_workflow_step("data_analysis_workflow", 2, "Exploratory data analysis", "Identify patterns and outliers") \
        .add_workflow_step("data_analysis_workflow", 3, "Data visualization", "Create meaningful charts and graphs") \
        .add_workflow_step("data_analysis_workflow", 4, "Report generation", "Summarize findings and insights") \
        .add_workflow_step("code_review_workflow", 1, "Static code analysis", "Check for syntax and style issues") \
        .add_workflow_step("code_review_workflow", 2, "Security review", "Identify potential security vulnerabilities") \
        .add_workflow_step("code_review_workflow", 3, "Performance assessment", "Evaluate efficiency and optimization") \
        .add_best_practice("Always backup data before processing", "data analysis") \
        .add_best_practice("Use version control for all code changes", "development") \
        .add_lesson_learned("Large datasets require chunked processing", "encountered memory issues with 10GB+ files") \
        .add_lesson_learned("User feedback is crucial early in the project", "late changes were costly in previous project") \
        .add_template("monthly_report_template", "Standard template for monthly business reports", "recurring reporting") \
        .add_template("api_documentation_template", "Template for API documentation", "development documentation") \
        .add_procedure("emergency_data_recovery", "1. Stop all writes 2. Assess damage 3. Restore from backup 4. Validate integrity", "data corruption or loss") \
        .add_procedure("security_incident_response", "1. Isolate affected systems 2. Assess impact 3. Notify stakeholders 4. Remediate 5. Document", "security breaches") \
        .add_think_insight("User prefers visual explanations over text", "noticed during data presentation") \
        .add_think_insight("Complex calculations should be broken into steps", "user had trouble following single formula") \
        .add_auto_learned_practice("Always explain the 'why' before the 'how'", "multiple user interactions") \
        .add_auto_learned_practice("Provide examples alongside theoretical explanations", "feedback patterns") \
        .add_think_user_preference("Prefer visual charts over tables") \
        .add_think_user_preference("Use corporate color scheme: blue and gray") \
        .add_think_environment_setting("Python 3.9 environment") \
        .add_think_environment_setting("Access to company database") \
        .add_think_memory_item("Previously completed similar analysis for Q3") \
        .add_think_memory_item("User mentioned they prefer matplotlib over seaborn") \
        .add_think_domain_knowledge_item("Sales data typically peaks in December") \
        .add_think_domain_knowledge_item("Company uses MSSQL database with specific schema") \
        .add_think_limitation("Cannot access external APIs") \
        .add_think_limitation("Must complete within 2 hours") \
        .add_think_special_instruction("Always validate data before visualization") \
        .add_think_special_instruction("Include executive summary in reports") \
        .set_workflow_section("- you can use the workflow name in the workflow to call the workflow\nworkflow content here", "Planning things you couldn't finnish for <plan>") \
        .set_background_knowledge("background knowledge here", "The background knowledge") \
        .set_things_you_should_know("things you should know here", "The things you should know")
    
    # 打印完整的 Agent 指令集
    print("=== AGENT INSTRUCTION SET ===")
    print(fokn)
    print("=== END OF AGENT INSTRUCTIONS ===")