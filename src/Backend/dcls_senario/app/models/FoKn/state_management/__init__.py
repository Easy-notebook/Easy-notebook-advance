"""
State Management Knowledge Area - Manages variables, understanding, and requirements.

This knowledge area handles all aspects of state management including
variable storage, understanding information, and requirement dependencies.
"""

from .variable_tree import VariableKnowledgeTree
from .understanding_tree import UnderstandingKnowledgeTree
from .requirement_tree import RequirementKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_state_management_area() -> KnowledgeArea:
    """
    Create a complete state management knowledge area.
    
    Returns:
        Configured knowledge area with all state management trees
    """
    area = KnowledgeArea(
        area_name="state_management",
        area_description="Variables, understanding, and requirements management"
    )
    
    # Add all state management knowledge trees
    area.add_knowledge_tree(VariableKnowledgeTree())
    area.add_knowledge_tree(UnderstandingKnowledgeTree())
    area.add_knowledge_tree(RequirementKnowledgeTree())
    
    return area


__all__ = [
    "VariableKnowledgeTree",
    "UnderstandingKnowledgeTree", 
    "RequirementKnowledgeTree",
    "create_state_management_area"
]