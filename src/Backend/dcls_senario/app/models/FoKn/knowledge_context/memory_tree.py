"""
Memory Knowledge Tree - Manages memory and historical information.

This module handles memory-based knowledge for AI agents, including
historical information, important memories, and things to remember.
"""

from ..core.forest_base import KnowledgeTree


class MemoryKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for memory and historical information.
    
    Manages memory-related information including historical context,
    important things to remember, and past experiences.
    """
    
    def __init__(self):
        """Initialize the memory knowledge tree."""
        super().__init__(
            tree_name="Memory & History",
            tree_description="Historical information and important memories"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format memory knowledge into agent instruction section.
        
        Returns:
            Formatted memory section for agent instructions
        """
        if self.is_empty():
            return ""
        
        # Group memory items by type
        memories = [item for item in self.knowledge_items if not any(item.startswith(prefix) for prefix in ["[Important]", "[Historical]", "[Remember]"])]
        important = [item for item in self.knowledge_items if item.startswith("[Important]")]
        historical = [item for item in self.knowledge_items if item.startswith("[Historical]")]
        remember = [item for item in self.knowledge_items if item.startswith("[Remember]")]
        
        output_parts = []
        
        if memories:
            formatted_memories = [f"- {item}" for item in memories]
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_memories))
        
        if important:
            formatted_important = [f"- {item[11:]}" for item in important]  # Remove [Important] prefix
            output_parts.append(f"\n## Important Memories\n" + "\n".join(formatted_important))
        
        if historical:
            formatted_historical = [f"- {item[12:]}" for item in historical]  # Remove [Historical] prefix
            output_parts.append(f"\n## Historical Context\n" + "\n".join(formatted_historical))
        
        if remember:
            formatted_remember = [f"- {item[10:]}" for item in remember]  # Remove [Remember] prefix
            output_parts.append(f"\n## Things to Remember\n" + "\n".join(formatted_remember))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_memory_item(self, memory: str) -> 'MemoryKnowledgeTree':
        """
        Add a general memory item.
        
        Args:
            memory: The memory information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(memory)
    
    def add_important_memory(self, memory: str) -> 'MemoryKnowledgeTree':
        """
        Add an important memory that should be prioritized.
        
        Args:
            memory: The important memory information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Important] {memory}")
    
    def add_historical_context(self, context: str) -> 'MemoryKnowledgeTree':
        """
        Add historical context or background information.
        
        Args:
            context: The historical context
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Historical] {context}")
    
    def add_remember_item(self, item: str) -> 'MemoryKnowledgeTree':
        """
        Add something important to remember for the future.
        
        Args:
            item: The thing to remember
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Remember] {item}")
    
    def add_past_experience(self, experience: str) -> 'MemoryKnowledgeTree':
        """
        Add information about past experiences.
        
        Args:
            experience: The past experience information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Past Experience] {experience}")