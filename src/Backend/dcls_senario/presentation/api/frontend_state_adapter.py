"""
前端状态管理适配器
Frontend State Management Adapter

This module provides the bridge between the stateless backend and the frontend's
state management requirements, particularly for preserving agent thinking processes
and workflow context.
"""

from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import json
import logging

from domain.interfaces import AgentResult
from application.workflow.workflow_controller import WorkflowState, FlowControlDecision


@dataclass
class AgentThinkingState:
    """Agent思考状态"""
    agent_name: str
    thinking_text: str
    thinking_steps: List[str]
    start_time: str
    completion_time: Optional[str] = None
    is_complete: bool = False
    intermediate_thoughts: List[str] = None
    confidence_level: float = 0.0
    metadata: Dict[str, Any] = None


@dataclass
class StepExecutionState:
    """步骤执行状态"""
    step_id: str
    stage_id: str
    step_name: str
    start_time: str
    completion_time: Optional[str] = None
    status: str = "not_started"  # not_started, in_progress, completed, failed
    agent_result: Optional[Dict[str, Any]] = None
    user_inputs: Dict[str, Any] = None
    agent_thinking: Optional[AgentThinkingState] = None
    execution_logs: List[str] = None
    retry_count: int = 0


@dataclass
class WorkflowFrontendState:
    """工作流前端状态"""
    workflow_id: str
    session_start_time: str
    last_update_time: str
    current_stage: str
    current_step: str
    completed_steps: List[str]
    completed_stages: List[str]
    step_states: Dict[str, StepExecutionState]
    agent_conversations: Dict[str, List[Dict[str, Any]]]
    user_preferences: Dict[str, Any]
    ui_state: Dict[str, Any]
    cached_results: Dict[str, Any]
    error_history: List[Dict[str, Any]]


