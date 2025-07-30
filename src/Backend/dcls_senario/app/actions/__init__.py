"""
VDS Agents Actions Module
基于存在性第一性原理的动态workflow执行
"""

import importlib
import asyncio
from typing import Dict, Any, Optional
from app.core.workflow_manager import WorkflowManager
from app.utils.logger import ModernLogger

logger = ModernLogger("actions", level="info")

async def get_sequence_generator(chapter_id: str, section_id: str, state: Dict[str, Any], stream: bool = True) -> Optional[Dict[str, Any]]:
    """
    基于新架构的序列生成器
    :param chapter_id: 章节ID
    :param section_id: 小节ID  
    :param state: 前端状态
    :param stream: 是否使用流式输出
    :return: 序列数据
    """
    try:
        # 验证章节和小节是否有效
        result = WorkflowManager.execute_workflow_step(chapter_id, section_id)
        if not result.get("success"):
            logger.error(f"Invalid workflow step: {result.get('error')}")
            return None
            
        module_path = result["module_path"]
        
        try:
            # 动态导入模块
            module = importlib.import_module(module_path)
            
            # 查找序列生成函数 (优先级: generate_sequence -> main -> generate -> 动态函数名)
            generator_func = None
            
            # 首先查找标准函数名
            for func_name in ['generate_sequence', 'main', 'generate']:
                if hasattr(module, func_name):
                    generator_func = getattr(module, func_name)
                    break
            
            # 如果找不到标准函数名，查找以 generate_ 开头的函数
            if not generator_func:
                for attr_name in dir(module):
                    if attr_name.startswith('generate_') and callable(getattr(module, attr_name)):
                        generator_func = getattr(module, attr_name)
                        logger.info(f"Found generator function: {attr_name} in {module_path}")
                        break
                        
            if not generator_func:
                logger.error(f"❌ No valid generator function found in {module_path}")
                return None
                
            # 调用生成函数 - 传递正确的参数
            step_data = {"chapter_id": chapter_id, "section_id": section_id}
            
            try:
                if stream:
                    if asyncio.iscoroutinefunction(generator_func):
                        sequence = await generator_func(step_data, state, stream)
                    else:
                        sequence = generator_func(step_data, state, stream)
                else:
                    sequence = generator_func(step_data, state, stream)
                
                logger.info(f"✅ Successfully generated sequence for {chapter_id}/{section_id}")
                logger.info(f"📊 Sequence content: {sequence}")
                
                # 检查返回值是否为None
                if sequence is None:
                    logger.error(f"❌ Generator function returned None for {chapter_id}/{section_id}")
                    return None
                    
                return sequence
                
            except Exception as func_error:
                logger.error(f"❌ Error calling generator function {generator_func.__name__}: {str(func_error)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return None
            
        except ImportError as e:
            logger.error(f"Failed to import module {module_path}: {str(e)}")
            return None
            
    except Exception as e:
        logger.error(f"Error in get_sequence_generator: {str(e)}")
        return None

async def general_response(issue: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    通用响应生成器
    """
    try:
        # 处理特定的业务逻辑
        if issue == 'generate_question_choice_map':
            from app.actions.general import generate_question_choice_map
            question_choice_map = await generate_question_choice_map(context)
            return {
                "status": "success",
                "message": question_choice_map
            }
        
        # 基础实现 - 其他通用请求
        return {
            "status": "success",
            "message": [
                {
                    "type": "text",
                    "content": f"Processing issue: {issue}",
                    "context": context
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error in general_response: {str(e)}")
        return {
            "status": "error", 
            "message": [
                {
                    "type": "error",
                    "content": str(e)
                }
            ]
        }