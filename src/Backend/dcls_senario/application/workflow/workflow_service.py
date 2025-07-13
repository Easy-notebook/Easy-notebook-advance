from typing import Dict, Any, List
import uuid
import time
from datetime import datetime
import logging

from application.workflow.workflow_controller import (
    IntelligentWorkflowController, WorkflowState, FlowControlDecision, 
    StepInfo, FlowDecision
)
from domain.interfaces import IAgent, AgentResult
from shared.di_container import DIContainer


class WorkflowExecutionContext:
    """工作流执行上下文 - 维护单次执行的状态"""
    
    def __init__(self, workflow_id: str, user_context: Dict[str, Any]):
        self.workflow_id = workflow_id
        self.user_context = user_context
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
        self.execution_history: List[Dict[str, Any]] = []
        self.frontend_state: Dict[str, Any] = {}  # 前端状态管理


class WorkflowService:
    """
    工作流服务 - 提供后端驱动的workflow管理
    
    Features:
    1. 管理workflow执行生命周期
    2. 协调agent执行和决策
    3. 维护前端状态管理接口
    4. 提供无状态API接口
    5. 支持工作流暂停和恢复
    """
    
    def __init__(self, di_container: DIContainer):
        self.di_container = di_container
        self.workflow_controller = IntelligentWorkflowController()
        self.logger = logging.getLogger(__name__)
        
        # 活动的工作流上下文（内存中临时存储）
        self._active_contexts: Dict[str, WorkflowExecutionContext] = {}
        
        self.logger.info("WorkflowService initialized")
    
    def create_workflow_session(
        self, 
        user_context: Dict[str, Any],
        initial_inputs: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        创建新的workflow会话
        
        Returns:
        - workflow_id: 会话ID
        - initial_state: 初始状态
        - next_action: 下一步操作指导
        """
        try:
            workflow_id = str(uuid.uuid4())
            
            # 创建执行上下文
            context = WorkflowExecutionContext(workflow_id, user_context)
            self._active_contexts[workflow_id] = context
            
            # 创建初始工作流状态
            initial_state = self.workflow_controller.create_initial_workflow_state()
            initial_state.workflow_metadata.update({
                "workflow_start_time": context.created_at.isoformat(),
                "workflow_id": workflow_id,
                "user_context": user_context
            })
            
            # 获取第一个step信息
            first_step = self.workflow_controller._get_step_info("stage_0", "step_1")
            
            session_data = {
                "workflow_id": workflow_id,
                "status": "created",
                "current_stage": initial_state.current_stage_id,
                "current_step": initial_state.current_step_id,
                "required_inputs": first_step.required_inputs if first_step else [],
                "step_info": {
                    "step_name": first_step.step_name if first_step else "",
                    "step_description": f"开始执行{first_step.step_name}" if first_step else "",
                    "expected_outputs": first_step.expected_outputs if first_step else []
                },
                "progress": self.workflow_controller.get_workflow_progress(initial_state),
                "created_at": context.created_at.isoformat()
            }
            
            self.logger.info(f"Created workflow session: {workflow_id}")
            return session_data
            
        except Exception as e:
            self.logger.error(f"Error creating workflow session: {str(e)}")
            raise
    
    def execute_step(
        self,
        workflow_id: str,
        step_inputs: Dict[str, Any],
        frontend_state: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        执行当前step并获取下一步决策
        
        这是核心方法，实现：
        1. 执行当前step的agent
        2. 分析结果并做出流程决策
        3. 更新工作流状态
        4. 返回前端所需的状态信息
        """
        try:
            context = self._active_contexts.get(workflow_id)
            if not context:
                raise ValueError(f"Workflow session not found: {workflow_id}")
            
            # 更新前端状态
            if frontend_state:
                context.frontend_state.update(frontend_state)
            
            # 获取当前工作流状态
            current_state = self._get_current_workflow_state(workflow_id)
            
            # 验证输入
            current_step = self.workflow_controller._get_step_info(
                current_state.current_stage_id, 
                current_state.current_step_id
            )
            
            if not current_step:
                raise ValueError(f"Invalid step: {current_state.current_step_id}")
            
            # 执行agent
            agent_result = self._execute_agent_for_step(current_step, step_inputs, context)
            
            # 更新执行历史
            self._update_execution_history(context, current_step, step_inputs, agent_result)
            
            # 分析结果并决策下一步
            flow_decision = self.workflow_controller.analyze_and_decide_next_action(
                current_state=current_state,
                latest_result=agent_result,
                context={"user_context": context.user_context, "frontend_state": context.frontend_state}
            )
            
            # 更新工作流状态
            updated_state = self._apply_flow_decision(current_state, flow_decision, agent_result)
            
            # 构建返回给前端的响应
            response = self._build_step_response(
                workflow_id=workflow_id,
                agent_result=agent_result,
                flow_decision=flow_decision,
                updated_state=updated_state,
                context=context
            )
            
            context.last_updated = datetime.now()
            
            self.logger.info(f"Step executed for workflow {workflow_id}: {flow_decision.decision.value}")
            return response
            
        except Exception as e:
            self.logger.error(f"Error executing step for workflow {workflow_id}: {str(e)}")
            return {
                "workflow_id": workflow_id,
                "status": "error",
                "error": str(e),
                "flow_decision": "handle_error",
                "agent_result": None,
                "next_action": {
                    "action": "handle_error",
                    "required_inputs": ["error_resolution"],
                    "step_info": {"step_name": "Error Handling", "step_description": "处理执行错误"}
                }
            }
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        获取工作流当前状态（无状态查询）
        """
        try:
            context = self._active_contexts.get(workflow_id)
            if not context:
                return {"error": "Workflow session not found", "workflow_id": workflow_id}
            
            current_state = self._get_current_workflow_state(workflow_id)
            progress = self.workflow_controller.get_workflow_progress(current_state)
            
            current_step = self.workflow_controller._get_step_info(
                current_state.current_stage_id,
                current_state.current_step_id
            )
            
            return {
                "workflow_id": workflow_id,
                "status": "active",
                "current_stage": current_state.current_stage_id,
                "current_step": current_state.current_step_id,
                "progress": progress,
                "step_info": {
                    "step_name": current_step.step_name if current_step else "",
                    "required_inputs": current_step.required_inputs if current_step else [],
                    "expected_outputs": current_step.expected_outputs if current_step else []
                },
                "execution_history": context.execution_history[-10:],  # 最近10次执行
                "frontend_state": context.frontend_state,
                "created_at": context.created_at.isoformat(),
                "last_updated": context.last_updated.isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting workflow status: {str(e)}")
            return {"error": str(e), "workflow_id": workflow_id}
    
    def pause_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """暂停工作流"""
        try:
            context = self._active_contexts.get(workflow_id)
            if not context:
                return {"error": "Workflow session not found"}
            
            # 保存当前状态到持久化存储（这里简化处理）
            current_state = self._get_current_workflow_state(workflow_id)
            
            return {
                "workflow_id": workflow_id,
                "status": "paused",
                "message": "Workflow paused successfully",
                "resume_info": {
                    "current_stage": current_state.current_stage_id,
                    "current_step": current_state.current_step_id,
                    "frontend_state": context.frontend_state
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error pausing workflow: {str(e)}")
            return {"error": str(e)}
    
    def resume_workflow(self, workflow_id: str, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """恢复工作流"""
        try:
            # 重新创建上下文（简化实现）
            if workflow_id not in self._active_contexts:
                user_context = resume_data.get("user_context", {})
                context = WorkflowExecutionContext(workflow_id, user_context)
                context.frontend_state = resume_data.get("frontend_state", {})
                self._active_contexts[workflow_id] = context
            
            return self.get_workflow_status(workflow_id)
            
        except Exception as e:
            self.logger.error(f"Error resuming workflow: {str(e)}")
            return {"error": str(e)}
    
    def cleanup_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """清理工作流会话"""
        try:
            if workflow_id in self._active_contexts:
                del self._active_contexts[workflow_id]
                return {"workflow_id": workflow_id, "status": "cleaned_up"}
            else:
                return {"workflow_id": workflow_id, "status": "not_found"}
                
        except Exception as e:
            self.logger.error(f"Error cleaning up workflow: {str(e)}")
            return {"error": str(e)}
    
    # Private helper methods
    
    def _execute_agent_for_step(
        self, 
        step: StepInfo, 
        inputs: Dict[str, Any], 
        context: WorkflowExecutionContext
    ) -> AgentResult:
        """为特定step执行对应的agent"""
        try:
            # 获取agent实例
            agent = self._get_agent_for_step(step)
            
            # 准备执行参数
            execution_params = {
                **inputs,
                "workflow_context": context.user_context,
                "step_context": {
                    "stage_id": step.stage_id,
                    "step_id": step.step_id,
                    "step_name": step.step_name
                }
            }
            
            # 执行agent
            start_time = time.time()
            result = agent.execute(execution_params)
            execution_time = time.time() - start_time
            
            # 更新执行时间
            if hasattr(result, 'execution_time'):
                result.execution_time = execution_time
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error executing agent for step {step.step_id}: {str(e)}")
            # 返回错误结果
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"Agent execution failed: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"step_id": step.step_id, "error": True}
            )
    
    def _get_agent_for_step(self, step: StepInfo) -> IAgent:
        """根据step获取对应的agent实例"""
        agent_type_mapping = {
            "ProblemDefinitionAgent": "problem_definition_agent",
            "DataAnalysisAgent": "analysis_agent",
            "DataCleaningAgent": "data_cleaning_agent",
            "PCSAgent": "pcs_agent",
            "PredictionAgent": "prediction_agent",
            "ResultsEvaluationAgent": "results_evaluation_agent",
            "ResultsCommunicationAgent": "results_communication_agent",
            "DataStructureAgent": "data_structure_agent",
            "GeneralAgent": "general_agent"
        }
        
        service_name = agent_type_mapping.get(step.agent_type)
        if not service_name:
            raise ValueError(f"Unknown agent type: {step.agent_type}")
        
        try:
            agent = self.di_container.get(service_name)
            return agent
        except Exception as e:
            self.logger.error(f"Failed to get agent {service_name}: {str(e)}")
            raise
    
    def _get_current_workflow_state(self, workflow_id: str) -> WorkflowState:
        """获取当前工作流状态"""
        context = self._active_contexts[workflow_id]
        
        # 从执行历史重建状态（简化实现）
        state = self.workflow_controller.create_initial_workflow_state()
        state.workflow_metadata["workflow_id"] = workflow_id
        state.workflow_metadata["user_context"] = context.user_context
        
        # 从执行历史更新状态
        for execution in context.execution_history:
            if execution.get("step_completed"):
                step_id = execution["step_id"]
                if step_id not in state.completed_steps:
                    state.completed_steps.append(step_id)
                
                # 更新当前位置
                if execution.get("next_step_id"):
                    state.current_step_id = execution["next_step_id"]
                if execution.get("next_stage_id"):
                    state.current_stage_id = execution["next_stage_id"]
                
                # 保存结果
                if execution.get("agent_result"):
                    state.step_results[step_id] = execution["agent_result"]
        
        return state
    
    def _apply_flow_decision(
        self, 
        current_state: WorkflowState, 
        decision: FlowControlDecision, 
        agent_result: AgentResult
    ) -> WorkflowState:
        """应用流程决策更新状态"""
        updated_state = current_state
        
        # 保存当前step结果
        updated_state.step_results[current_state.current_step_id] = agent_result
        
        # 根据决策更新状态
        if decision.decision == FlowDecision.PROCEED_TO_NEXT_STEP:
            if current_state.current_step_id not in updated_state.completed_steps:
                updated_state.completed_steps.append(current_state.current_step_id)
            if decision.next_step_id:
                updated_state.current_step_id = decision.next_step_id
        
        elif decision.decision == FlowDecision.PROCEED_TO_NEXT_STAGE:
            if current_state.current_step_id not in updated_state.completed_steps:
                updated_state.completed_steps.append(current_state.current_step_id)
            if current_state.current_stage_id not in updated_state.completed_stages:
                updated_state.completed_stages.append(current_state.current_stage_id)
            if decision.next_stage_id:
                updated_state.current_stage_id = decision.next_stage_id
            if decision.next_step_id:
                updated_state.current_step_id = decision.next_step_id
        
        elif decision.decision == FlowDecision.COMPLETE_WORKFLOW:
            if current_state.current_step_id not in updated_state.completed_steps:
                updated_state.completed_steps.append(current_state.current_step_id)
            if current_state.current_stage_id not in updated_state.completed_stages:
                updated_state.completed_stages.append(current_state.current_stage_id)
        
        return updated_state
    
    def _update_execution_history(
        self, 
        context: WorkflowExecutionContext, 
        step: StepInfo, 
        inputs: Dict[str, Any], 
        result: AgentResult
    ):
        """更新执行历史"""
        execution_record = {
            "timestamp": datetime.now().isoformat(),
            "stage_id": step.stage_id,
            "step_id": step.step_id,
            "step_name": step.step_name,
            "inputs": inputs,
            "agent_result": result,
            "success": result.success,
            "execution_time": result.execution_time,
            "tokens_used": result.tokens_used
        }
        
        context.execution_history.append(execution_record)
        
        # 保持历史记录数量限制
        if len(context.execution_history) > 100:
            context.execution_history = context.execution_history[-100:]
    
    def _build_step_response(
        self,
        workflow_id: str,
        agent_result: AgentResult,
        flow_decision: FlowControlDecision,
        updated_state: WorkflowState,
        context: WorkflowExecutionContext
    ) -> Dict[str, Any]:
        """构建返回给前端的step执行响应"""
        
        # 获取下一步信息
        next_step_info = {}
        if flow_decision.next_step_id and flow_decision.next_stage_id:
            next_step = self.workflow_controller._get_step_info(
                flow_decision.next_stage_id, 
                flow_decision.next_step_id
            )
            if next_step:
                next_step_info = {
                    "step_name": next_step.step_name,
                    "step_description": f"准备执行：{next_step.step_name}",
                    "required_inputs": next_step.required_inputs,
                    "expected_outputs": next_step.expected_outputs
                }
        
        response = {
            "workflow_id": workflow_id,
            "status": "success" if agent_result.success else "error",
            "agent_result": {
                "success": agent_result.success,
                "data": agent_result.data,
                "message": agent_result.message,
                "execution_time": agent_result.execution_time,
                "tokens_used": agent_result.tokens_used,
                "metadata": agent_result.metadata
            },
            "flow_decision": flow_decision.decision.value,
            "confidence": flow_decision.confidence,
            "reasons": flow_decision.reasons,
            "next_action": {
                "action": flow_decision.decision.value,
                "next_stage": flow_decision.next_stage_id,
                "next_step": flow_decision.next_step_id,
                "required_inputs": flow_decision.required_inputs,
                "step_info": next_step_info
            },
            "progress": self.workflow_controller.get_workflow_progress(updated_state),
            "workflow_complete": flow_decision.decision == FlowDecision.COMPLETE_WORKFLOW,
            "frontend_state_management": {
                "preserve_agent_thinking": True,
                "step_results_cache": agent_result.data,
                "execution_context": context.frontend_state
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return response