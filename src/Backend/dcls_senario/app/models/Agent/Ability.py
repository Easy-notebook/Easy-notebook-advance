from typing import Dict, Any, Callable, Optional, List

def ability(ability_name: str, xml_tag: str = "", xml_attributes: dict = None, 
           is_self_closing: bool = False, description: str = ""):
    """
    能力装饰器 - 将方法标记为智能体能力
    
    Args:
        ability_name: 能力名称
        xml_tag: XML标签名称
        xml_attributes: XML属性
        is_self_closing: 是否为自闭合标签
        description: 能力描述
    """
    def decorator(func: Callable) -> Callable:
        func._is_ability = True
        func._ability_name = ability_name
        func._xml_tag = xml_tag
        func._xml_attributes = xml_attributes or {}
        func._is_self_closing = is_self_closing
        func._description = description
        return func
    return decorator


def standard_ability(xml_tag: str, xml_attributes: dict = None, 
                    is_self_closing: bool = False, description: str = ""):
    """
    标准能力装饰器 - 使用方法名作为能力名称
    """
    def decorator(func: Callable) -> Callable:
        ability_name = func.__name__.replace('_', ' ').title()
        return ability(ability_name, xml_tag, xml_attributes, is_self_closing, description)(func)
    return decorator

    
class AbilityRegistry:
    """能力注册表 - 管理所有已注册的能力"""
    
    def __init__(self):
        self._abilities: Dict[str, Dict[str, Any]] = {}
        self._handlers: Dict[str, Callable] = {}
    
    def register_ability(self, ability_name: str, handler: Callable, 
                        xml_tag: str = "", xml_attributes: dict = None,
                        is_self_closing: bool = False, description: str = ""):
        """注册能力"""
        self._abilities[ability_name] = {
            "xml_tag": xml_tag,
            "xml_attributes": xml_attributes or {},
            "is_self_closing": is_self_closing,
            "description": description,
            "handler": handler
        }
        self._handlers[ability_name] = handler
    
    def get_ability(self, ability_name: str) -> Optional[Dict[str, Any]]:
        """获取能力信息"""
        return self._abilities.get(ability_name)
    
    def has_ability(self, ability_name: str) -> bool:
        """检查能力是否存在"""
        return ability_name in self._abilities
    
    def list_abilities(self) -> List[str]:
        """列出所有能力名称"""
        return list(self._abilities.keys())
    
    def get_xml_spec(self, ability_name: str) -> Optional[str]:
        """获取能力的XML规范"""
        ability = self.get_ability(ability_name)
        if not ability or not ability.get("xml_tag"):
            return None
        
        xml_tag = ability["xml_tag"]
        xml_attributes = ability["xml_attributes"]
        is_self_closing = ability["is_self_closing"]
        
        # 构建XML标签
        tag_spec = f"<{xml_tag}"
        
        if xml_attributes:
            attr_parts = [f'{k}="{v}"' for k, v in xml_attributes.items()]
            tag_spec += f" {' '.join(attr_parts)}"
        
        if is_self_closing:
            tag_spec += " />"
        else:
            tag_spec += f"></{xml_tag}>"
        
        return tag_spec


# ==================== 重新设计的能力系统 ====================
class AgentAbilityMixin:
    """智能体能力混入类 - 提供能力管理功能"""
    
    def __init__(self):
        self.ability_registry = AbilityRegistry()
        self._collect_abilities()
    
    def _collect_abilities(self):
        """收集所有标记为能力的方法"""
        for method_name in dir(self):
            if method_name.startswith('_'):
                continue
            
            method = getattr(self, method_name)
            if hasattr(method, '_is_ability'):
                self.ability_registry.register_ability(
                    ability_name=method._ability_name,
                    handler=method,
                    xml_tag=method._xml_tag,
                    xml_attributes=method._xml_attributes,
                    is_self_closing=method._is_self_closing,
                    description=method._description
                )
    
    def add_ability(self, ability_name: str, capability_description: str = "",
                   xml_tag_name: str = "", xml_attributes: dict = None,
                   xml_content_structure: str = "", detailed_explanation: str = "",
                   is_self_closing: bool = False, handler: Callable = None) -> 'AgentAbilityMixin':
        """
        动态添加能力
        
        Args:
            ability_name: 能力名称
            capability_description: 能力描述
            xml_tag_name: XML标签名称
            xml_attributes: XML属性
            xml_content_structure: 内容结构
            detailed_explanation: 详细说明
            is_self_closing: 是否自闭合
            handler: 处理函数
        """
        # 如果没有提供处理函数，创建默认处理函数
        if handler is None:
            def default_handler(*args, **kwargs):
                return f"Executing {ability_name}"
            handler = default_handler
        
        # 注册能力
        self.ability_registry.register_ability(
            ability_name=ability_name,
            handler=handler,
            xml_tag=xml_tag_name,
            xml_attributes=xml_attributes or {},
            is_self_closing=is_self_closing,
            description=capability_description or detailed_explanation
        )
        
        return self
    
    def has_ability(self, ability_name: str) -> bool:
        """检查是否具有指定能力"""
        return self.ability_registry.has_ability(ability_name)
    
    def get_ability_xml_spec(self, ability_name: str) -> Optional[str]:
        """获取能力的XML规范"""
        return self.ability_registry.get_xml_spec(ability_name)
    
    def list_abilities(self) -> List[Dict[str, Any]]:
        """列出所有能力及其详细信息"""
        abilities = []
        for ability_name in self.ability_registry.list_abilities():
            ability = self.ability_registry.get_ability(ability_name)
            if ability:
                abilities.append({
                    "name": ability_name,
                    "description": ability.get("description", ""),
                    "xml_specification": self.get_ability_xml_spec(ability_name),
                    "xml_tag": ability.get("xml_tag", ""),
                    "is_self_closing": ability.get("is_self_closing", False)
                })
        return abilities