"""
Policy Knowledge Tree - Manages agent behavioral policies and guidelines.

This module handles policy-based knowledge for AI agents, including behavioral
guidelines, decision-making principles, and operational policies.
"""

from ..core.forest_base import KnowledgeTree


class PolicyKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent behavioral policies and guidelines.
    
    Manages high-level behavioral policies that guide how the agent
    should operate and make decisions.
    """
    
    def __init__(self):
        """Initialize the policy knowledge tree."""
        super().__init__(
            tree_name="Your Behavior Policy",
            tree_description="Defines behavioral guidelines and decision-making principles"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format policy knowledge into agent instruction section.
        
        Returns:
            Formatted policy section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_policies = []
        for policy in self.knowledge_items:
            formatted_policies.append(f"- {policy}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_policies) + "\n"
    
    def add_behavioral_policy(self, policy: str) -> 'PolicyKnowledgeTree':
        """
        Add a behavioral policy for the agent.
        
        Args:
            policy: The behavioral policy description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(policy)
    
    def add_decision_principle(self, principle: str) -> 'PolicyKnowledgeTree':
        """
        Add a decision-making principle.
        
        Args:
            principle: The decision principle description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(principle)
    
    def add_interaction_guideline(self, guideline: str) -> 'PolicyKnowledgeTree':
        """
        Add an interaction guideline for user engagement.
        
        Args:
            guideline: The interaction guideline description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(guideline)
    
    def add_ethical_principle(self, principle: str) -> 'PolicyKnowledgeTree':
        """
        Add an ethical principle or value.
        
        Args:
            principle: The ethical principle description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(principle)