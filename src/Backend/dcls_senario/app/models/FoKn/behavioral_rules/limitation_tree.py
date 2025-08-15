"""
Limitation Knowledge Tree - Manages agent capability limitations.

This module handles limitation-based knowledge for AI agents, including
capability limits, known weaknesses, and areas where the agent cannot operate.
"""

from ..core.forest_base import KnowledgeTree


class LimitationKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent limitations and capability boundaries.
    
    Manages information about the agent's limitations, including
    areas where it cannot operate effectively or has reduced capability.
    """
    
    def __init__(self):
        """Initialize the limitation knowledge tree."""
        super().__init__(
            tree_name="Limitations",
            tree_description="Capability limitations and known weaknesses"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format limitation knowledge into agent instruction section.
        
        Returns:
            Formatted limitation section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_limitations = []
        for limitation in self.knowledge_items:
            formatted_limitations.append(f"- {limitation}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_limitations) + "\n"
    
    def add_capability_limitation(self, limitation: str) -> 'LimitationKnowledgeTree':
        """
        Add a capability limitation.
        
        Args:
            limitation: The capability limitation description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(limitation)
    
    def add_knowledge_gap(self, gap: str) -> 'LimitationKnowledgeTree':
        """
        Add a known knowledge gap or weakness.
        
        Args:
            gap: The knowledge gap description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(gap)
    
    def add_technical_limitation(self, limitation: str) -> 'LimitationKnowledgeTree':
        """
        Add a technical limitation.
        
        Args:
            limitation: The technical limitation description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(limitation)
    
    def add_scope_limitation(self, limitation: str) -> 'LimitationKnowledgeTree':
        """
        Add a scope or domain limitation.
        
        Args:
            limitation: The scope limitation description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(limitation)