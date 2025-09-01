"""
Learning Experience Knowledge Area - Manages learning, practices, and insights.

This knowledge area handles all aspects of learning and experience including
best practices, lessons learned, and insights gained from thinking processes.
"""

from .practice_tree import PracticeKnowledgeTree
from .lesson_tree import LessonKnowledgeTree
from .insight_tree import InsightKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_learning_experience_area() -> KnowledgeArea:
    """
    Create a complete learning experience knowledge area.
    
    Returns:
        Configured knowledge area with all learning-related trees
    """
    area = KnowledgeArea(
        area_name="learning_experience",
        area_description="Learning, practices, lessons, and insights from experience"
    )
    
    # Add all learning-related knowledge trees
    area.add_knowledge_tree(PracticeKnowledgeTree())
    area.add_knowledge_tree(LessonKnowledgeTree())
    area.add_knowledge_tree(InsightKnowledgeTree())
    
    return area


__all__ = [
    "PracticeKnowledgeTree",
    "LessonKnowledgeTree",
    "InsightKnowledgeTree",
    "create_learning_experience_area"
]