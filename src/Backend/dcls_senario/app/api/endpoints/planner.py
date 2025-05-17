import logging
import os
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.models.planner import (
    SequenceRequest, 
    FeedbackRequest, 
    SequenceResponse, 
    FeedbackResponse, 
    GenerateRequest,
    GenerateResponse,
)
from app.utils.helpers import get_stage_or_abort, validate_step_index, create_streaming_response
from app.actions import get_sequence_generator
from app.actions import general_response

logger = logging.getLogger("app")
router = APIRouter()

@router.post("/debug/toggle", response_model=Dict[str, Any])
async def toggle_debug_mode():
    """
    切换调试模式状态
    
    调试模式下会添加额外延迟，让流式输出效果更明显
    """    
    current_mode = os.environ.get("DEBUG_MODE", "false").lower() == "true"
    new_mode = not current_mode
    
    os.environ["DEBUG_MODE"] = str(new_mode).lower()
    logger.info(f"调试模式已{'启用' if new_mode else '禁用'}")
    
    return {
        "debug_mode": new_mode,
        "message": f"调试模式已{'启用' if new_mode else '禁用'}",
        "delay_multiplier": float(os.environ.get("DEBUG_DELAY_MULTIPLIER", "3"))
    }

@router.post("/debug/set_delay", response_model=Dict[str, Any])
async def set_debug_delay(multiplier: float = 3.0):
    """
    设置调试模式下的延迟倍数
    
    Args:
        multiplier: 延迟倍数，默认为3
    """
    if multiplier < 1.0:
        raise HTTPException(status_code=400, detail="延迟倍数必须大于等于1.0")
    
    os.environ["DEBUG_DELAY_MULTIPLIER"] = str(multiplier)
    logger.info(f"调试延迟倍数已设置为 {multiplier}")
    
    return {
        "debug_mode": os.environ.get("DEBUG_MODE", "false").lower() == "true",
        "message": f"调试延迟倍数已设置为 {multiplier}",
        "delay_multiplier": multiplier
    }

@router.get("/debug/status", response_model=Dict[str, Any])
async def get_debug_status():
    """
    获取当前调试模式状态
    """
    debug_mode = os.environ.get("DEBUG_MODE", "false").lower() == "true"
    delay_multiplier = float(os.environ.get("DEBUG_DELAY_MULTIPLIER", "3"))
    
    return {
        "debug_mode": debug_mode,
        "delay_multiplier": delay_multiplier,
        "status": "启用" if debug_mode else "禁用"
    }

@router.post("/actions", response_model=SequenceResponse)
async def planner_sequence(request: SequenceRequest):
    """
    获取指定阶段和步骤的操作序列
    
    当 stream 为 true 时，将以流式输出（每一行 JSON）的方式返回操作序列。
    """
    stage = get_stage_or_abort(request.stage_id)
    step = validate_step_index(stage, request.step_index)
    
    # 获取序列生成器并生成序列
    sequence = await get_sequence_generator(
        request.stage_id, 
        request.step_index, 
        request.state,
        stream=request.stream  # 传递流式参数
    )
    
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence for step {request.step_index} not found")
    
    next_step = request.step_index + 1 if request.step_index + 1 < len(stage["steps"]) else None
    
    # 添加元数据到序列中
    sequence["stage_id"] = request.stage_id
    sequence["step"] = step
    sequence["next_step"] = next_step
    
    if 1:
        # 返回流式响应
        return create_streaming_response(sequence)
    else:
        # 返回常规JSON响应
        return {
            "stage_id": request.stage_id,
            "step": step,
            "sequence": sequence,
            "next_step": next_step
        }

@router.post("/reflection", response_model=FeedbackResponse)
async def planner_feedback(request: FeedbackRequest):
    """
    接收前端对执行结果的反馈
    """    
    
    # 判断目标是否达成
    target_achieved = False
    if request.state:
        toDoList = request.state.get("toDoList", [])
        if toDoList == []:
            target_achieved = True

    return {
        "status": "received", 
        "message": "Feedback processed", 
        "targetAchieved": target_achieved,
        "state": request.state
    }

@router.post("/generate", response_model=GenerateResponse)
async def generate_response(request: GenerateRequest):
    """
    生成响应
    """
    return await general_response(request.issue, request.context)