class FrontendStateAdapter:
    """
    前端状态管理适配器
    
    Features:
    1. 管理agent思考状态的持久化
    2. 维护工作流执行上下文
    3. 提供前端状态同步接口
    4. 支持状态的序列化和反序列化
    5. 处理状态迁移和版本兼容性
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._state_version = "1.0"
    
    def create_initial_frontend_state(
        self, 
        workflow_id: str, 
        user_context: Dict[str, Any]
    ) -> WorkflowFrontendState:
        """创建初始前端状态"""
        
        current_time = datetime.now().isoformat()
        
        return WorkflowFrontendState(
            workflow_id=workflow_id,
            session_start_time=current_time,
            last_update_time=current_time,
            current_stage="stage_0",
            current_step="step_1",
            completed_steps=[],
            completed_stages=[],
            step_states={},
            agent_conversations={},
            user_preferences=user_context.get("user_preferences", {}),
            ui_state={
                "current_view": "workflow",
                "sidebar_collapsed": False,
                "theme": "light",
                "language": "zh-CN"
            },
            cached_results={},
            error_history=[]
        )
    
    def update_agent_thinking_state(
        self,
        frontend_state: WorkflowFrontendState,
        agent_name: str,
        thinking_text: str = "",
        thinking_steps: List[str] = None,
        is_complete: bool = False,
        confidence_level: float = 0.0
    ) -> WorkflowFrontendState:
        """更新agent思考状态"""
        
        current_time = datetime.now().isoformat()
        step_key = f"{frontend_state.current_stage}_{frontend_state.current_step}"
        
        # 获取或创建步骤状态
        if step_key not in frontend_state.step_states:
            frontend_state.step_states[step_key] = StepExecutionState(
                step_id=frontend_state.current_step,
                stage_id=frontend_state.current_stage,
                step_name=f"Stage {frontend_state.current_stage} Step {frontend_state.current_step}",
                start_time=current_time,
                status="in_progress",
                execution_logs=[]
            )
        
        step_state = frontend_state.step_states[step_key]
        
        # 更新或创建思考状态
        if step_state.agent_thinking is None:
            step_state.agent_thinking = AgentThinkingState(
                agent_name=agent_name,
                thinking_text=thinking_text,
                thinking_steps=thinking_steps or [],
                start_time=current_time,
                intermediate_thoughts=[],
                metadata={}
            )
        else:
            step_state.agent_thinking.thinking_text = thinking_text
            if thinking_steps:
                step_state.agent_thinking.thinking_steps = thinking_steps
            if thinking_text and not is_complete:
                step_state.agent_thinking.intermediate_thoughts.append(
                    f"[{current_time}] {thinking_text}"
                )
        
        # 更新完成状态
        if is_complete:
            step_state.agent_thinking.is_complete = True
            step_state.agent_thinking.completion_time = current_time
            step_state.agent_thinking.confidence_level = confidence_level
        
        # 更新最后修改时间
        frontend_state.last_update_time = current_time
        
        self.logger.debug(f"Updated agent thinking state for {agent_name} in {step_key}")
        return frontend_state
    
    def update_step_execution_state(
        self,
        frontend_state: WorkflowFrontendState,
        agent_result: AgentResult,
        user_inputs: Dict[str, Any] = None
    ) -> WorkflowFrontendState:
        """更新步骤执行状态"""
        
        current_time = datetime.now().isoformat()
        step_key = f"{frontend_state.current_stage}_{frontend_state.current_step}"
        
        # 获取或创建步骤状态
        if step_key not in frontend_state.step_states:
            frontend_state.step_states[step_key] = StepExecutionState(
                step_id=frontend_state.current_step,
                stage_id=frontend_state.current_stage,
                step_name=f"Stage {frontend_state.current_stage} Step {frontend_state.current_step}",
                start_time=current_time,
                status="in_progress",
                execution_logs=[]
            )
        
        step_state = frontend_state.step_states[step_key]
        
        # 更新执行结果
        step_state.agent_result = {
            "success": agent_result.success,
            "data": agent_result.data,
            "message": agent_result.message,
            "execution_time": agent_result.execution_time,
            "tokens_used": agent_result.tokens_used,
            "cost": agent_result.cost,
            "metadata": agent_result.metadata,
            "timestamp": current_time
        }
        
        # 更新用户输入
        if user_inputs:
            step_state.user_inputs = user_inputs
        
        # 更新状态
        if agent_result.success:
            step_state.status = "completed"
            step_state.completion_time = current_time
        else:
            step_state.status = "failed"
            step_state.retry_count += 1
            
            # 记录错误
            error_record = {
                "timestamp": current_time,
                "step_id": frontend_state.current_step,
                "stage_id": frontend_state.current_stage,
                "error_message": agent_result.message,
                "error_data": agent_result.data if not agent_result.success else None,
                "retry_count": step_state.retry_count
            }
            frontend_state.error_history.append(error_record)
        
        # 添加执行日志
        log_entry = f"[{current_time}] Agent execution {'successful' if agent_result.success else 'failed'}: {agent_result.message}"
        step_state.execution_logs.append(log_entry)
        
        # 缓存重要结果
        if agent_result.success and agent_result.data:
            cache_key = f"{frontend_state.current_stage}_{frontend_state.current_step}_result"
            frontend_state.cached_results[cache_key] = {
                "data": agent_result.data,
                "timestamp": current_time,
                "step_info": {
                    "stage_id": frontend_state.current_stage,
                    "step_id": frontend_state.current_step
                }
            }
        
        # 更新最后修改时间
        frontend_state.last_update_time = current_time
        
        self.logger.info(f"Updated step execution state for {step_key}: {step_state.status}")
        return frontend_state
    
    def update_workflow_position(
        self,
        frontend_state: WorkflowFrontendState,
        flow_decision: FlowControlDecision
    ) -> WorkflowFrontendState:
        """根据流程决策更新工作流位置"""
        
        current_time = datetime.now().isoformat()
        
        # 记录当前步骤为已完成（如果适用）
        if flow_decision.decision.value in ["proceed_to_next_step", "proceed_to_next_stage"]:
            current_step_key = f"{frontend_state.current_stage}_{frontend_state.current_step}"
            if current_step_key not in frontend_state.completed_steps:
                frontend_state.completed_steps.append(current_step_key)
        
        # 更新当前位置
        if flow_decision.next_stage_id:
            # 如果进入新的stage，记录当前stage为完成
            if (flow_decision.next_stage_id != frontend_state.current_stage and 
                frontend_state.current_stage not in frontend_state.completed_stages):
                frontend_state.completed_stages.append(frontend_state.current_stage)
            
            frontend_state.current_stage = flow_decision.next_stage_id
        
        if flow_decision.next_step_id:
            frontend_state.current_step = flow_decision.next_step_id
        
        # 更新UI状态以反映新的位置
        frontend_state.ui_state.update({
            "current_stage": frontend_state.current_stage,
            "current_step": frontend_state.current_step,
            "last_flow_decision": flow_decision.decision.value,
            "decision_timestamp": current_time,
            "decision_confidence": flow_decision.confidence,
            "decision_reasons": flow_decision.reasons
        })
        
        frontend_state.last_update_time = current_time
        
        self.logger.info(f"Updated workflow position: {frontend_state.current_stage}/{frontend_state.current_step}")
        return frontend_state
    
    def add_agent_conversation(
        self,
        frontend_state: WorkflowFrontendState,
        agent_name: str,
        message_type: str,  # "user", "agent", "system"
        content: str,
        metadata: Dict[str, Any] = None
    ) -> WorkflowFrontendState:
        """添加agent对话记录"""
        
        current_time = datetime.now().isoformat()
        
        # 初始化对话历史
        if agent_name not in frontend_state.agent_conversations:
            frontend_state.agent_conversations[agent_name] = []
        
        # 添加对话记录
        conversation_entry = {
            "timestamp": current_time,
            "message_type": message_type,
            "content": content,
            "step_context": {
                "stage_id": frontend_state.current_stage,
                "step_id": frontend_state.current_step
            },
            "metadata": metadata or {}
        }
        
        frontend_state.agent_conversations[agent_name].append(conversation_entry)
        
        # 限制对话历史长度
        max_history = 100
        if len(frontend_state.agent_conversations[agent_name]) > max_history:
            frontend_state.agent_conversations[agent_name] = \
                frontend_state.agent_conversations[agent_name][-max_history:]
        
        frontend_state.last_update_time = current_time
        
        self.logger.debug(f"Added conversation entry for {agent_name}: {message_type}")
        return frontend_state
    
    def update_user_preferences(
        self,
        frontend_state: WorkflowFrontendState,
        preferences: Dict[str, Any]
    ) -> WorkflowFrontendState:
        """更新用户偏好设置"""
        
        frontend_state.user_preferences.update(preferences)
        frontend_state.last_update_time = datetime.now().isoformat()
        
        self.logger.debug("Updated user preferences")
        return frontend_state
    
    def get_state_summary(self, frontend_state: WorkflowFrontendState) -> Dict[str, Any]:
        """获取状态摘要（用于API响应）"""
        
        # 计算进度统计
        total_steps = len(frontend_state.step_states)
        completed_steps = len([s for s in frontend_state.step_states.values() if s.status == "completed"])
        failed_steps = len([s for s in frontend_state.step_states.values() if s.status == "failed"])
        
        # 获取当前步骤的思考状态
        current_step_key = f"{frontend_state.current_stage}_{frontend_state.current_step}"
        current_thinking = None
        if current_step_key in frontend_state.step_states:
            step_state = frontend_state.step_states[current_step_key]
            if step_state.agent_thinking:
                current_thinking = {
                    "agent_name": step_state.agent_thinking.agent_name,
                    "thinking_text": step_state.agent_thinking.thinking_text,
                    "is_complete": step_state.agent_thinking.is_complete,
                    "confidence_level": step_state.agent_thinking.confidence_level
                }
        
        return {
            "workflow_id": frontend_state.workflow_id,
            "session_duration": self._calculate_session_duration(frontend_state),
            "current_position": {
                "stage": frontend_state.current_stage,
                "step": frontend_state.current_step
            },
            "progress": {
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "failed_steps": failed_steps,
                "completion_percentage": (completed_steps / total_steps * 100) if total_steps > 0 else 0
            },
            "current_thinking": current_thinking,
            "recent_errors": frontend_state.error_history[-3:],  # 最近3个错误
            "ui_state": frontend_state.ui_state,
            "state_version": self._state_version,
            "last_update": frontend_state.last_update_time
        }
    
    def serialize_state(self, frontend_state: WorkflowFrontendState) -> str:
        """序列化前端状态为JSON"""
        try:
            state_dict = asdict(frontend_state)
            state_dict["_version"] = self._state_version
            return json.dumps(state_dict, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"Error serializing frontend state: {str(e)}")
            raise
    
    def deserialize_state(self, state_json: str) -> WorkflowFrontendState:
        """从JSON反序列化前端状态"""
        try:
            state_dict = json.loads(state_json)
            
            # 检查版本兼容性
            version = state_dict.pop("_version", "1.0")
            if version != self._state_version:
                self.logger.warning(f"State version mismatch: {version} vs {self._state_version}")
                # 这里可以添加版本迁移逻辑
            
            # 重建嵌套对象
            step_states = {}
            for key, step_data in state_dict.get("step_states", {}).items():
                # 重建AgentThinkingState
                thinking_data = step_data.get("agent_thinking")
                if thinking_data:
                    step_data["agent_thinking"] = AgentThinkingState(**thinking_data)
                
                step_states[key] = StepExecutionState(**step_data)
            
            state_dict["step_states"] = step_states
            
            return WorkflowFrontendState(**state_dict)
            
        except Exception as e:
            self.logger.error(f"Error deserializing frontend state: {str(e)}")
            raise
    
    def create_state_checkpoint(
        self, 
        frontend_state: WorkflowFrontendState
    ) -> Dict[str, Any]:
        """创建状态检查点（用于恢复）"""
        
        return {
            "checkpoint_time": datetime.now().isoformat(),
            "workflow_id": frontend_state.workflow_id,
            "current_position": {
                "stage": frontend_state.current_stage,
                "step": frontend_state.current_step
            },
            "completed_steps": frontend_state.completed_steps.copy(),
            "completed_stages": frontend_state.completed_stages.copy(),
            "cached_results": frontend_state.cached_results.copy(),
            "user_preferences": frontend_state.user_preferences.copy(),
            "ui_state": frontend_state.ui_state.copy(),
            "session_start_time": frontend_state.session_start_time,
            "state_version": self._state_version
        }
    
    def restore_from_checkpoint(
        self,
        checkpoint: Dict[str, Any],
        current_state: WorkflowFrontendState
    ) -> WorkflowFrontendState:
        """从检查点恢复状态"""
        
        # 恢复关键状态信息
        current_state.current_stage = checkpoint["current_position"]["stage"]
        current_state.current_step = checkpoint["current_position"]["step"]
        current_state.completed_steps = checkpoint["completed_steps"]
        current_state.completed_stages = checkpoint["completed_stages"]
        current_state.cached_results.update(checkpoint["cached_results"])
        current_state.user_preferences.update(checkpoint["user_preferences"])
        current_state.ui_state.update(checkpoint["ui_state"])
        
        current_state.last_update_time = datetime.now().isoformat()
        
        self.logger.info(f"Restored state from checkpoint: {checkpoint['checkpoint_time']}")
        return current_state
    
    def _calculate_session_duration(self, frontend_state: WorkflowFrontendState) -> str:
        """计算会话持续时间"""
        try:
            start_time = datetime.fromisoformat(frontend_state.session_start_time)
            current_time = datetime.now()
            duration = current_time - start_time
            
            hours, remainder = divmod(duration.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            
            return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
        except Exception:
            return "00:00:00"
    
    def cleanup_old_state_data(
        self, 
        frontend_state: WorkflowFrontendState, 
        max_age_hours: int = 24
    ) -> WorkflowFrontendState:
        """清理过期的状态数据"""
        
        current_time = datetime.now()
        cutoff_time = current_time.timestamp() - (max_age_hours * 3600)
        
        # 清理过期的执行日志
        for step_state in frontend_state.step_states.values():
            if step_state.execution_logs:
                step_state.execution_logs = step_state.execution_logs[-50:]  # 保留最近50条
        
        # 清理过期的错误历史
        frontend_state.error_history = [
            error for error in frontend_state.error_history[-20:]  # 保留最近20个错误
        ]
        
        # 清理过期的对话历史
        for agent_name in frontend_state.agent_conversations:
            frontend_state.agent_conversations[agent_name] = \
                frontend_state.agent_conversations[agent_name][-100:]  # 每个agent保留100条对话
        
        frontend_state.last_update_time = datetime.now().isoformat()
        
        self.logger.debug("Cleaned up old state data")
        return frontend_state


def create_frontend_state_adapter() -> FrontendStateAdapter:
    """创建前端状态管理适配器实例"""
    return FrontendStateAdapter()