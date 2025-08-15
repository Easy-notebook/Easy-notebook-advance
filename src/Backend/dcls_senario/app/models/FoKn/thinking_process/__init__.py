"""
Thinking Process Knowledge Area - Manages analytical and reflective thinking.

This knowledge area handles all aspects of thinking processes including
analysis, decision-making, and reflective thinking.
"""

from .analysis_tree import AnalysisKnowledgeTree
from .decision_tree import DecisionKnowledgeTree
from .reflection_tree import ReflectionKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_thinking_process_area() -> KnowledgeArea:
    """
    Create a complete thinking process knowledge area.
    
    Returns:
        Configured knowledge area with all thinking-related trees
    """
    area = KnowledgeArea(
        area_name="thinking_process",
        area_description="Analysis, decision-making, and reflective thinking"
    )
    
    # Add all thinking-related knowledge trees
    area.add_knowledge_tree(AnalysisKnowledgeTree())
    area.add_knowledge_tree(DecisionKnowledgeTree())
    area.add_knowledge_tree(ReflectionKnowledgeTree())
    
    return area


__all__ = [
    "AnalysisKnowledgeTree",
    "DecisionKnowledgeTree",
    "ReflectionKnowledgeTree",
    "create_thinking_process_area"
]