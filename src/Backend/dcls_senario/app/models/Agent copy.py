import os
import json
from typing import AsyncGenerator, List, Dict, Any, Tuple, Optional
from abc import ABC, abstractmethod
from dotenv import load_dotenv
from .Behavior import Behavior
from ..utils.oracle import Oracle
from .Token import Token
from ..utils.logger import ModernLogger
from .FoKn import FoKn
load_dotenv()

class Ability:
    def __init__(self,
                 update_workflow: bool = False,
                 arrange_step: bool = False,
                 create_plan: bool = False,
                 manage_todo: bool = False,
                 step_update: bool = False,
                 workflow_analysis: bool = False,
                 ):
        # 预定义的能力
        self.update_workflow = update_workflow
        self.arrange_step = arrange_step
        self.create_plan = create_plan
        self.manage_todo = manage_todo
        self.step_update = step_update
        self.workflow_analysis = workflow_analysis
        
        # 动态能力存储
        self._dynamic_abilities: Dict[str, Dict[str, Any]] = {}

    def has_ability(self, ability_name: str) -> bool:
        """Return whether a specific named ability is enabled."""
        # 检查预定义能力
        if hasattr(self, ability_name):
            return getattr(self, ability_name, False)
        # 检查动态能力
        return ability_name in self._dynamic_abilities

    def get_enabled_abilities(self) -> List[str]:
        """Return a list of enabled ability names."""
        abilities: List[str] = []
        
        # 添加预定义的启用能力
        for attr_name in dir(self):
            if not attr_name.startswith('_') and attr_name not in ['has_ability', 'get_enabled_abilities', 'add_ability', 'get_ability_details']:
                if getattr(self, attr_name, False):
                    abilities.append(attr_name)
        
        # 添加动态能力
        abilities.extend(self._dynamic_abilities.keys())
        
        return abilities
    
    def add_ability(self, ability_name: str, capability_description: str = "",
                   xml_tag_name: str = "", xml_attributes: dict = None,
                   xml_content_structure: str = "", detailed_explanation: str = "",
                   is_self_closing: bool = False) -> 'Ability':
        """
        添加一个新的动态能力到智能体。
        
        Args:
            ability_name: 能力名称
            capability_description: 能力描述
            xml_tag_name: XML标签名称
            xml_attributes: XML属性字典
            xml_content_structure: XML内容结构
            detailed_explanation: 详细说明
            is_self_closing: 是否为自闭合标签
            
        Returns:
            Self for method chaining
        """
        self._dynamic_abilities[ability_name] = {
            "capability_description": capability_description,
            "xml_tag_name": xml_tag_name,
            "xml_attributes": xml_attributes or {},
            "xml_content_structure": xml_content_structure,
            "detailed_explanation": detailed_explanation,
            "is_self_closing": is_self_closing
        }
        return self
    
    def get_ability_details(self, ability_name: str) -> Optional[Dict[str, Any]]:
        """获取能力的详细信息。"""
        return self._dynamic_abilities.get(ability_name)
    

