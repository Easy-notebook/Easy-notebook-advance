"""
Constraint Knowledge Tree - Manages agent operational constraints.

This module handles constraint-based knowledge for AI agents, including
operational boundaries, resource constraints, and performance limits.
"""

from ..core.forest_base import KnowledgeTree


class ConstraintKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent constraints and operational boundaries.
    
    Manages information about what constrains the agent's operations,
    including resource limits and operational boundaries.
    """
    
    def __init__(self):
        """Initialize the constraint knowledge tree."""
        super().__init__(
            tree_name="Your Constraints",
            tree_description="Operational boundaries and resource constraints"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format constraint knowledge into agent instruction section.
        
        Returns:
            Formatted constraint section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_constraints = []
        for constraint in self.knowledge_items:
            formatted_constraints.append(f"- {constraint}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_constraints) + "\n"
    
    def add_operational_constraint(self, constraint: str) -> 'ConstraintKnowledgeTree':
        """
        Add an operational constraint.
        
        Args:
            constraint: The operational constraint description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(constraint)
    
    def add_resource_limit(self, limit: str) -> 'ConstraintKnowledgeTree':
        """
        Add a resource limitation.
        
        Args:
            limit: The resource limit description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(limit)
    
    def add_performance_constraint(self, constraint: str) -> 'ConstraintKnowledgeTree':
        """
        Add a performance-related constraint.
        
        Args:
            constraint: The performance constraint description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(constraint)
    
    def add_access_constraint(self, constraint: str) -> 'ConstraintKnowledgeTree':
        """
        Add an access or permission constraint.
        
        Args:
            constraint: The access constraint description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(constraint)