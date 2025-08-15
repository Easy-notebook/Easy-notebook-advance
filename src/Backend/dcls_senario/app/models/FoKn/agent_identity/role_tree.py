"""
Role Knowledge Tree - Manages agent role and identity definitions.

This module handles role-based knowledge for AI agents, including identity,
responsibilities, and behavioral characteristics.
"""

from ..core.forest_base import KnowledgeTree


class RoleKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent role definitions and identity.
    
    Manages information about what the agent is, its primary purpose,
    and its core identity characteristics.
    """
    
    def __init__(self):
        """Initialize the role knowledge tree."""
        super().__init__(
            tree_name="Your Identity",
            tree_description="Defines the agent's role, identity, and core purpose"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format role knowledge into agent instruction section.
        
        Returns:
            Formatted role section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_roles = []
        for role in self.knowledge_items:
            formatted_roles.append(f"- {role}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_roles) + "\n"
    
    def add_primary_role(self, role: str) -> 'RoleKnowledgeTree':
        """
        Add a primary role definition for the agent.
        
        Args:
            role: The primary role description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(role)
    
    def add_responsibility(self, responsibility: str) -> 'RoleKnowledgeTree':
        """
        Add a responsibility to the agent's role.
        
        Args:
            responsibility: The responsibility description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(responsibility)
    
    def add_identity_trait(self, trait: str) -> 'RoleKnowledgeTree':
        """
        Add an identity trait or characteristic.
        
        Args:
            trait: The identity trait description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(trait)