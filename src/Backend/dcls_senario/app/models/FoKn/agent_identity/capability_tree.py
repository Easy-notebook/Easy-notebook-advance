"""
Capability Knowledge Tree - Manages agent tools and capabilities.

This module handles capability-based knowledge for AI agents, including available
tools, skills, and functional abilities.
"""

from ..core.forest_base import KnowledgeTree


class CapabilityKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent capabilities and available tools.
    
    Manages information about what the agent can do, what tools it has
    access to, and its functional capabilities.
    """
    
    def __init__(self):
        """Initialize the capability knowledge tree."""
        super().__init__(
            tree_name="Your Capabilities", 
            tree_description="Defines available tools, skills, and functional abilities"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format capability knowledge into agent instruction section.
        
        Returns:
            Formatted capability section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_capabilities = []
        for capability in self.knowledge_items:
            formatted_capabilities.append(f"- {capability}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_capabilities) + "\n"
    
    def add_tool(self, tool_description: str) -> 'CapabilityKnowledgeTree':
        """
        Add a tool or capability description.
        
        Args:
            tool_description: Description of the tool or capability
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(tool_description)
    
    def add_skill(self, skill_description: str) -> 'CapabilityKnowledgeTree':
        """
        Add a skill or functional ability.
        
        Args:
            skill_description: Description of the skill
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(skill_description)
    
    def add_functional_ability(self, ability: str) -> 'CapabilityKnowledgeTree':
        """
        Add a functional ability description.
        
        Args:
            ability: The functional ability description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(ability)
    
    def add_technical_capability(self, capability: str) -> 'CapabilityKnowledgeTree':
        """
        Add a technical capability or feature.
        
        Args:
            capability: The technical capability description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(capability)