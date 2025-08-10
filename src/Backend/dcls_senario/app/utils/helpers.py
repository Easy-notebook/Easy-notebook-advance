from fastapi import HTTPException
import asyncio
import json
import os
from fastapi.responses import StreamingResponse
from typing import AsyncIterable, Dict, Any, List

from app.core.workflow_manager import WorkflowManager
from app.utils.logger import ModernLogger


logger = ModernLogger("helpers", level="info")

# 是否启用调试模式（可从环境变量读取）
DEBUG_MODE = os.environ.get("DEBUG_MODE", "false").lower() == "true"
# 调试模式下的延迟倍数
DEBUG_DELAY_MULTIPLIER = float(os.environ.get("DEBUG_DELAY_MULTIPLIER", "3"))

def get_chapter_or_abort(chapter_id: str) -> dict:
    """获取指定章节信息，如果不存在则抛出异常"""
    chapter = WorkflowManager.AVAILABLE_CHAPTERS.get(chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")
    return chapter

def validate_section_id(chapter: dict, section_id: str) -> str:
    """验证小节ID是否有效"""
    if section_id not in chapter.get("sections", []):
        raise HTTPException(status_code=404, detail=f"Section {section_id} not found in chapter")
    return section_id

async def generate_streaming_response(sequence: dict):
    """生成流式响应"""
    header = {"header": {
        "stage_id": sequence.get("stage_id"),
        "step": sequence.get("step"),
        "next_step": sequence.get("next_step")
    }}

    header_json = json.dumps(header)
    yield header_json + "\n"

    # 处理步骤列表或异步迭代器
    steps = sequence.get("steps", [])

    # 检查是否是Action对象（有run方法的对象）
    if hasattr(steps, 'run') and callable(getattr(steps, 'run')):
        # 如果是Action对象，执行它并获取异步迭代器
        try:
            action_iterator = steps.run()
            if hasattr(action_iterator, '__aiter__'):  # 检查是否是异步迭代器
                count = 0
                async for action in action_iterator:
                    count += 1
                    # 确保action是可序列化的
                    if hasattr(action, 'to_dict'):
                        action_data = action.to_dict()
                    elif isinstance(action, dict):
                        action_data = action
                    else:
                        action_data = {"content": str(action), "action": "text"}

                    action_json = json.dumps({"action": action_data})
                    yield action_json + "\n"
                    # 确保每个操作都被立即刷新到客户端
                    await asyncio.sleep(0.01)  # 微小延迟确保数据被发送
            else:
                # 如果不是异步迭代器，包装成单个action
                action_data = {"content": "Action completed", "action": "text"}
                action_json = json.dumps({"action": action_data})
                yield action_json + "\n"
        except Exception as e:
            # 如果执行失败，返回错误信息
            error_action = {"content": f"Error executing action: {str(e)}", "action": "error"}
            action_json = json.dumps({"action": error_action})
            yield action_json + "\n"
    elif hasattr(steps, '__aiter__'):  # 检查是否是异步迭代器
        # 如果是异步迭代器，直接迭代
        count = 0
        async for action in steps:
            count += 1
            action_json = json.dumps({"action": action})
            yield action_json + "\n"
            # 确保每个操作都被立即刷新到客户端
            await asyncio.sleep(0.01)  # 微小延迟确保数据被发送
    else:
        # 如果是列表，按顺序处理
        for i, action in enumerate(steps):
            delay = action.get("delay", 0) / 1000.0
            if DEBUG_MODE:
                delay *= DEBUG_DELAY_MULTIPLIER
                logger.info(f"调试模式: 延迟 {delay} 秒后发送操作")
            await asyncio.sleep(delay)  # 使用异步睡眠替代阻塞式睡眠
            action_json = json.dumps({"action": action})
            yield action_json + "\n"
            # 确保每个操作都被立即刷新到客户端
            await asyncio.sleep(0.01)  # 微小延迟确保数据被发送
    

def create_streaming_response(sequence: dict):
    """创建流式响应对象"""
    return StreamingResponse(
        generate_streaming_response(sequence),
        media_type="application/json"
    )

async def generate_step_actions(actions: List[Dict[str, Any]], debug_mode: bool = DEBUG_MODE, delay_multiplier: float = DEBUG_DELAY_MULTIPLIER) -> AsyncIterable[Dict[str, Any]]:
    """
    流式生成步骤操作的异步迭代器
    
    Args:
        actions: 要执行的操作列表
        debug_mode: 是否启用调试模式，添加更明显的延迟
        delay_multiplier: 调试模式下的延迟倍数
    """
    # 添加额外的初始延迟，使流式输出更明显
    if debug_mode:
        await asyncio.sleep(1.0)
        
    for i, action in enumerate(actions):
        delay = action.get("delay", 0)/1000
        action_type = action.get("type", "unknown")
        logger.info(f"生成步骤操作: {action_type} 延迟 {delay} 秒")
        
        # 在调试模式下增加延迟
        if debug_mode:
            delay *= delay_multiplier
            # 对于第一个操作，添加额外延迟让效果更明显
            if i == 0:
                delay += 1.0
            logger.info(f"调试模式: 操作 {i+1}/{len(actions)} 延迟 {delay} 秒")
        
        await asyncio.sleep(delay)
        yield action 
