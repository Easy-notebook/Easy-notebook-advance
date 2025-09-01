from fastapi import APIRouter, HTTPException
from app.endpoints.Structure import (
    SequenceRequest,
    FeedbackRequest,
    SequenceResponse,
    FeedbackResponse,
    GenerateRequest,
    GenerateResponse,
)
from app.utils.helpers import get_chapter_or_abort, validate_section_id, create_streaming_response
from app.stages import get_sequence_generator
from app.stages import general_response
from app.utils.logger import ModernLogger

logger = ModernLogger("planner", level="info")
router = APIRouter()

@router.post("/actions", response_model=SequenceResponse)
async def planner_sequence(request: SequenceRequest):
    # 适配前端参数：stage_id -> chapter_id, step_index -> section_id
    chapter_id = request.stage_id
    
    # 解析step_index: 可能是完整的唯一ID (stage_id_section_id) 或原始的section_id
    step_index = request.step_index
    if isinstance(step_index, str) and step_index.startswith(chapter_id + "_"):
        # 如果是完整的唯一ID，提取section_id部分
        section_id = step_index[len(chapter_id) + 1:]  # 去掉 "chapter_id_" 前缀
    else:
        # 否则直接使用为section_id
        section_id = step_index
    
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
    
    # 检查sequence的类型并处理
    unique_step_id = f"{chapter_id}_{section_id}"

    # 如果sequence是字典，直接添加元数据
    if isinstance(sequence, dict):
        sequence["stage_id"] = chapter_id
        sequence["step_id"] = unique_step_id
        sequence["step_index"] = section_id  # step_index现在就是section_id
        sequence["next_step"] = next_section
        # 保持向后兼容
        sequence["chapter_id"] = chapter_id
        sequence["section_id"] = section_id
        sequence["next_section"] = next_section
    else:
        # 如果sequence是Action对象，需要包装成字典格式
        logger.info(f"Sequence is an Action object: {type(sequence)}")
        # 创建包装字典
        sequence_dict = {
            "stage_id": chapter_id,
            "step_id": unique_step_id,
            "step_index": section_id,
            "next_step": next_section,
            "chapter_id": chapter_id,
            "section_id": section_id,
            "next_section": next_section,
            "steps": sequence  # 将Action对象作为steps
        }
        sequence = sequence_dict
    
    if request.stream:
        return create_streaming_response(sequence)
    else:
        async def process_sequence_for_json_response(sequence):
            """处理sequence对象，确保可以JSON序列化"""
            if isinstance(sequence, dict):
                # 处理包含异步生成器的字典
                if "steps" in sequence:
                    steps = sequence["steps"]

                    # 处理异步生成器
                    if hasattr(steps, '__aiter__'):
                        collected_actions = []
                        try:
                            async for action in steps:
                                if hasattr(action, 'to_dict'):
                                    collected_actions.append(action.to_dict())
                                elif isinstance(action, dict):
                                    collected_actions.append(action)
                                else:
                                    collected_actions.append({"content": str(action), "action": "text"})
                            sequence["steps"] = collected_actions
                        except Exception as e:
                            logger.error(f"Error processing async generator: {e}")
                            sequence["steps"] = [{"content": f"Error: {str(e)}", "action": "error"}]

                    # 处理Action对象
                    elif hasattr(steps, 'run') and callable(getattr(steps, 'run')):
                        try:
                            action_iterator = steps.run()
                            collected_actions = []

                            if hasattr(action_iterator, '__aiter__'):
                                # 异步迭代器
                                async for action in action_iterator:
                                    if hasattr(action, 'to_dict'):
                                        collected_actions.append(action.to_dict())
                                    elif isinstance(action, dict):
                                        collected_actions.append(action)
                                    else:
                                        collected_actions.append({"content": str(action), "action": "text"})
                            else:
                                # 同步结果
                                if hasattr(action_iterator, 'to_dict'):
                                    collected_actions.append(action_iterator.to_dict())
                                elif isinstance(action_iterator, dict):
                                    collected_actions.append(action_iterator)
                                else:
                                    collected_actions.append({"content": str(action_iterator), "action": "text"})

                            sequence["steps"] = collected_actions

                        except Exception as e:
                            logger.error(f"Error executing action for non-streaming response: {e}")
                            sequence["steps"] = [{"content": f"Error: {str(e)}", "action": "error"}]

                return sequence

            # 处理协程对象
            elif hasattr(sequence, '__await__'):
                try:
                    # 等待协程完成
                    result = await sequence
                    if hasattr(result, 'run') and callable(getattr(result, 'run')):
                        # 如果结果是Action对象，执行它
                        action_iterator = result.run()
                        collected_actions = []

                        if hasattr(action_iterator, '__aiter__'):
                            async for action in action_iterator:
                                if hasattr(action, 'to_dict'):
                                    collected_actions.append(action.to_dict())
                                elif isinstance(action, dict):
                                    collected_actions.append(action)
                                else:
                                    collected_actions.append({"content": str(action), "action": "text"})

                        return {"steps": collected_actions}
                    else:
                        return {"steps": [{"content": str(result), "action": "text"}]}

                except Exception as e:
                    logger.error(f"Error awaiting coroutine: {e}")
                    return {"steps": [{"content": f"Error: {str(e)}", "action": "error"}]}

            # 其他情况，尝试转换为字符串
            else:
                return {"steps": [{"content": str(sequence), "action": "text"}]}

        # 处理sequence
        processed_sequence = await process_sequence_for_json_response(sequence)

        # 创建StepData对象
        from app.endpoints.Structure import StepData
        step_data = StepData(
            id=unique_step_id,
            title=chapter_config.get("name", chapter_id),
            description=chapter_config.get("description", ""),
            icon="📊",  # 默认图标
            stepId=section_id,
            state=request.state
        )

        # 处理next_step - 确保是整数或None
        next_step_int = None
        if next_section:
            try:
                # 尝试从section列表中获取索引
                sections = chapter_config["sections"]
                if next_section in sections:
                    next_step_int = sections.index(next_section)
            except (ValueError, KeyError):
                pass

        return {
            "stage_id": chapter_id,
            "step": step_data,
            "sequence": processed_sequence,
            "next_step": next_step_int,
            "state": request.state,
            # 保持向后兼容
            "step_id": unique_step_id,
            "step_index": section_id,
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