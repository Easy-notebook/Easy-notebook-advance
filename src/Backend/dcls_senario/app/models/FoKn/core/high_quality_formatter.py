"""
FoKn高质量格式化器 - 生成优化的提示词格式

这个模块提供高质量、简洁的提示词格式化功能，
符合生产环境的实际需求。
"""

from typing import Dict, Any, List, Optional
from .forest_base import KnowledgeForest


class HighQualityFormatter:
    """
    高质量提示词格式化器
    
    专门用于生成简洁、实用、高质量的AI Agent提示词。
    """
    
    def __init__(self, forest: KnowledgeForest):
        """
        初始化格式化器
        
        Args:
            forest: 知识森林实例
        """
        self.forest = forest
    
    def format_agent_prompt(self, 
                          base_description: str = "",
                          workflow_section: str = "",
                          background_knowledge: str = "",
                          things_you_should_know: str = "") -> str:
        """
        生成高质量的Agent提示词
        
        Args:
            base_description: 基础描述
            workflow_section: 工作流部分
            background_knowledge: 背景知识
            things_you_should_know: 应知事项
            
        Returns:
            格式化的高质量提示词
        """
        output_parts = []
        
        # 基础描述
        if base_description:
            output_parts.append(base_description)
        
        # Who you are 部分
        identity_content = self._format_identity()
        if identity_content:
            output_parts.append(f"\n## Who you are\n{identity_content}")
        
        # Ability 部分
        ability_content = self._format_abilities()
        if ability_content:
            output_parts.append(f"\n## Ability\n{ability_content}")
        
        # Policy 部分
        policy_content = self._format_policies()
        if policy_content:
            output_parts.append(f"\n## Policy\n{policy_content}")
        
        # Rules 部分
        rules_content = self._format_rules()
        if rules_content:
            output_parts.append(f"\n## Rules\n{rules_content}")
        
        # Constraints 部分
        constraints_content = self._format_constraints()
        if constraints_content:
            output_parts.append(f"\n## Constraints\n{constraints_content}")
        
        # Output Format 部分
        output_format_content = self._format_output_requirements()
        if output_format_content:
            output_parts.append(f"\n## You output must following format to express your answer:\n{output_format_content}")
        
        # Communication 部分
        communication_content = self._format_communication()
        if communication_content:
            output_parts.append(f"\n## Communication(you must use the correct agent name in the tag)\n{communication_content}")
        
        # Context 和其他重要信息
        context_content = self._format_context_info()
        if context_content:
            output_parts.append(context_content)
        
        # 添加自定义sections
        if workflow_section:
            output_parts.append(f"\n## Workflow Guidelines\n{workflow_section}")
        
        if background_knowledge:
            output_parts.append(f"\n## Background Knowledge\n{background_knowledge}")
        
        if things_you_should_know:
            output_parts.append(f"\n## Important Notes\n{things_you_should_know}")
        
        return "\n".join(filter(None, output_parts))
    
    def _format_identity(self) -> str:
        """格式化身份部分"""
        identity_area = self.forest.get_knowledge_area("agent_identity")
        if not identity_area or identity_area.is_empty():
            return ""
        
        role_tree = identity_area.get_knowledge_tree("Your Identity")
        if not role_tree or role_tree.is_empty():
            return ""
        
        roles = role_tree.get_knowledge_items()
        if not roles:
            return ""
        
        return roles[0] if len(roles) == 1 else "\n".join(roles)
    
    def _format_abilities(self) -> str:
        """格式化能力部分"""
        identity_area = self.forest.get_knowledge_area("agent_identity")
        if not identity_area or identity_area.is_empty():
            return ""
        
        capability_tree = identity_area.get_knowledge_tree("Your Capabilities")
        if not capability_tree or capability_tree.is_empty():
            return ""
        
        capabilities = capability_tree.get_knowledge_items()
        if not capabilities:
            return ""
        
        formatted_capabilities = []
        for capability in capabilities:
            if capability.strip():
                formatted_capabilities.append(f"- {capability}")
        
        return "\n".join(formatted_capabilities)
    
    def _format_policies(self) -> str:
        """格式化政策部分"""
        identity_area = self.forest.get_knowledge_area("agent_identity")
        if not identity_area:
            return ""
        
        policy_tree = identity_area.get_knowledge_tree("Your Behavior Policy")
        if not policy_tree or policy_tree.is_empty():
            return ""
        
        policies = policy_tree.get_knowledge_items()
        if not policies:
            return ""
        
        formatted_policies = []
        for policy in policies:
            if policy.strip():
                formatted_policies.append(f"- {policy}")
        
        return "\n".join(formatted_policies)
    
    def _format_rules(self) -> str:
        """格式化规则部分"""
        rules_area = self.forest.get_knowledge_area("behavioral_rules")
        if not rules_area:
            return ""
        
        rule_tree = rules_area.get_knowledge_tree("Rules You Must Follow")
        if not rule_tree or rule_tree.is_empty():
            return ""
        
        rules = rule_tree.get_knowledge_items()
        if not rules:
            return ""
        
        formatted_rules = []
        for rule in rules:
            if rule.strip():
                formatted_rules.append(f"- {rule}")
        
        return "\n".join(formatted_rules)
    
    def _format_constraints(self) -> str:
        """格式化约束部分"""
        rules_area = self.forest.get_knowledge_area("behavioral_rules")
        if not rules_area:
            return ""
        
        constraint_tree = rules_area.get_knowledge_tree("Your Constraints")
        limitation_tree = rules_area.get_knowledge_tree("Limitations")
        
        constraints = []
        
        if constraint_tree and not constraint_tree.is_empty():
            constraints.extend(constraint_tree.get_knowledge_items())
        
        if limitation_tree and not limitation_tree.is_empty():
            constraints.extend(limitation_tree.get_knowledge_items())
        
        if not constraints:
            return ""
        
        formatted_constraints = []
        for constraint in constraints:
            if constraint.strip():
                formatted_constraints.append(f"- {constraint}")
        
        return "\n".join(formatted_constraints)
    
    def _format_output_requirements(self) -> str:
        """格式化输出要求部分"""
        comm_area = self.forest.get_knowledge_area("communication")
        if not comm_area:
            return ""
        
        output_tree = comm_area.get_knowledge_tree("Your Output Format Requirements")
        if not output_tree or output_tree.is_empty():
            return ""
        
        output_formats = output_tree.get_knowledge_items()
        if not output_formats:
            return ""
        
        formatted_outputs = []
        for output_format in output_formats:
            if output_format.strip():
                formatted_outputs.append(f"- {output_format}")
        
        return "\n".join(formatted_outputs)
    
    def _format_communication(self) -> str:
        """格式化通信部分"""
        comm_area = self.forest.get_knowledge_area("communication")
        if not comm_area:
            return ""
        
        comm_tree = comm_area.get_knowledge_tree("How to Communicate with Other Agents")
        if not comm_tree or comm_tree.is_empty():
            return ""
        
        # 获取可用agents信息
        if hasattr(comm_tree, 'structured_items'):
            available_agents = [
                item for item in comm_tree.structured_items 
                if item.get('type') == 'available_agent'
            ]
            
            if available_agents:
                formatted_agents = []
                for agent in available_agents:
                    agent_str = f"- \"{agent['name']}\": {agent['description']}"
                    if agent.get('capabilities'):
                        agent_str += f", {agent['capabilities']}"
                    formatted_agents.append(agent_str)
                
                return "\n".join(formatted_agents)
        
        # 如果没有结构化数据，使用简单格式
        communications = comm_tree.get_knowledge_items()
        if not communications:
            return ""
        
        formatted_comms = []
        for comm in communications:
            if comm.strip():
                formatted_comms.append(f"- {comm}")
        
        return "\n".join(formatted_comms)
    
    def _format_context_info(self) -> str:
        """格式化上下文信息"""
        context_parts = []
        
        # Domain Knowledge
        domain_content = self._format_domain_knowledge()
        if domain_content:
            context_parts.append(f"\n## Domain Knowledge\n{domain_content}")
        
        # Current Context
        current_context = self._format_current_context()
        if current_context:
            context_parts.append(f"\n## Current Context\n{current_context}")
        
        # Memory & Experience
        memory_content = self._format_memory_and_experience()
        if memory_content:
            context_parts.append(f"\n## Memory & Experience\n{memory_content}")
        
        return "\n".join(context_parts)
    
    def _format_domain_knowledge(self) -> str:
        """格式化领域知识"""
        context_area = self.forest.get_knowledge_area("knowledge_context")
        if not context_area:
            return ""
        
        domain_tree = context_area.get_knowledge_tree("Domain Knowledge")
        if not domain_tree or domain_tree.is_empty():
            return ""
        
        knowledge_items = domain_tree.get_knowledge_items()
        if not knowledge_items:
            return ""
        
        formatted_knowledge = []
        for item in knowledge_items:
            if item.strip():
                formatted_knowledge.append(f"- {item}")
        
        return "\n".join(formatted_knowledge)
    
    def _format_current_context(self) -> str:
        """格式化当前上下文"""
        context_area = self.forest.get_knowledge_area("knowledge_context")
        if not context_area:
            return ""
        
        context_tree = context_area.get_knowledge_tree("Your Current Context")
        if not context_tree or context_tree.is_empty():
            return ""
        
        contexts = context_tree.get_knowledge_items()
        if not contexts:
            return ""
        
        formatted_contexts = []
        for context in contexts:
            if context.strip():
                formatted_contexts.append(f"- {context}")
        
        return "\n".join(formatted_contexts)
    
    def _format_memory_and_experience(self) -> str:
        """格式化记忆和经验"""
        memory_parts = []
        
        # Memory items
        context_area = self.forest.get_knowledge_area("knowledge_context")
        if context_area:
            memory_tree = context_area.get_knowledge_tree("Memory & History")
            if memory_tree and not memory_tree.is_empty():
                memory_items = memory_tree.get_knowledge_items()
                if memory_items:
                    for item in memory_items:
                        if item.strip():
                            memory_parts.append(f"- {item}")
        
        # Best practices and lessons
        learning_area = self.forest.get_knowledge_area("learning_experience")
        if learning_area:
            practice_tree = learning_area.get_knowledge_tree("Best Practices")
            if practice_tree and not practice_tree.is_empty():
                practices = practice_tree.get_knowledge_items()
                if practices:
                    for practice in practices:
                        if practice.strip():
                            memory_parts.append(f"- {practice}")
        
        return "\n".join(memory_parts) if memory_parts else ""