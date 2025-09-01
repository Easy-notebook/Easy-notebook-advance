"""
Context Knowledge Tree - Manages contextual information and environmental settings.

This module handles context-based knowledge for AI agents, including
current context, user preferences, environment settings, and current state.
"""

from ..core.forest_base import KnowledgeTree


class ContextKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for contextual information and environmental settings.
    
    Manages contextual information including current situation,
    user preferences, environment settings, and operational context.
    """
    
    def __init__(self):
        """Initialize the context knowledge tree."""
        super().__init__(
            tree_name="Your Current Context",
            tree_description="Contextual information and environmental settings"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format context knowledge into agent instruction section.
        
        Returns:
            Formatted context section for agent instructions
        """
        if self.is_empty():
            return ""
        
        # Group context items by type
        context_items = [item for item in self.knowledge_items if not any(item.startswith(prefix) for prefix in ["[Preference]", "[Environment]", "[State]", "[Special]"])]
        preferences = [item for item in self.knowledge_items if item.startswith("[Preference]")]
        environment = [item for item in self.knowledge_items if item.startswith("[Environment]")]
        states = [item for item in self.knowledge_items if item.startswith("[State]")]
        special = [item for item in self.knowledge_items if item.startswith("[Special]")]
        
        output_parts = []
        
        if context_items:
            formatted_context = [f"- {item}" for item in context_items]
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_context))
        
        if preferences:
            formatted_prefs = [f"- {item[12:]}" for item in preferences]  # Remove [Preference] prefix
            output_parts.append(f"\n## User Preferences\n" + "\n".join(formatted_prefs))
        
        if environment:
            formatted_env = [f"- {item[13:]}" for item in environment]  # Remove [Environment] prefix
            output_parts.append(f"\n## Environment Settings\n" + "\n".join(formatted_env))
        
        if states:
            formatted_states = [f"- {item[7:]}" for item in states]  # Remove [State] prefix
            output_parts.append(f"\n## Your Current State\n" + "\n".join(formatted_states))
        
        if special:
            formatted_special = [f"- {item[9:]}" for item in special]  # Remove [Special] prefix
            output_parts.append(f"\n## Special Instructions\n" + "\n".join(formatted_special))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_contextual_info(self, context: str) -> 'ContextKnowledgeTree':
        """
        Add contextual information about the current situation.
        
        Args:
            context: The contextual information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(context)
    
    def add_user_preference(self, preference: str) -> 'ContextKnowledgeTree':
        """
        Add user preference information.
        
        Args:
            preference: The user preference
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Preference] {preference}")
    
    def add_environment_setting(self, setting: str) -> 'ContextKnowledgeTree':
        """
        Add environment or system setting.
        
        Args:
            setting: The environment setting
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Environment] {setting}")
    
    def add_current_state(self, state: str) -> 'ContextKnowledgeTree':
        """
        Add current operational state information.
        
        Args:
            state: The current state information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[State] {state}")
    
    def add_special_instruction(self, instruction: str) -> 'ContextKnowledgeTree':
        """
        Add special instruction or requirement.
        
        Args:
            instruction: The special instruction
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Special] {instruction}")