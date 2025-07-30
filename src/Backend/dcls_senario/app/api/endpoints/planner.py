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
    获取指定章节和小节的操作序列
    
    当 stream 为 true 时，将以流式输出（每一行 JSON）的方式返回操作序列。
    """
    # 从请求中获取章节和小节信息 (需要修改前端传递chapter_id和section_id)
    chapter_id = request.stage_id  # 暂时使用stage_id作为chapter_id
    section_id = f"section_{request.step_index + 1}_workflow_initialization"  # 临时映射逻辑
    
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
    
    # 添加元数据到序列中
    sequence["chapter_id"] = chapter_id
    sequence["section_id"] = section_id
    sequence["next_section"] = next_section
    
    if 1:
        # 返回流式响应
        return create_streaming_response(sequence)
    else:
        # 返回常规JSON响应
        return {
            "chapter_id": chapter_id,
            "section_id": section_id,
            "sequence": sequence,
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