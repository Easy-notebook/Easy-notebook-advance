"""
Knowledge Context Area - Manages contextual knowledge and domain expertise.

This knowledge area handles contextual information, domain knowledge,
user preferences, and environmental settings.
"""

from .domain_tree import DomainKnowledgeTree
from .context_tree import ContextKnowledgeTree
from .memory_tree import MemoryKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_knowledge_context_area() -> KnowledgeArea:
    """
    Create a complete knowledge context area.
    
    Returns:
        Configured knowledge area with all context-related trees
    """
    area = KnowledgeArea(
        area_name="knowledge_context",
        area_description="Domain knowledge, context, and environmental information"
    )
    
    # Add all context-related knowledge trees
    area.add_knowledge_tree(DomainKnowledgeTree())
    area.add_knowledge_tree(ContextKnowledgeTree())
    area.add_knowledge_tree(MemoryKnowledgeTree())
    
    return area


__all__ = [
    "DomainKnowledgeTree",
    "ContextKnowledgeTree",
    "MemoryKnowledgeTree",
    "create_knowledge_context_area"
]