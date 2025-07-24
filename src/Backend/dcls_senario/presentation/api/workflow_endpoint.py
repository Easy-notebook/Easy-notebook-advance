"""
工作流API端点 - 将新的工作流服务与现有的前端协议集成
"""

from typing import Dict, Any, Optional
from flask import request, jsonify
import logging
import time
from datetime import datetime

from application.workflow.workflow_service import WorkflowService
from presentation.api.step_template_adapter import AgentStepBuilder, create_step_template_from_agent_result
from presentation.api.frontend_state_adapter import FrontendStateAdapter, WorkflowFrontendState
from shared.di_container import DIContainer
from shared.utils.context_manager import context_manager


class WorkflowEndpoint:
    """
    工作流API端点 - 提供后端驱动的工作流管理API
    
    Features:
    1. 与现有StepTemplate协议兼容
    2. 支持后端决策的step/stage流转
    3. 维护前端状态管理
    4. 提供无状态API接口
    """
    
    def __init__(self, di_container: DIContainer):
        self.workflow_service = WorkflowService(di_container)
        self.frontend_state_adapter = FrontendStateAdapter()
        self.logger = logging.getLogger(__name__)
        
        # 存储活跃的前端状态（内存中临时存储）
        self._frontend_states = {}
    
    def create_workflow_session(self) -> Dict[str, Any]:
        """
        创建新的工作流会话
        
        POST /api/workflow/create
        Body: {
            "user_context": {
                "problem_description": str,
                "context_description": str,
                "dataset_path": str,
                "user_preferences": {}
            },
            "initial_inputs": {}
        }
        """
        try:
            data = request.get_json()
            user_context = data.get('user_context', {})
            initial_inputs = data.get('initial_inputs', {})
            
            # 创建工作流会话
            session_data = self.workflow_service.create_workflow_session(
                user_context=user_context,
                initial_inputs=initial_inputs
            )
            
            # 创建前端状态管理
            workflow_id = session_data["workflow_id"]
            frontend_state = self.frontend_state_adapter.create_initial_frontend_state(
                workflow_id=workflow_id,
                user_context=user_context
            )
            self._frontend_states[workflow_id] = frontend_state
            
            # 构建符合StepTemplate协议的响应
            step_data = {
                "step_id": session_data["current_step"],
                "stage_id": session_data["current_stage"],
                "step_name": session_data["step_info"]["step_name"],
                "workflow_id": session_data["workflow_id"]
            }
            
            state = {
                "workflow_session": session_data,
                "current_inputs": session_data["required_inputs"],
                "backend_driven": True,
                "stateless_mode": True
            }
            
            # 使用StepTemplate适配器创建响应
            builder = AgentStepBuilder(step_data, state)
            
            # 更新前端状态 - 添加初始思考状态
            self.frontend_state_adapter.update_agent_thinking_state(
                frontend_state=frontend_state,
                agent_name="工作流管理器",
                thinking_text="初始化DCLS工作流...",
                thinking_steps=["创建会话", "配置环境", "准备执行"],
                is_complete=False
            )
            
            builder.adapter.add_agent_thinking(
                agent_name="工作流管理器",
                thinking_text="初始化DCLS工作流...",
                text_array=["创建会话", "配置环境", "准备执行"]
            )
            
            # 完成思考并更新前端状态
            self.frontend_state_adapter.update_agent_thinking_state(
                frontend_state=frontend_state,
                agent_name="工作流管理器",
                thinking_text="工作流会话创建完成",
                is_complete=True,
                confidence_level=1.0
            )
            
            builder.adapter.finish_agent_thinking("工作流会话创建完成")
            builder.adapter.template.add_text(
                f"**🚀 DCLS工作流已启动**\n\n"
                f"**会话ID:** {session_data['workflow_id']}\n"
                f"**当前阶段:** {session_data['current_stage']}\n"
                f"**当前步骤:** {session_data['step_info']['step_name']}\n\n"
                f"**下一步操作:**\n"
                f"请提供以下输入开始执行：\n" +
                "\n".join([f"- {inp}" for inp in session_data["required_inputs"]])
            )
            
            response = builder.build()
            
            # 压缩响应数据以避免传输过长内容
            state_summary = self.frontend_state_adapter.get_state_summary(frontend_state)
            if context_manager.should_compress(state_summary):
                state_summary = context_manager.compress_context(state_summary)
            
            response.update({
                "workflow_control": {
                    "workflow_id": session_data["workflow_id"],
                    "backend_driven": True,
                    "next_endpoint": "/api/workflow/execute_step",
                    "session_data": session_data
                },
                "frontend_state_management": {
                    "state_summary": state_summary,
                    "agent_thinking_preserved": True,
                    "stateless_backend": True,
                    "state_checkpoint": self.frontend_state_adapter.create_state_checkpoint(frontend_state),
                    "context_compressed": context_manager.should_compress(state_summary)
                }
            })
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error creating workflow session: {str(e)}")
            return {
                "error": True,
                "message": f"工作流会话创建失败: {str(e)}",
                "details": str(e)
            }
    
    def execute_workflow_step(self) -> Dict[str, Any]:
        """
        执行工作流步骤
        
        POST /api/workflow/execute_step
        Body: {
            "workflow_id": str,
            "step_inputs": {
                "input_key": "input_value"
            },
            "frontend_state": {
                "agent_thinking_history": [],
                "ui_state": {},
                "user_interactions": []
            }
        }
        """
        try:
            data = request.get_json()
            workflow_id = data.get('workflow_id')
            step_inputs = data.get('step_inputs', {})
            incoming_frontend_state = data.get('frontend_state', {})
            
            if not workflow_id:
                return {"error": True, "message": "workflow_id is required"}
            
            # 压缩传入的前端状态以避免上下文过长
            if context_manager.should_compress(incoming_frontend_state):
                self.logger.info(f"Compressing frontend state, original size: {context_manager.estimate_context_size(incoming_frontend_state)}")
                incoming_frontend_state = context_manager.compress_context(incoming_frontend_state)
                self.logger.info(f"Compressed frontend state size: {context_manager.estimate_context_size(incoming_frontend_state)}")
            
            # 获取并更新前端状态
            frontend_state = self._frontend_states.get(workflow_id)
            if not frontend_state:
                return {"error": True, "message": "Frontend state not found for workflow"}
            
            # 更新用户偏好（如果有提供）
            if incoming_frontend_state.get('user_preferences'):
                self.frontend_state_adapter.update_user_preferences(
                    frontend_state, 
                    incoming_frontend_state['user_preferences']
                )
            
            # 执行工作流步骤
            execution_result = self.workflow_service.execute_step(
                workflow_id=workflow_id,
                step_inputs=step_inputs,
                frontend_state=incoming_frontend_state
            )
            
            # 为完成的阶段创建总结
            if execution_result.get("flow_decision") == "proceed_to_next_stage":
                current_stage = execution_result.get("current_stage")
                if current_stage:
                    stage_summary = context_manager.create_stage_summary(
                        stage_id=current_stage,
                        step_results=execution_result.get("step_results", {}),
                        agent_history=incoming_frontend_state.get("agent_thinking_history", [])
                    )
                    # 将总结添加到前端状态
                    frontend_state.stage_summaries = getattr(frontend_state, 'stage_summaries', {})
                    frontend_state.stage_summaries[current_stage] = stage_summary
            
            if execution_result.get("status") == "error":
                # 记录错误到前端状态
                if execution_result.get("agent_result"):
                    from domain.interfaces import AgentResult
                    error_result = AgentResult(
                        success=False,
                        data={"error": execution_result.get("error", "Unknown error")},
                        message=execution_result.get("error", "Unknown error"),
                        execution_time=0,
                        tokens_used=0,
                        cost=0,
                        metadata={"error": True}
                    )
                    self.frontend_state_adapter.update_step_execution_state(
                        frontend_state, error_result, step_inputs
                    )
                
                return self._create_error_step_template(execution_result, frontend_state)
            
            # 更新前端状态 - 记录执行结果
            if execution_result.get("agent_result"):
                agent_result_data = execution_result["agent_result"]
                from domain.interfaces import AgentResult
                agent_result = AgentResult(
                    success=agent_result_data["success"],
                    data=agent_result_data["data"],
                    message=agent_result_data["message"],
                    execution_time=agent_result_data["execution_time"],
                    tokens_used=agent_result_data["tokens_used"],
                    cost=agent_result_data.get("cost", 0),
                    metadata=agent_result_data["metadata"]
                )
                
                # 更新步骤执行状态
                self.frontend_state_adapter.update_step_execution_state(
                    frontend_state, agent_result, step_inputs
                )
                
                # 更新工作流位置
                if execution_result.get("flow_decision"):
                    from application.workflow.workflow_controller import FlowControlDecision, FlowDecision
                    flow_decision = FlowControlDecision(
                        decision=FlowDecision(execution_result["flow_decision"]),
                        next_step_id=execution_result["next_action"].get("next_step"),
                        next_stage_id=execution_result["next_action"].get("next_stage"),
                        required_inputs=execution_result["next_action"].get("required_inputs", []),
                        reasons=execution_result.get("reasons", []),
                        confidence=execution_result.get("confidence", 0.0),
                        metadata={}
                    )
                    
                    self.frontend_state_adapter.update_workflow_position(
                        frontend_state, flow_decision
                    )
            
            # 转换为StepTemplate格式
            return self._convert_execution_result_to_step_template(execution_result, frontend_state)
            
        except Exception as e:
            self.logger.error(f"Error executing workflow step: {str(e)}")
            return {
                "error": True,
                "message": f"工作流步骤执行失败: {str(e)}",
                "details": str(e)
            }
    
    def get_workflow_status(self) -> Dict[str, Any]:
        """
        获取工作流状态
        
        GET /api/workflow/status?workflow_id=<id>
        """
        try:
            workflow_id = request.args.get('workflow_id')
            if not workflow_id:
                return {"error": True, "message": "workflow_id parameter is required"}
            
            status = self.workflow_service.get_workflow_status(workflow_id)
            
            if "error" in status:
                return status
            
            # 格式化为前端友好的格式
            return {
                "workflow_id": workflow_id,
                "status": status["status"],
                "progress": status["progress"],
                "current_step": status["step_info"],
                "execution_history": status["execution_history"],
                "frontend_state": status["frontend_state"],
                "backend_driven": True,
                "timestamps": {
                    "created_at": status["created_at"],
                    "last_updated": status["last_updated"]
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting workflow status: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def pause_workflow(self) -> Dict[str, Any]:
        """
        暂停工作流
        
        POST /api/workflow/pause
        Body: {"workflow_id": str}
        """
        try:
            data = request.get_json()
            workflow_id = data.get('workflow_id')
            
            if not workflow_id:
                return {"error": True, "message": "workflow_id is required"}
            
            result = self.workflow_service.pause_workflow(workflow_id)
            return result
            
        except Exception as e:
            self.logger.error(f"Error pausing workflow: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def resume_workflow(self) -> Dict[str, Any]:
        """
        恢复工作流
        
        POST /api/workflow/resume
        Body: {
            "workflow_id": str,
            "resume_data": {}
        }
        """
        try:
            data = request.get_json()
            workflow_id = data.get('workflow_id')
            resume_data = data.get('resume_data', {})
            
            if not workflow_id:
                return {"error": True, "message": "workflow_id is required"}
            
            result = self.workflow_service.resume_workflow(workflow_id, resume_data)
            return result
            
        except Exception as e:
            self.logger.error(f"Error resuming workflow: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def cleanup_workflow(self) -> Dict[str, Any]:
        """
        清理工作流会话
        
        DELETE /api/workflow/cleanup?workflow_id=<id>
        """
        try:
            workflow_id = request.args.get('workflow_id')
            if not workflow_id:
                return {"error": True, "message": "workflow_id parameter is required"}
            
            # 清理后端工作流
            result = self.workflow_service.cleanup_workflow(workflow_id)
            
            # 清理前端状态
            if workflow_id in self._frontend_states:
                del self._frontend_states[workflow_id]
                result["frontend_state_cleaned"] = True
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error cleaning up workflow: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def sync_frontend_state(self) -> Dict[str, Any]:
        """
        同步前端状态
        
        POST /api/workflow/sync_state
        Body: {
            "workflow_id": str,
            "frontend_state": {}
        }
        """
        try:
            data = request.get_json()
            workflow_id = data.get('workflow_id')
            incoming_state = data.get('frontend_state', {})
            
            if not workflow_id:
                return {"error": True, "message": "workflow_id is required"}
            
            # 获取当前前端状态
            frontend_state = self._frontend_states.get(workflow_id)
            if not frontend_state:
                return {"error": True, "message": "Frontend state not found"}
            
            # 更新用户偏好和UI状态
            if 'user_preferences' in incoming_state:
                self.frontend_state_adapter.update_user_preferences(
                    frontend_state, incoming_state['user_preferences']
                )
            
            if 'ui_state' in incoming_state:
                frontend_state.ui_state.update(incoming_state['ui_state'])
                frontend_state.last_update_time = datetime.now().isoformat()
            
            return {
                "workflow_id": workflow_id,
                "sync_status": "success",
                "state_summary": self.frontend_state_adapter.get_state_summary(frontend_state),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error syncing frontend state: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def export_frontend_state(self) -> Dict[str, Any]:
        """
        导出前端状态（用于备份或迁移）
        
        GET /api/workflow/export_state?workflow_id=<id>
        """
        try:
            workflow_id = request.args.get('workflow_id')
            if not workflow_id:
                return {"error": True, "message": "workflow_id parameter is required"}
            
            frontend_state = self._frontend_states.get(workflow_id)
            if not frontend_state:
                return {"error": True, "message": "Frontend state not found"}
            
            # 序列化状态
            state_json = self.frontend_state_adapter.serialize_state(frontend_state)
            
            return {
                "workflow_id": workflow_id,
                "export_status": "success",
                "state_data": state_json,
                "export_time": datetime.now().isoformat(),
                "state_version": "1.0"
            }
            
        except Exception as e:
            self.logger.error(f"Error exporting frontend state: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def get_workflow_template(self) -> Dict[str, Any]:
        """
        获取工作流模板配置
        
        GET /api/workflow/template?type=<template_type>
        """
        try:
            template_type = request.args.get('type', 'data_analysis')
            
            # Get template from config
            from app.core.config import STAGES
            
            # Convert STAGES config to template format
            template = {
                "id": "dcls_data_analysis_workflow",
                "name": "DCLS Data Analysis Workflow",
                "description": "Complete data science lifecycle workflow",
                "version": "1.0",
                "stages": []
            }
            
            # Convert each stage to template format
            for stage_id, stage_config in STAGES.items():
                stage_template = {
                    "id": stage_id,
                    "name": stage_config["title"],
                    "description": stage_config["description"],
                    "steps": []
                }
                
                # Convert steps
                for step in stage_config["steps"]:
                    step_template = {
                        "id": step["id"],
                        "name": step["title"],
                        "description": step.get("description", ""),
                        "step_id": step["stepId"]
                    }
                    stage_template["steps"].append(step_template)
                
                template["stages"].append(stage_template)
            
            return {
                "status": "success",
                "template": template,
                "template_type": template_type
            }
            
        except Exception as e:
            self.logger.error(f"Error getting workflow template: {str(e)}")
            return {
                "error": True,
                "message": f"Failed to get workflow template: {str(e)}",
                "details": str(e)
            }

    def import_frontend_state(self) -> Dict[str, Any]:
        """
        导入前端状态（用于恢复）
        
        POST /api/workflow/import_state
        Body: {
            "workflow_id": str,
            "state_data": str
        }
        """
        try:
            data = request.get_json()
            workflow_id = data.get('workflow_id')
            state_data = data.get('state_data')
            
            if not workflow_id or not state_data:
                return {"error": True, "message": "workflow_id and state_data are required"}
            
            # 反序列化状态
            frontend_state = self.frontend_state_adapter.deserialize_state(state_data)
            
            # 验证workflow_id匹配
            if frontend_state.workflow_id != workflow_id:
                return {"error": True, "message": "Workflow ID mismatch in state data"}
            
            # 存储恢复的状态
            self._frontend_states[workflow_id] = frontend_state
            
            return {
                "workflow_id": workflow_id,
                "import_status": "success",
                "state_summary": self.frontend_state_adapter.get_state_summary(frontend_state),
                "import_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error importing frontend state: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def create_state_checkpoint(self) -> Dict[str, Any]:
        """
        创建状态检查点
        
        POST /api/workflow/create_checkpoint
        Body: {"workflow_id": str}
        """
        try:
            data = request.get_json()
            workflow_id = data.get('workflow_id')
            
            if not workflow_id:
                return {"error": True, "message": "workflow_id is required"}
            
            frontend_state = self._frontend_states.get(workflow_id)
            if not frontend_state:
                return {"error": True, "message": "Frontend state not found"}
            
            # 创建检查点
            checkpoint = self.frontend_state_adapter.create_state_checkpoint(frontend_state)
            
            return {
                "workflow_id": workflow_id,
                "checkpoint_created": True,
                "checkpoint_data": checkpoint,
                "checkpoint_time": checkpoint["checkpoint_time"]
            }
            
        except Exception as e:
            self.logger.error(f"Error creating state checkpoint: {str(e)}")
            return {"error": True, "message": str(e)}
    
    def _convert_execution_result_to_step_template(self, execution_result: Dict[str, Any], frontend_state: WorkflowFrontendState) -> Dict[str, Any]:
        """将工作流执行结果转换为StepTemplate格式"""
        
        # 提取关键信息
        workflow_id = execution_result["workflow_id"]
        agent_result = execution_result["agent_result"]
        flow_decision = execution_result["flow_decision"]
        next_action = execution_result["next_action"]
        progress = execution_result["progress"]
        
        # 构建step_data
        step_data = {
            "workflow_id": workflow_id,
            "flow_decision": flow_decision,
            "progress": progress
        }
        
        # 构建state
        state = {
            "workflow_execution_result": execution_result,
            "frontend_state_management": execution_result["frontend_state_management"],
            "backend_driven": True
        }
        
        # 使用AgentStepBuilder创建响应
        builder = AgentStepBuilder(step_data, state)
        
        # 根据执行结果类型选择展示方式
        if agent_result["success"]:
            # 成功执行
            self._add_successful_execution_to_builder(builder, agent_result, next_action)
        else:
            # 执行失败
            self._add_failed_execution_to_builder(builder, agent_result)
        
        # 添加流程控制信息
        self._add_flow_control_to_builder(builder, flow_decision, next_action, progress)
        
        response = builder.build()
        
        # 添加工作流控制信息
        response.update({
            "workflow_control": {
                "workflow_id": workflow_id,
                "flow_decision": flow_decision,
                "next_action": next_action,
                "progress": progress,
                "workflow_complete": execution_result["workflow_complete"],
                "backend_driven": True,
                "next_endpoint": "/api/workflow/execute_step" if not execution_result["workflow_complete"] else None
            },
            "frontend_state_management": {
                "state_summary": self.frontend_state_adapter.get_state_summary(frontend_state),
                "agent_thinking_preserved": True,
                "stateless_backend": True,
                "step_execution_recorded": True,
                "workflow_position_updated": True,
                "state_checkpoint": self.frontend_state_adapter.create_state_checkpoint(frontend_state)
            }
        })
        
        return response
    
    def _add_successful_execution_to_builder(
        self, 
        builder: AgentStepBuilder, 
        agent_result: Dict[str, Any], 
        next_action: Dict[str, Any]
    ):
        """为成功执行添加内容到builder"""
        
        # 开始agent执行
        current_step_name = next_action.get("step_info", {}).get("step_name", "当前步骤")
        builder.start_agent_execution("DCLS Agent", current_step_name)
        
        # 添加执行结果
        if "code" in agent_result["data"]:
            # 如果有生成的代码，添加代码展示
            builder.add_code_execution(
                code=agent_result["data"]["code"],
                description=agent_result["message"],
                event_tag=f"step_execution_{int(time.time())}",
                auto_debug=True
            )
        elif "analysis" in agent_result["data"] or "summary" in agent_result["data"]:
            # 如果是分析结果，使用分析展示
            from domain.interfaces import AgentResult
            result_obj = AgentResult(
                success=agent_result["success"],
                data=agent_result["data"],
                message=agent_result["message"],
                execution_time=agent_result["execution_time"],
                tokens_used=agent_result["tokens_used"],
                cost=0,
                metadata=agent_result["metadata"]
            )
            builder.add_analysis_step(result_obj)
        else:
            # 通用结果展示
            builder.adapter.template.add_text(
                f"**✅ {agent_result['message']}**\n\n" +
                self._format_agent_data(agent_result["data"])
            )
        
        builder.adapter.finish_agent_thinking("步骤执行完成")
    
    def _add_failed_execution_to_builder(self, builder: AgentStepBuilder, agent_result: Dict[str, Any]):
        """为失败执行添加内容到builder"""
        builder.start_agent_execution("DCLS Agent", "处理错误")
        builder.adapter.template.add_text(
            f"**❌ 执行失败**\n\n"
            f"**错误信息:** {agent_result['message']}\n\n"
            f"**错误详情:** {agent_result.get('data', {}).get('error', '未知错误')}"
        )
        builder.adapter.finish_agent_thinking("错误处理完成")
    
    def _add_flow_control_to_builder(
        self, 
        builder: AgentStepBuilder, 
        flow_decision: str, 
        next_action: Dict[str, Any],
        progress: Dict[str, Any]
    ):
        """添加流程控制信息到builder"""
        
        # 添加进度信息
        overall_progress = progress.get("overall_progress", 0.0)
        builder.adapter.template.add_text(
            f"**📊 工作流进度: {overall_progress:.1%}**\n"
        )
        
        # 添加下一步指引
        if flow_decision == "proceed_to_next_step":
            step_info = next_action.get("step_info", {})
            builder.adapter.template.add_text(
                f"**➡️ 准备执行下一步骤**\n\n"
                f"**步骤名称:** {step_info.get('step_name', '')}\n"
                f"**需要输入:** {', '.join(next_action.get('required_inputs', []))}\n\n"
                f"系统将自动继续执行下一步骤。"
            )
        elif flow_decision == "proceed_to_next_stage":
            step_info = next_action.get("step_info", {})
            builder.adapter.template.add_text(
                f"**🎯 进入下一阶段**\n\n"
                f"**新阶段:** {next_action.get('next_stage', '')}\n"
                f"**首个步骤:** {step_info.get('step_name', '')}\n"
                f"**需要输入:** {', '.join(next_action.get('required_inputs', []))}\n\n"
                f"系统将自动开始新阶段的执行。"
            )
        elif flow_decision == "require_user_input":
            builder.adapter.template.add_text(
                f"**⏸️ 需要用户输入**\n\n"
                f"请提供以下信息以继续执行：\n" +
                "\n".join([f"- {inp}" for inp in next_action.get('required_inputs', [])])
            )
        elif flow_decision == "complete_workflow":
            builder.adapter.template.add_text(
                f"**🎉 工作流执行完成！**\n\n"
                f"所有步骤已成功完成。您可以查看执行结果和生成的报告。"
            )
        elif flow_decision == "handle_error":
            builder.adapter.template.add_text(
                f"**⚠️ 需要错误处理**\n\n"
                f"系统遇到问题，需要手动干预或重新配置。"
            )
    
    def _format_agent_data(self, data: Dict[str, Any]) -> str:
        """格式化agent数据为显示文本"""
        if not data:
            return "无数据返回"
        
        formatted = ""
        for key, value in data.items():
            if key == "error":
                continue
            formatted += f"**{key}:** {str(value)[:200]}{'...' if len(str(value)) > 200 else ''}\n"
        
        return formatted
    
    def _create_error_step_template(self, error_result: Dict[str, Any], frontend_state: WorkflowFrontendState = None) -> Dict[str, Any]:
        """创建错误的StepTemplate响应"""
        step_data = {"error": True}
        state = {"error_details": error_result}
        
        builder = AgentStepBuilder(step_data, state)
        builder.start_agent_execution("错误处理", "处理执行错误")
        builder.adapter.template.add_text(
            f"**❌ 工作流执行错误**\n\n"
            f"**错误信息:** {error_result.get('error', '未知错误')}\n\n"
            f"请检查输入参数或联系技术支持。"
        )
        builder.adapter.finish_agent_thinking("错误处理完成")
        
        response = builder.build()
        response.update({
            "workflow_control": {
                "error": True,
                "error_details": error_result,
                "backend_driven": True
            },
            "frontend_state_management": {
                "error_recorded": True,
                "stateless_backend": True,
                "state_summary": self.frontend_state_adapter.get_state_summary(frontend_state) if frontend_state else None,
                "state_checkpoint": self.frontend_state_adapter.create_state_checkpoint(frontend_state) if frontend_state else None
            }
        })
        
        return response


def register_workflow_routes(app, di_container: DIContainer):
    """注册工作流路由"""
    workflow_endpoint = WorkflowEndpoint(di_container)
    
    # 核心工作流操作
    @app.route('/api/workflow/create', methods=['POST'])
    def create_workflow_session():
        return jsonify(workflow_endpoint.create_workflow_session())
    
    @app.route('/api/workflow/execute_step', methods=['POST'])
    def execute_workflow_step():
        return jsonify(workflow_endpoint.execute_workflow_step())
    
    @app.route('/api/workflow/status', methods=['GET'])
    def get_workflow_status():
        return jsonify(workflow_endpoint.get_workflow_status())
    
    @app.route('/api/workflow/pause', methods=['POST'])
    def pause_workflow():
        return jsonify(workflow_endpoint.pause_workflow())
    
    @app.route('/api/workflow/resume', methods=['POST'])
    def resume_workflow():
        return jsonify(workflow_endpoint.resume_workflow())
    
    @app.route('/api/workflow/cleanup', methods=['DELETE'])
    def cleanup_workflow():
        return jsonify(workflow_endpoint.cleanup_workflow())
    
    # 前端状态管理操作
    @app.route('/api/workflow/sync_state', methods=['POST'])
    def sync_frontend_state():
        return jsonify(workflow_endpoint.sync_frontend_state())
    
    @app.route('/api/workflow/export_state', methods=['GET'])
    def export_frontend_state():
        return jsonify(workflow_endpoint.export_frontend_state())
    
    @app.route('/api/workflow/import_state', methods=['POST'])
    def import_frontend_state():
        return jsonify(workflow_endpoint.import_frontend_state())
    
    @app.route('/api/workflow/create_checkpoint', methods=['POST'])
    def create_state_checkpoint():
        return jsonify(workflow_endpoint.create_state_checkpoint())
    
    # Template endpoint
    @app.route('/api/workflow/template', methods=['GET'])
    def get_workflow_template():
        return jsonify(workflow_endpoint.get_workflow_template())