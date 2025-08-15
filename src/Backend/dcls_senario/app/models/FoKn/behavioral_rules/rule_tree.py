"""
Rule Knowledge Tree - Manages agent behavioral rules and mandates.

This module handles rule-based knowledge for AI agents, including strict rules
that must be followed and behavioral mandates.
"""

from ..core.forest_base import KnowledgeTree


class RuleKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent rules and mandates.
    
    Manages strict rules that the agent must follow, including
    behavioral mandates and compliance requirements.
    """
    
    def __init__(self):
        """Initialize the rule knowledge tree."""
        super().__init__(
            tree_name="Rules You Must Follow",
            tree_description="Mandatory rules and behavioral requirements"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format rule knowledge into agent instruction section.
        
        Returns:
            Formatted rule section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_rules = []
        for rule in self.knowledge_items:
            formatted_rules.append(f"- {rule}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_rules) + "\n"
    
    def add_mandatory_rule(self, rule: str) -> 'RuleKnowledgeTree':
        """
        Add a mandatory rule that must be followed.
        
        Args:
            rule: The mandatory rule description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(rule)
    
    def add_compliance_requirement(self, requirement: str) -> 'RuleKnowledgeTree':
        """
        Add a compliance requirement.
        
        Args:
            requirement: The compliance requirement description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(requirement)
    
    def add_behavioral_mandate(self, mandate: str) -> 'RuleKnowledgeTree':
        """
        Add a behavioral mandate or requirement.
        
        Args:
            mandate: The behavioral mandate description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(mandate)
    
    def add_safety_rule(self, rule: str) -> 'RuleKnowledgeTree':
        """
        Add a safety-related rule.
        
        Args:
            rule: The safety rule description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(rule)