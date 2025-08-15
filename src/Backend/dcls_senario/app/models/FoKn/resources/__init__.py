"""
Resources Knowledge Area - Manages templates, examples, and resources.

This knowledge area handles all resource-related aspects including
templates, examples, references, and external resources.
"""

from .template_tree import TemplateKnowledgeTree
from .example_tree import ExampleKnowledgeTree
from .resource_tree import ResourceKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_resources_area() -> KnowledgeArea:
    """
    Create a complete resources knowledge area.
    
    Returns:
        Configured knowledge area with all resource-related trees
    """
    area = KnowledgeArea(
        area_name="resources",
        area_description="Templates, examples, and external resources"
    )
    
    # Add all resource-related knowledge trees
    area.add_knowledge_tree(TemplateKnowledgeTree())
    area.add_knowledge_tree(ExampleKnowledgeTree())
    area.add_knowledge_tree(ResourceKnowledgeTree())
    
    return area


__all__ = [
    "TemplateKnowledgeTree",
    "ExampleKnowledgeTree",
    "ResourceKnowledgeTree",
    "create_resources_area"
]