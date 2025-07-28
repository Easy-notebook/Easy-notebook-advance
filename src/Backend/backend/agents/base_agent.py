import os
import json
from typing import AsyncGenerator, List, Dict, Any, Tuple
from abc import ABC, abstractmethod
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

class BaseAgentTemplate(ABC):
    """
    基础Agent模板类，定义Agent的通用结构和接口，支持记忆功能
    """
    
    def __init__(self, 
                 operation: Dict[str, Any] = None,
                 api_key: str = None,
                 base_url: str = None,
                 engine: str = "gpt-4o",
                 role: str = "You are AI Agent behind easyremote notebook.") -> None:
        """
        初始化Agent模板
        """
        self.operation = operation or {}
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.base_url = base_url or os.getenv('BASE_URL')
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        self.engine = engine
        self.role = role
        self.messages: List[Dict[str, str]] = []
        self.payload = self.operation.get("payload", {})
        self.status = "pending"
        
        # 解析记忆和上下文
        self.agent_memory = self._parse_agent_memory()
        self.current_context = self._parse_current_context()
        
    def _get_payload_value(self, key: str, default=None):
        """获取payload中的值"""
        return self.payload.get(key, default)
        
    def _parse_agent_memory(self) -> Dict[str, Any]:
        """解析Agent记忆"""
        return self.payload.get("agent_memory", {})
        
    def _parse_current_context(self) -> Dict[str, Any]:
        """解析当前上下文"""
        return self.payload.get("current_context", {})
        
    def _should_terminate(self) -> Tuple[bool, str]:
        """检查是否应该终止（防止无限循环）"""
        if not self.agent_memory:
            return False, ""
            
        termination = self.agent_memory.get("termination_conditions", {})
        current_counts = termination.get("current_counts", {})
        max_iterations = termination.get("max_iterations", {})
        
        agent_type = self.agent_memory.get("agent_type", "")
        
        # 检查debug循环次数
        if (agent_type == "debug" and 
            current_counts.get("debug_cycles", 0) >= max_iterations.get("debug_cycles", 5)):
            return True, f"已达到最大debug尝试次数({max_iterations.get('debug_cycles', 5)})，建议换个思路或寻求帮助"
            
        # 检查代码生成次数
        if (agent_type == "command" and 
            current_counts.get("code_generations", 0) >= max_iterations.get("code_generations", 10)):
            return True, f"已生成太多代码版本({max_iterations.get('code_generations', 10)})，建议暂停整理思路"
            
        # 检查问答次数
        if (agent_type == "general" and 
            current_counts.get("question_rounds", 0) >= max_iterations.get("question_rounds", 20)):
            return True, f"问答轮次过多({max_iterations.get('question_rounds', 20)})，建议总结当前进展"
            
        return False, ""
        
    def _get_avoided_approaches(self) -> List[str]:
        """获取应该避免的方法"""
        if not self.agent_memory:
            return []
            
        situation = self.agent_memory.get("situation_tracking", {})
        debug_attempts = situation.get("debug_attempts", {})
        return debug_attempts.get("failed_approaches", [])
        
    def _get_working_solutions(self) -> Dict[str, str]:
        """获取之前有效的解决方案"""
        if not self.agent_memory:
            return {}
            
        patterns = self.agent_memory.get("learned_patterns", {})
        return patterns.get("effective_solutions", {})
        
    def _get_user_preferences(self) -> Dict[str, Any]:
        """获取用户偏好"""
        if not self.agent_memory:
            return {}
            
        patterns = self.agent_memory.get("learned_patterns", {})
        return patterns.get("user_preferences", {})
        
    def _get_user_intent(self) -> Dict[str, Any]:
        """获取用户意图信息"""
        if not self.agent_memory:
            return {}
            
        return self.agent_memory.get("user_intent_observations", {})
        
    def _build_memory_aware_prompt(self) -> str:
        """构建包含记忆信息的提示词"""
        base_prompt = self.role
        
        if not self.agent_memory:
            return base_prompt
            
        # 添加记忆上下文
        memory_context = []
        
        # 1. 用户意图理解
        intent_obs = self._get_user_intent()
        stated_goals = intent_obs.get("stated_goals", [])
        if stated_goals:
            memory_context.append(f"用户明确目标: {', '.join(stated_goals)}")
            
        progress_markers = intent_obs.get("progress_markers", {})
        blocked_on = progress_markers.get("blocked_on", [])
        if blocked_on:
            memory_context.append(f"当前阻塞: {', '.join(blocked_on)}")
            
        current_focus = progress_markers.get("current_focus", "")
        if current_focus:
            memory_context.append(f"当前焦点: {current_focus}")
            
        # 2. 避免重复失败的方法
        failed_approaches = self._get_avoided_approaches()
        if failed_approaches:
            memory_context.append(f"避免以下已尝试失败的方法: {', '.join(failed_approaches)}")
            
        # 3. 参考之前成功的解决方案
        working_solutions = self._get_working_solutions()
        if working_solutions:
            solutions_text = ", ".join([f"{k}: {v}" for k, v in list(working_solutions.items())[:3]])  # 只显示前3个
            memory_context.append(f"可参考的成功方案: {solutions_text}")
            
        # 4. 用户偏好
        user_prefs = self._get_user_preferences()
        preferred_libs = user_prefs.get("preferred_libraries", [])
        if preferred_libs:
            memory_context.append(f"用户偏好的库: {', '.join(preferred_libs[:5])}")  # 只显示前5个
            
        explanation_detail = user_prefs.get("explanation_detail", "")
        if explanation_detail:
            memory_context.append(f"用户偏好的解释详细度: {explanation_detail}")
            
        # 5. 版本信息
        if self.agent_memory:
            situation = self.agent_memory.get("situation_tracking", {})
            code_evolution = situation.get("code_evolution", {})
            working_versions = code_evolution.get("working_versions", [])
            if working_versions:
                memory_context.append("存在历史工作版本，必要时可建议回滚到稳定版本")
                
        # 6. 终止条件提醒
        should_terminate, terminate_reason = self._should_terminate()
        if should_terminate:
            memory_context.append(f"重要警告: {terminate_reason}")
            
        if memory_context:
            enhanced_prompt = f"""{base_prompt}

基于历史记忆和当前情况:
{chr(10).join(['- ' + ctx for ctx in memory_context])}

请基于以上信息，避免重复失败的尝试，优先使用已证明有效的方法。如果遇到警告提示，请按照警告指示行动。"""
            return enhanced_prompt
            
        return base_prompt
        
    def _build_system_messages(self) -> List[Dict[str, str]]:
        """构建系统消息（使用记忆感知的提示词）"""
        # 检查是否需要终止
        should_terminate, terminate_reason = self._should_terminate()
        if should_terminate:
            return [{
                "role": "system", 
                "content": f"任务已达到限制: {terminate_reason}。请总结当前问题并建议下一步行动，而不是继续当前操作。"
            }]
            
        # 使用记忆感知的提示词
        memory_aware_prompt = self._build_memory_aware_prompt()
        return [{"role": "system", "content": memory_aware_prompt}]
        
    def _add_user_message(self, content: str):
        """添加用户消息"""
        self.messages.append({"role": "user", "content": content})
        
    def _create_response_json(self, response_type: str, data: Dict[str, Any]) -> str:
        """创建响应JSON"""
        return json.dumps({
            "type": response_type,
            "data": data
        }) + "\n"
        
    @abstractmethod
    async def process(self) -> AsyncGenerator[str, None]:
        """抽象方法：处理Agent逻辑"""
        pass
        
    @abstractmethod
    def validate_operation(self) -> bool:
        """抽象方法：验证操作参数"""
        pass