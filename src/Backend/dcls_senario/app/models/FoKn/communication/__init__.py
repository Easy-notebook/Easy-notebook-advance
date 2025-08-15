"""
Communication Knowledge Area - Manages agent communication and output formatting.

This knowledge area handles all aspects of agent communication including
output formatting, inter-agent protocols, and interaction patterns.
"""

from .output_format_tree import OutputFormatKnowledgeTree
from .agent_comm_tree import AgentCommunicationTree
from ..core.forest_base import KnowledgeArea


def create_communication_area() -> KnowledgeArea:
    """
    Create a complete communication knowledge area.
    
    Returns:
        Configured knowledge area with all communication-related trees
    """
    area = KnowledgeArea(
        area_name="communication", 
        area_description="Communication protocols, formats, and inter-agent interaction"
    )
    
    # Add all communication-related knowledge trees
    area.add_knowledge_tree(OutputFormatKnowledgeTree())
    area.add_knowledge_tree(AgentCommunicationTree())
    
    return area


__all__ = [
    "OutputFormatKnowledgeTree",
    "AgentCommunicationTree",
    "create_communication_area"
]