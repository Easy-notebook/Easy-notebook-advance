"""
智能工作流API端点
Intelligent Workflow API Endpoints

提供目标驱动的智能工作流服务接口
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel
import asyncio

from application.workflow.intelligent_workflow_service import IntelligentWorkflowService

# 创建路由器
router = APIRouter(prefix="/api/workflow", tags=["intelligent_workflow"])

# 全局服务实例
intelligent_workflow_service = IntelligentWorkflowService()

# 请求模型定义
class StepExecutionRequest(BaseModel):
    stage_id: str
    step_id: str
    step_index: int
    context: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}
    frontend_state: Dict[str, Any] = {}

class NextStepRequest(BaseModel):
    current_stage: str
    current_step: Optional[str] = None
    step_results: Dict[str, Any] = {}
    context: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}

class StageTransitionRequest(BaseModel):
    current_stage: str
    completed_steps: list = []
    context: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}
    stage_results: Dict[str, Any] = {}

class StepValidationRequest(BaseModel):
    stage_id: str
    step_id: str
    step_results: Dict[str, Any] = {}
    context: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}

class AvailableActionsRequest(BaseModel):
    current_stage: str
    current_step: Optional[str] = None
    context: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}

class AgentSuggestionRequest(BaseModel):
    agent_type: str
    task: str
    context: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}
    constraints: Dict[str, Any] = {}

class IntelligentSuggestionsRequest(BaseModel):
    current_stage: str
    current_step: Optional[str] = None
    completed_steps: list = []
    step_results: Dict[str, Any] = {}
    goal_preferences: Dict[str, Any] = {}

@router.get("/template")
async def get_workflow_template(type: str = "data_analysis"):
    """
    获取工作流模板
    Get workflow template
    """
    try:
        template = await intelligent_workflow_service.get_workflow_template(type)
        return {
            "success": True,
            "template": template
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/execute_step")
async def execute_step(request: StepExecutionRequest):
    """
    执行工作流步骤 (智能目标驱动)
    Execute workflow step (intelligent goal-driven)
    """
    try:
        step_request = {
            "stage_id": request.stage_id,
            "step_id": request.step_id,
            "step_index": request.step_index,
            "context": request.context,
            "variables": request.variables,
            "frontend_state": request.frontend_state
        }
        
        workflow_response = await intelligent_workflow_service.execute_step(step_request)
        
        # 构建符合前端期望的响应格式
        response = {
            "success": True,
            "step_result": {
                "actions": workflow_response.step_result.outputs.get("actions", []),
                "execution_time": workflow_response.step_result.execution_time,
                "quality_score": workflow_response.step_result.quality_score
            },
            "workflow_control": {
                "should_proceed_to_next_step": workflow_response.next_decision.value in [
                    "continue_next_step", "skip_to_step"
                ],
                "should_proceed_to_next_stage": workflow_response.next_decision.value == "complete_stage",
                "current_status": workflow_response.updated_state.goal_evaluation.get("goal_status", "in_progress"),
                "decision": workflow_response.next_decision.value,
                "reasoning": workflow_response.reasoning
            },
            "agent_thinking": workflow_response.agent_thinking,
            "recommendations": workflow_response.recommendations,
            "goal_evaluation": workflow_response.updated_state.goal_evaluation
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Step execution failed: {str(e)}")

@router.post("/next_step")
async def get_next_step_suggestion(request: NextStepRequest):
    """
    获取下一步建议 (无状态决策)
    Get next step suggestion (stateless decision)
    """
    try:
        current_context = {
            "current_stage": request.current_stage,
            "current_step": request.current_step,
            "step_results": request.step_results,
            "context": request.context,
            "variables": request.variables
        }
        
        suggestion = await intelligent_workflow_service.get_next_step_suggestion(current_context)
        return {
            "success": True,
            **suggestion
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get next step suggestion: {str(e)}")

@router.post("/stage_transition")
async def get_stage_transition_suggestion(request: StageTransitionRequest):
    """
    获取阶段转换建议 (无状态决策)
    Get stage transition suggestion (stateless decision)
    """
    try:
        current_context = {
            "current_stage": request.current_stage,
            "completed_steps": request.completed_steps,
            "context": request.context,
            "variables": request.variables,
            "stage_results": request.stage_results
        }
        
        suggestion = await intelligent_workflow_service.get_stage_transition_suggestion(current_context)
        return {
            "success": True,
            **suggestion
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stage transition suggestion: {str(e)}")

@router.post("/validate_step")
async def validate_step_completion(request: StepValidationRequest):
    """
    验证步骤完成度 (无状态验证)
    Validate step completion (stateless validation)
    """
    try:
        validation_request = {
            "stage_id": request.stage_id,
            "step_id": request.step_id,
            "step_results": request.step_results,
            "context": request.context,
            "variables": request.variables
        }
        
        validation_result = await intelligent_workflow_service.validate_step_completion(validation_request)
        return {
            "success": True,
            **validation_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Step validation failed: {str(e)}")

@router.post("/available_actions")
async def get_available_actions(request: AvailableActionsRequest):
    """
    获取可用操作列表 (基于当前状态)
    Get available actions list (based on current state)
    """
    try:
        # 目前返回基础的可用操作，后续可以根据具体需求扩展
        actions = [
            {
                "action": "continue",
                "name": "继续下一步",
                "description": "执行工作流中的下一个步骤"
            },
            {
                "action": "retry",
                "name": "重试当前步骤", 
                "description": "重新执行当前步骤"
            },
            {
                "action": "skip",
                "name": "跳过当前步骤",
                "description": "跳过当前步骤继续工作流"
            },
            {
                "action": "customize",
                "name": "自定义步骤",
                "description": "创建自定义步骤来满足特定需求"
            }
        ]
        
        return {
            "success": True,
            "available_actions": actions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available actions: {str(e)}")

@router.post("/agent_suggestion")
async def get_agent_suggestion(request: AgentSuggestionRequest):
    """
    获取Agent建议 (无状态推理)
    Get agent suggestions (stateless reasoning)
    """
    try:
        # 这里可以集成具体的Agent建议逻辑
        # 目前返回基础建议
        suggestions = {
            "agent_type": request.agent_type,
            "task": request.task,
            "suggestions": [
                "基于当前上下文分析数据特征",
                "确保数据质量满足分析要求", 
                "选择合适的分析方法和技术"
            ],
            "confidence_score": 0.8,
            "reasoning": f"基于{request.agent_type}代理的专业知识，针对任务'{request.task}'提供建议"
        }
        
        return {
            "success": True,
            **suggestions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agent suggestion: {str(e)}")

@router.post("/intelligent_suggestions")
async def get_intelligent_suggestions(request: IntelligentSuggestionsRequest):
    """
    获取智能建议 (综合目标驱动分析)
    Get intelligent suggestions (comprehensive goal-driven analysis)
    """
    try:
        # 构建上下文用于智能分析
        current_context = {
            "current_stage": request.current_stage,
            "current_step": request.current_step,
            "completed_steps": request.completed_steps,
            "step_results": request.step_results
        }
        
        # 获取下一步建议
        next_step_suggestion = await intelligent_workflow_service.get_next_step_suggestion(current_context)
        
        # 获取阶段转换建议
        stage_context = {
            "current_stage": request.current_stage,
            "completed_steps": request.completed_steps,
            "context": {},
            "variables": {},
            "stage_results": {}
        }
        stage_transition_suggestion = await intelligent_workflow_service.get_stage_transition_suggestion(stage_context)
        
        # 综合智能建议
        intelligent_suggestions = {
            "next_step_recommendation": next_step_suggestion,
            "stage_transition_recommendation": stage_transition_suggestion,
            "optimization_suggestions": [
                "建议优先完成高质量分数的步骤",
                "关注数据质量和分析深度",
                "保持步骤间的逻辑连贯性"
            ],
            "goal_progress": {
                "current_completion": next_step_suggestion.get("completion_rate", 0),
                "estimated_remaining_time": "15-30分钟",
                "key_milestones": [
                    "完成数据加载和预览",
                    "生成有效的分析假设", 
                    "建立数据质量基线"
                ]
            }
        }
        
        return {
            "success": True,
            **intelligent_suggestions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get intelligent suggestions: {str(e)}")

@router.get("/service_stats")
async def get_service_stats():
    """
    获取服务统计信息
    Get service statistics
    """
    try:
        stats = intelligent_workflow_service.get_service_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get service stats: {str(e)}")

@router.post("/reset_cache")
async def reset_cache():
    """
    重置缓存
    Reset cache
    """
    try:
        intelligent_workflow_service.action_executor.clear_cache()
        return {
            "success": True,
            "message": "Cache cleared successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset cache: {str(e)}")