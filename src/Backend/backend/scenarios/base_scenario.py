from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator
import json


class BaseScenarioTemplate(ABC):
    """
    基础场景模板类，定义场景处理的通用结构和接口
    """
    
    def __init__(self, operation: Dict[str, Any]):
        """
        初始化场景模板
        """
        self.operation = operation
        self.payload = self.operation.get("payload", {})
        
        # 提取记忆上下文
        self.memory_context = self._extract_memory_context()
        
    def _get_payload_value(self, key: str, default=None):
        """获取payload中的值"""
        return self.payload.get(key, default)
        
    def _create_response_json(self, response_type: str, data: Dict[str, Any]) -> str:
        """创建响应JSON"""
        return json.dumps({
            "type": response_type,
            "data": data
        }) + "\n"
        
    def _create_error_response(self, error_msg: str, payload_data: Dict[str, Any] = None) -> str:
        """创建错误响应"""
        return self._create_response_json("error", {
            "payload": payload_data or {},
            "error": error_msg
        })
        
    def _extract_memory_context(self) -> Dict[str, Any]:
        """提取记忆上下文"""
        return {
            "agent_memory": self.payload.get("agent_memory"),
            "current_context": self.payload.get("current_context", {}),
            "notebook_id": self.payload.get("notebook_id"),
            "agent_type": self.payload.get("agent_type")
        }
        
    def _create_agent_operation(self, agent_class, **kwargs) -> Dict[str, Any]:
        """创建带记忆上下文的Agent操作"""
        operation = dict(self.operation)
        
        # 添加记忆上下文到payload
        if "payload" not in operation:
            operation["payload"] = {}
        
        # 合并记忆上下文
        operation["payload"].update(self.memory_context)
        operation["payload"].update(kwargs)
        
        return operation
        
    @abstractmethod
    def validate_operation(self) -> bool:
        """抽象方法：验证操作参数"""
        pass
        
    @abstractmethod
    async def process(self) -> AsyncGenerator[str, None]:
        """抽象方法：处理场景逻辑"""
        pass