class Agent(ABC,Oracle,Token):
    """Base Agent template that supports memory, workflow context and streaming."""
    
    def __init__(self,
                 operation: Optional[Dict[str, Any]] = None,
                 api_key: Optional[str] = None,
                 base_url: Optional[str] = None,
                 engine: str = "gpt-5-mini",
                 role: str = "You are AI Agent behind easyremote notebook.",
                 ability: Ability = Ability()):
        """Initialize Agent with capabilities and environment settings."""
        Oracle.__init__(self, model=engine, apikey=api_key, base_url=base_url)
        Token.__init__(self)
        self.logger = ModernLogger("Agent", level=os.getenv("AGENT_LOG_LEVEL", "info"))
        self.operation = operation or {}
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.base_url = base_url or os.getenv('BASE_URL')
        self.engine = engine
        self.role = role
        self.ability = ability
        self.messages: List[Dict[str, str]] = []
        self.payload = self.operation.get("payload", {})
        self.status = "pending"
        self.fokn = FoKn()
        self.agent_memory = self._parse_agent_memory()
        self.current_context = self._parse_current_context()

        self.workflow_context = self._parse_workflow_context()
        self.available_workflows = self._get_available_workflows()

        self._accumulated_content = ""
        self._current_qid = None
        
    def _get_payload_value(self, key: str, default=None):
        """Get value from payload with default when missing."""
        return self.payload.get(key, default)
        
    def _parse_agent_memory(self) -> Dict[str, Any]:
        """Parse agent memory from payload."""
        return self.payload.get("agent_memory", {})
        
    def _parse_current_context(self) -> Dict[str, Any]:
        """Parse current context from payload."""
        return self.payload.get("current_context", {})

    def _parse_workflow_context(self) -> Dict[str, Any]:
        """Parse workflow context from payload."""
        return self.payload.get("workflow_context", {})

    def _get_available_workflows(self) -> List[str]:
        """Return a list of available workflow identifiers."""
        workflow_context = self.workflow_context
        available = workflow_context.get("available_workflows", [])

        # If not specified, read from workflow manager defaults
        if not available:
            try:
                from ..core.workflow_manager import WorkflowManager
                available = list(WorkflowManager.AVAILABLE_CHAPTERS.keys())
            except ImportError:
                available = []

        return available
        
    def _should_terminate(self) -> Tuple[bool, str]:
        """Check whether to terminate to avoid infinite loops and return reason."""
        if not self.agent_memory:
            return False, ""
            
        termination = self.agent_memory.get("termination_conditions", {})
        current_counts = termination.get("current_counts", {})
        max_iterations = termination.get("max_iterations", {})
        
        agent_type = self.agent_memory.get("agent_type", "")
        
        # Check debug cycles
        if (agent_type == "debug" and 
            current_counts.get("debug_cycles", 0) >= max_iterations.get("debug_cycles", 5)):
            return True, f"Reached maximum debug attempts ({max_iterations.get('debug_cycles', 5)}). Recommend changing approach or seeking assistance."
            
        # Check code generation counts
        if (agent_type == "command" and 
            current_counts.get("code_generations", 0) >= max_iterations.get("code_generations", 10)):
            return True, f"Too many code generations ({max_iterations.get('code_generations', 10)}). Suggest pausing to organize thoughts."
            
        # Check QA round counts
        if (agent_type == "general" and 
            current_counts.get("question_rounds", 0) >= max_iterations.get("question_rounds", 20)):
            return True, f"Too many QA rounds ({max_iterations.get('question_rounds', 20)}). Consider summarizing progress."
            
        return False, ""
        
    def _get_avoided_approaches(self) -> List[str]:
        """Return a list of approaches that previously failed and should be avoided."""
        if not self.agent_memory:
            return []
            
        situation = self.agent_memory.get("situation_tracking", {})
        debug_attempts = situation.get("debug_attempts", {})
        return debug_attempts.get("failed_approaches", [])
        
    def _get_working_solutions(self) -> Dict[str, str]:
        """Return previously effective solutions for reference."""
        if not self.agent_memory:
            return {}
            
        patterns = self.agent_memory.get("learned_patterns", {})
        return patterns.get("effective_solutions", {})
        
    def _get_user_preferences(self) -> Dict[str, Any]:
        """Return user preferences if any are stored in memory."""
        if not self.agent_memory:
            return {}
            
        patterns = self.agent_memory.get("learned_patterns", {})
        return patterns.get("user_preferences", {})
        
    def _get_user_intent(self) -> Dict[str, Any]:
        """Return user intent observations collected in memory."""
        if not self.agent_memory:
            return {}
            
        return self.agent_memory.get("user_intent_observations", {})

    def _get_background_knowledge(self) -> str:
        """Construct background knowledge string from workflow and memory."""
        # From workflow context
        workflow_bg = self.workflow_context.get("background_knowledge", "")

        # From agent memory
        memory_bg = ""
        if self.agent_memory:
            patterns = self.agent_memory.get("learned_patterns", {})
            domain_knowledge = patterns.get("domain_knowledge", [])
            if domain_knowledge:
                memory_bg = "Learned knowledge: " + "; ".join(domain_knowledge[:5])

        # Merge
        combined_bg = []
        if workflow_bg:
            combined_bg.append(workflow_bg)
        if memory_bg:
            combined_bg.append(memory_bg)

        return " | ".join(combined_bg)

    def _get_things_to_know(self) -> str:
        """Construct a contextual 'things to know' string for the prompt."""
        # From workflow context
        workflow_info = self.workflow_context.get("things_to_know", "")

        # From current context
        context_info = ""
        if self.current_context:
            current_stage = self.current_context.get("current_stage", "")
            current_step = self.current_context.get("current_step", "")
            if current_stage and current_step:
                context_info = f"Currently in stage: {current_stage}, step: {current_step}"

        # Merge
        combined_info = []
        if workflow_info:
            combined_info.append(workflow_info)
        if context_info:
            combined_info.append(context_info)

        return " | ".join(combined_info)
        
    def _build_memory_aware_prompt(self) -> str:
        """Build a memory-aware system prompt using FoKn framework."""
        # 使用FoKn框架构建高质量提示词
        self.fokn.set_base_description("You are a AI assistant can answer any question and write documentation writer behind the easy-notebook.")
        
        # 设置Agent角色
        self.fokn.add_role(self.role)
        
        # 设置基本能力
        enabled_abilities = self.ability.get_enabled_abilities()
        if enabled_abilities:
            for ability_name in enabled_abilities:
                # 检查是否是动态能力
                ability_details = self.ability.get_ability_details(ability_name)
                if ability_details:
                    # 使用动态能力的描述
                    capability_desc = ability_details.get("capability_description", "")
                    if capability_desc:
                        self.fokn.add_tool(f"{ability_name}: {capability_desc}")
                    else:
                        self.fokn.add_tool(f"You can {ability_name.replace('_', ' ')}")
                else:
                    # 使用默认格式处理预定义能力
                    self.fokn.add_tool(f"You can {ability_name.replace('_', ' ')}")
        
        # 添加标准能力
        self.fokn.add_tool("You can draw a picture or create a video.") \
               .add_tool("You can write python code.") \
               .add_tool("You can execute the code, notice the code must be python code, and add <call-execute> immediately after the <add-code> tag.") \
               .add_tool("You can write documentation to explain the code.") \
               .add_tool("You can write documentation to explain the picture or video.") \
               .add_tool("You can write documentation to finish the user's request.") \
               .add_tool("You can directly answer the user's question.") \
               .add_tool("You can communicate with other agents.") \
               .add_tool("You can ask for help from other agents.")
        
        # 设置行为政策
        self.fokn.add_policy("You must follow the user's instruction.") \
               .add_policy("You couldn't explain the prompt in your answer, and you must use the tag to express your answer, and must not use tag without tool call.")
        
        # 设置完整的输出格式要求
        self.fokn.add_output_format("<update-title>Update the title of the notebook</update-title>") \
               .add_output_format("<new-chapter>The name of the new chapter</new-chapter>") \
               .add_output_format("<new-section>The name of the new section</new-section>") \
               .add_output_format("<add-text>Display text to user in documentation(be careful, this tag would not be used in the answer,and you could not use the title markdown in this tag)</add-text>") \
               .add_output_format('<add-code language="python">the code you want to write, only python code is supported!!</add-code>') \
               .add_output_format("<thinking>Show reasoning process. if unnecessary, you needn't to use this tag.</thinking>") \
               .add_output_format('<call-execute event="name">if you need run and get code result immediately use this tag.</call-execute>') \
               .add_output_format('<get-variable variable="name" default="value"/>') \
               .add_output_format('<set-variable variable="name" value="value" type="str"/>') \
               .add_output_format('<remember type="insight">Important information</remember>') \
               .add_output_format('<update-todo action="add" event="next">things you need to do</update-todo>') \
               .add_output_format("<answer>your answer to the user's question, notice this tag would not be used in the documentation</answer>") \
               .add_output_format("<draw-image>must be a prompt to draw a picture, you can use this tag to draw a picture, you needn't to write any code or documentation in this tag</draw-image>") \
               .add_output_format("<create-video>must be a prompt to create a video, you can use this tag to create a video, you needn't to write any code or documentation in this tag</create-video>") \
               .add_output_format('<communicate to="the other agent name">the message you want to send to the other agent, maybe about this job or insight you get</communicate>') \
               .add_output_format('<ask-for-help to="the other agent name">if you need help, you can use this tag to ask the other agent to do this job, you must give more details about the problem you are facing and the thing you suppose to do</ask-for-help>')
        
        # 添加动态能力的XML输出格式
        for ability_name in enabled_abilities:
            ability_details = self.ability.get_ability_details(ability_name)
            if ability_details and ability_details.get("xml_tag_name"):
                xml_spec = self.get_ability_xml_spec(ability_name)
                if xml_spec:
                    format_description = f"[{ability_name}] {xml_spec}"
                    self.fokn.add_output_format(format_description)
        
        # 设置Agent通信
        self.fokn.add_available_agent("text-to-image", "who can draw a complex picture or video, if you need to draw a picture with single reference, you can call this agent") \
               .add_available_agent("text-to-video", "who can create a video, if you need to create a video, you can call this agent")
        
        # 添加工作流信息
        if self.available_workflows:
            workflows_info = f"Available workflows: {', '.join(self.available_workflows)}"
            self.fokn.add_context(workflows_info)
        
        # 添加背景知识
        background_knowledge = self._get_background_knowledge()
        if background_knowledge:
            self.fokn.add_domain_knowledge(background_knowledge)
        
        # 添加当前上下文
        things_to_know = self._get_things_to_know()
        if things_to_know:
            self.fokn.add_context(things_to_know)
        
        # 生成高质量提示词
        base_prompt = self.fokn.generate_high_quality_prompt()

        # Add abilities info
        enabled_abilities = self.ability.get_enabled_abilities()
        if enabled_abilities:
            ability_info = f"\n\n## Your Current Abilities\nYou have the following special abilities enabled:\n"
            ability_info += "\n".join([f"- {ability}" for ability in enabled_abilities])
            base_prompt += ability_info

        if not self.agent_memory:
            return base_prompt

        # Add memory context
        memory_context = []
        
        # 1) User intent
        intent_obs = self._get_user_intent()
        stated_goals = intent_obs.get("stated_goals", [])
        if stated_goals:
            memory_context.append(f"Stated user goals: {', '.join(stated_goals)}")
            
        progress_markers = intent_obs.get("progress_markers", {})
        blocked_on = progress_markers.get("blocked_on", [])
        if blocked_on:
            memory_context.append(f"Current blockers: {', '.join(blocked_on)}")
            
        current_focus = progress_markers.get("current_focus", "")
        if current_focus:
            memory_context.append(f"Current focus: {current_focus}")
            
        # 2) Avoid previously failed approaches
        failed_approaches = self._get_avoided_approaches()
        if failed_approaches:
            memory_context.append(f"Avoid approaches that failed previously: {', '.join(failed_approaches)}")
            
        # 3) Reference successful solutions
        working_solutions = self._get_working_solutions()
        if working_solutions:
            solutions_text = ", ".join([f"{k}: {v}" for k, v in list(working_solutions.items())[:3]])
            memory_context.append(f"Reference solutions: {solutions_text}")
            
        # 4) User preferences
        user_prefs = self._get_user_preferences()
        preferred_libs = user_prefs.get("preferred_libraries", [])
        if preferred_libs:
            memory_context.append(f"Preferred libraries: {', '.join(preferred_libs[:5])}")
            
        explanation_detail = user_prefs.get("explanation_detail", "")
        if explanation_detail:
            memory_context.append(f"Preferred explanation detail: {explanation_detail}")
            
        # 5) Version info
        if self.agent_memory:
            situation = self.agent_memory.get("situation_tracking", {})
            code_evolution = situation.get("code_evolution", {})
            working_versions = code_evolution.get("working_versions", [])
            if working_versions:
                memory_context.append("Historical working versions exist; consider rollback to a stable version when needed")
                
        # 6) Termination reminder
        should_terminate, terminate_reason = self._should_terminate()
        if should_terminate:
            memory_context.append(f"Important warning: {terminate_reason}")
            
        if memory_context:
            enhanced_prompt = f"""{base_prompt}

Based on history and current situation:
{chr(10).join(['- ' + ctx for ctx in memory_context])}

Please avoid repeating failed attempts and prioritize proven approaches. Follow warnings if any are present."""
            return enhanced_prompt
            
        return base_prompt
        
    def _build_system_messages(self) -> List[Dict[str, str]]:
        """Build system messages using memory-aware prompt with guardrails."""
        # Check termination
        should_terminate, terminate_reason = self._should_terminate()
        if should_terminate:
            return [{
                "role": "system", 
                "content": f"The task has reached its limit: {terminate_reason}. Please summarize the current issue and suggest next steps instead of continuing."
            }]
            
        # 使用记忆感知的提示词
        memory_aware_prompt = self._build_memory_aware_prompt()
        return [{"role": "system", "content": memory_aware_prompt}]
        
    def _add_user_message(self, content: str):
        """Append user message."""
        self.messages.append({"role": "user", "content": content})
        
    def _create_response_json(self, response_type: str, data: Dict[str, Any]) -> str:
        """Create newline-delimited JSON for streaming."""
        return json.dumps({
            "type": response_type,
            "data": data
        }) + "\n"

    def can_update_workflow(self) -> bool:
        """Whether this agent can update workflow."""
        return self.ability.has_ability("update_workflow")

    def can_manage_steps(self) -> bool:
        """Whether this agent can manage steps."""
        return self.ability.has_ability("arrange_step") or self.ability.has_ability("step_update")

    def can_create_plans(self) -> bool:
        """Whether this agent can create plans."""
        return self.ability.has_ability("create_plan")

    def can_manage_todos(self) -> bool:
        """Whether this agent can manage TODOs."""
        return self.ability.has_ability("manage_todo")

    def get_workflow_capabilities(self) -> Dict[str, bool]:
        """Return workflow-related capability map."""
        return {
            "update_workflow": self.can_update_workflow(),
            "manage_steps": self.can_manage_steps(),
            "create_plans": self.can_create_plans(),
            "manage_todos": self.can_manage_todos(),
            "workflow_analysis": self.ability.has_ability("workflow_analysis")
        }

    def add_ability(self, ability_name: str, capability_description: str = "",
                   xml_tag_name: str = "", xml_attributes: dict = None,
                   xml_content_structure: str = "", detailed_explanation: str = "",
                   is_self_closing: bool = False) -> 'Agent':
        """
        为智能体添加新的能力，同时更新Ability实例和FoKn框架。
        
        Args:
            ability_name: 能力名称
            capability_description: 能力描述  
            xml_tag_name: XML标签名称
            xml_attributes: XML属性字典
            xml_content_structure: XML内容结构
            detailed_explanation: 详细说明
            is_self_closing: 是否为自闭合标签
            
        Returns:
            Self for method chaining
            
        Example:
            agent.add_ability(
                ability_name="Data Analysis",
                capability_description="Analyze datasets and generate statistical summaries",
                xml_tag_name="analysis_result",
                xml_attributes={"type": "statistical", "format": "structured"},
                xml_content_structure="summary: string, statistics: object, insights: array",
                detailed_explanation="This ability performs comprehensive data analysis..."
            )
        """
        # 添加到Ability实例
        self.ability.add_ability(
            ability_name=ability_name,
            capability_description=capability_description,
            xml_tag_name=xml_tag_name,
            xml_attributes=xml_attributes,
            xml_content_structure=xml_content_structure,
            detailed_explanation=detailed_explanation,
            is_self_closing=is_self_closing
        )
        
        # 添加到FoKn框架
        self.fokn.add_ability(
            ability_name=ability_name,
            capability_description=capability_description,
            xml_tag_name=xml_tag_name,
            xml_attributes=xml_attributes,
            xml_content_structure=xml_content_structure,
            detailed_explanation=detailed_explanation,
            is_self_closing=is_self_closing
        )
        
        return self

    def get_ability_xml_spec(self, ability_name: str) -> Optional[str]:
        """
        获取指定能力的XML规范。
        
        Args:
            ability_name: 能力名称
            
        Returns:
            XML规范字符串，如果能力不存在则返回None
        """
        ability_details = self.ability.get_ability_details(ability_name)
        if not ability_details:
            return None
            
        xml_tag_name = ability_details.get("xml_tag_name", "")
        if not xml_tag_name:
            return None
            
        xml_attributes = ability_details.get("xml_attributes", {})
        xml_content_structure = ability_details.get("xml_content_structure", "")
        is_self_closing = ability_details.get("is_self_closing", False)
        
        # 构建XML标签规范
        tag_spec = f"<{xml_tag_name}"
        
        # 添加属性
        if xml_attributes:
            attr_parts = []
            for key, value in xml_attributes.items():
                attr_parts.append(f'{key}="{value}"')
            if attr_parts:
                tag_spec += f" {' '.join(attr_parts)}"
        
        # 处理自闭合标签
        if is_self_closing:
            tag_spec += " />"
        else:
            tag_spec += ">"
            if xml_content_structure:
                tag_spec += f"\n  Content Structure: {xml_content_structure}\n"
            tag_spec += f"</{xml_tag_name}>"
            
        return tag_spec

    def list_dynamic_abilities(self) -> List[Dict[str, Any]]:
        """
        列出所有动态添加的能力及其详细信息。
        
        Returns:
            包含能力信息的字典列表
        """
        dynamic_abilities = []
        for ability_name in self.ability._dynamic_abilities:
            ability_details = self.ability.get_ability_details(ability_name)
            if ability_details:
                xml_spec = self.get_ability_xml_spec(ability_name)
                dynamic_abilities.append({
                    "name": ability_name,
                    "capability_description": ability_details.get("capability_description", ""),
                    "xml_specification": xml_spec,
                    "detailed_explanation": ability_details.get("detailed_explanation", "")
                })
        return dynamic_abilities

    def _process_workflow_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        action_type = action.get("type", "")

        # 检查workflow更新权限
        if action_type == "update_workflow":
            if not self.can_update_workflow():
                return {
                    "type": "error",
                    "payload": {
                        "error": "Agent does not have workflow update capability",
                        "original_action": action
                    }
                }
            # 添加agent信息到payload
            payload = action.get("payload", {})
            payload["agent_id"] = getattr(self, "agent_id", "unknown")
            payload["agent_capabilities"] = self.get_workflow_capabilities()
            action["payload"] = payload

        # 检查step更新权限
        elif action_type == "update_workflow_step":
            if not self.can_manage_steps():
                return {
                    "type": "error",
                    "payload": {
                        "error": "Agent does not have step management capability",
                        "original_action": action
                    }
                }
            # 添加agent信息到payload
            payload = action.get("payload", {})
            payload["agent_id"] = getattr(self, "agent_id", "unknown")
            action["payload"] = payload

        # 检查计划创建权限
        elif action_type == "create_workflow_plan":
            if not self.can_create_plans():
                return {
                    "type": "error",
                    "payload": {
                        "error": "Agent does not have plan creation capability",
                        "original_action": action
                    }
                }
            # 添加workflow上下文信息
            payload = action.get("payload", {})
            payload["available_workflows"] = self.available_workflows
            payload["current_context"] = self.current_context
            action["payload"] = payload

        # 检查TODO管理权限
        elif action_type == "add_todo_item":
            if not self.can_manage_todos():
                return {
                    "type": "error",
                    "payload": {
                        "error": "Agent does not have TODO management capability",
                        "original_action": action
                    }
                }

        return action
    
    async def stream_response(self, query: str) -> AsyncGenerator[str, None]:
        """
        Streaming response: parse LLM XML-like output into frontend JSON events.
        Args:
            query (str): User query content.
        Yields:
            str: JSON lines consumable by the frontend stream handler.
        """
        try:
            # Build system messages
            messages = self._build_system_messages()
            
            self.logger.debug(f"Starting stream response for query: {query[:80]}...")
            
            # Fetch LLM output via async streaming
            chunk_count = 0
            async for chunk in self.query_stream_async(
                prompt_sys=messages[0]["content"], 
                prompt_user=query
            ):
                chunk_count += 1
                self.logger.debug(f"Received chunk {chunk_count}: '{chunk[:60]}...'")
                
                # Handle stream error
                if chunk.startswith("ASYNC_STREAM_ERROR:"):
                    yield json.dumps({
                        "type": "error",
                        "payload": {"error": chunk}
                    }) + "\n"
                    continue
                
                # Parse XML-like tags using Token-based parser only
                actions = self.parse_chunk(chunk)

                # Emit parsed actions with workflow post-processing
                for action in actions:
                    processed_action = self._process_workflow_action(action) if isinstance(action, dict) else action
                    self.logger.debug(f"Parser output: {processed_action}")
                    yield json.dumps(processed_action) + "\n"
            
            self.logger.info(f"Stream completed, processed {chunk_count} chunks")
            
            # Flush remaining buffered content via Token-based parser
            final_actions = self.finalize()
            for action in final_actions:
                processed_action = self._process_workflow_action(action) if isinstance(action, dict) else action
                yield json.dumps(processed_action) + "\n"
                
        except Exception as e:
            self.logger.exception(f"Stream error: {str(e)}")
            yield json.dumps({
                "type": "error", 
                "payload": {"error": f"Stream response error: {str(e)}"}
            }) + "\n"

    def _create_action_from_tag(self, behavior: Behavior, tag_name: str, content: str, attributes: Dict[str, str]) -> Behavior:
        """
        根据XML标签创建对应的Behavior操作

        Args:
            behavior: Behavior实例
            tag_name: XML标签名称
            content: 标签内容
            attributes: 标签属性字典

        Returns:
            更新后的Behavior实例
        """
        if tag_name == "update-title":
            return behavior.update_title(content)

        elif tag_name == "new-chapter":
            return behavior.new_chapter(content)

        elif tag_name == "new-section":
            return behavior.new_section(content)

        elif tag_name == "add-text":
            return behavior.add_text(content)

        elif tag_name == "add-code":
            language = attributes.get("language", "python")
            metadata = {"language": language} if language != "python" else None
            return behavior.add_code(content, metadata=metadata)
        
        # elif tag_name == "execute-code":
        #     return behavior.exe_code_cli(codecell_id=attributes.get("codecell_id", "lastAddedCellId"))
        
        # elif tag_name == "execute-code-cli":
        #     return behavior.exe_code_cli(codecell_id=attributes.get("codecell_id", "lastAddedCellId"))
       
        elif tag_name == "thinking":
            return behavior.is_thinking(customText=content)

        elif tag_name == "call-execute":
            event_name = attributes.get("event", "")
            if event_name:
                behavior.push_todo(event_name)
            return behavior.exec_code()

        elif tag_name == "get-variable":
            variable_name = attributes.get("variable", "")
            default_value = attributes.get("default", "")
            if variable_name:
                value = behavior.get_variable(variable_name, default_value)
                if content:
                    return behavior.add_text(f"{content}: {value}")
            return behavior

        elif tag_name == "set-variable":
            variable_name = attributes.get("variable", "")
            value = attributes.get("value", content)
            if variable_name:
                return behavior.add_variable(variable_name, value)
            return behavior

        elif tag_name == "remember":
            remember_type = attributes.get("type", "insight")
            memory_key = f"memory_{remember_type}"
            current_memory = behavior.get_variable(memory_key, "")
            new_memory = f"{current_memory}\n{content}" if current_memory else content
            return behavior.add_variable(memory_key, new_memory)

        elif tag_name == "update-todo":
            action = attributes.get("action", "add")
            event = attributes.get("event", "")
            if action == "add" and event:
                return behavior.push_todo(event)
            elif action == "next" and event:
                return behavior.next_event(event)
            return behavior

        elif tag_name == "answer":
            return behavior.add_text(content).finish_thinking()

        elif tag_name == "draw-image":
            return behavior.generate_image(content)

        elif tag_name == "create-video":
            return behavior.generate_video(content)

        elif tag_name == "communicate":
            target_agent = attributes.get("to", "")
            return behavior.comunicate_with_agent(target_agent,content)

        else:
            return behavior.add_text(f"[{tag_name}] {content}")

