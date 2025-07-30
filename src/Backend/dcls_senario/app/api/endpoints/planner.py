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
from app.utils.helpers import get_chapter_or_abort, validate_section_id, create_streaming_response
from app.actions import get_sequence_generator
from app.actions import general_response
from app.utils.logger import ModernLogger

logger = ModernLogger("planner", level="info")
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
    获取指定阶段和步骤的操作序列（适配前端stage_id/step_index）
    
    当 stream 为 true 时，将以流式输出（每一行 JSON）的方式返回操作序列。
    """
    # 适配前端参数：stage_id -> chapter_id, step_index -> section_id
    chapter_id = request.stage_id
    
    # step_index现在是string类型的section_id，直接使用
    section_id = request.step_index
    
    # 验证section_id是否有效
    from app.core.workflow_manager import WorkflowManager
    chapter_config = WorkflowManager.AVAILABLE_CHAPTERS.get(chapter_id)
    if not chapter_config:
        raise HTTPException(status_code=404, detail=f"Stage {chapter_id} not found")
    
    available_sections = chapter_config["sections"]
    if section_id not in available_sections:
        raise HTTPException(status_code=400, 
            detail=f"Step {section_id} not found in stage {chapter_id}. Available steps: {available_sections}")
    
    chapter = get_chapter_or_abort(chapter_id)
    validate_section_id(chapter, section_id)
    
    # 获取序列生成器并生成序列
    sequence = await get_sequence_generator(
        chapter_id, 
        section_id, 
        request.state,
        stream=request.stream  # 传递流式参数
    )
    
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence for section {section_id} not found")
    
    # 获取下一个小节
    sections = chapter["sections"]
    current_section_index = sections.index(section_id) if section_id in sections else -1
    next_section = sections[current_section_index + 1] if current_section_index + 1 < len(sections) else None
    
    # 添加元数据到序列中（适配前端术语）
    sequence["stage_id"] = chapter_id
    sequence["step_id"] = section_id  
    sequence["step_index"] = section_id  # step_index现在就是section_id
    sequence["next_step"] = next_section
    # 保持向后兼容
    sequence["chapter_id"] = chapter_id
    sequence["section_id"] = section_id
    sequence["next_section"] = next_section
    
    if 1:
        # 返回流式响应
        return create_streaming_response(sequence)
    else:
        # 返回常规JSON响应
        return {
            "stage_id": chapter_id,
            "step_id": section_id,
            "step_index": section_id,  # step_index现在就是section_id
            "sequence": sequence,
            "next_step": next_section,
            # 保持向后兼容
            "chapter_id": chapter_id,
            "section_id": section_id,
            "next_section": next_section
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
        else:
            logger.warning(f"Feedback not finished: {toDoList}")

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