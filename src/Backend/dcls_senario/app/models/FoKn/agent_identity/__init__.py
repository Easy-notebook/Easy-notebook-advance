"""
Agent Identity Knowledge Area - Manages agent identity, roles, and capabilities.

This knowledge area handles all aspects of agent identity including roles,
behavioral policies, and available capabilities.
"""

from .role_tree import RoleKnowledgeTree
from .policy_tree import PolicyKnowledgeTree  
from .capability_tree import CapabilityKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_agent_identity_area() -> KnowledgeArea:
    """
    Create a complete agent identity knowledge area.
    
    Returns:
        Configured knowledge area with all identity-related trees
    """
    area = KnowledgeArea(
        area_name="agent_identity",
        area_description="Agent identity, roles, policies, and capabilities"
    )
    
    # Add all identity-related knowledge trees
    area.add_knowledge_tree(RoleKnowledgeTree())
    area.add_knowledge_tree(PolicyKnowledgeTree())
    area.add_knowledge_tree(CapabilityKnowledgeTree())
    
    return area


__all__ = [
    "RoleKnowledgeTree",
    "PolicyKnowledgeTree", 
    "CapabilityKnowledgeTree",
    "create_agent_identity_area"
]