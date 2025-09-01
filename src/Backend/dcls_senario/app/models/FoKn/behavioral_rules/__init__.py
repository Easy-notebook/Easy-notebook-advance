"""
Behavioral Rules Knowledge Area - Manages agent behavioral rules and constraints.

This knowledge area handles all aspects of agent behavioral governance including
mandatory rules, operational constraints, and capability limitations.
"""

from .rule_tree import RuleKnowledgeTree
from .constraint_tree import ConstraintKnowledgeTree
from .limitation_tree import LimitationKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_behavioral_rules_area() -> KnowledgeArea:
    """
    Create a complete behavioral rules knowledge area.
    
    Returns:
        Configured knowledge area with all behavioral rule trees
    """
    area = KnowledgeArea(
        area_name="behavioral_rules",
        area_description="Behavioral rules, constraints, and limitations"
    )
    
    # Add all behavioral rule knowledge trees
    area.add_knowledge_tree(RuleKnowledgeTree())
    area.add_knowledge_tree(ConstraintKnowledgeTree())
    area.add_knowledge_tree(LimitationKnowledgeTree())
    
    return area


__all__ = [
    "RuleKnowledgeTree",
    "ConstraintKnowledgeTree",
    "LimitationKnowledgeTree", 
    "create_behavioral_rules_area"
]