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
            
            # 查找序列生成函数 (优先级: generate_sequence -> main -> generate)
            generator_func = None
            for func_name in ['generate_sequence', 'main', 'generate']:
                if hasattr(module, func_name):
                    generator_func = getattr(module, func_name)
                    break
                    
            if not generator_func:
                logger.error(f"No valid generator function found in {module_path}")
                return None
                
            # 调用生成函数
            if stream:
                sequence = await generator_func(state) if asyncio.iscoroutinefunction(generator_func) else generator_func(state)
            else:
                sequence = generator_func(state)
                
            return sequence
            
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
        # 基础实现 - 后续可以集成PCS Agent
        return {
            "status": "success",
            "response": f"Processing issue: {issue}",
            "context": context
        }
    except Exception as e:
        logger.error(f"Error in general_response: {str(e)}")
        return {
            "status": "error", 
            "error": str(e)
        }