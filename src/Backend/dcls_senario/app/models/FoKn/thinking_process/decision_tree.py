"""
Decision Knowledge Tree - Manages decision-making and action planning.

This module handles decision-based knowledge for AI agents, including
urgent decisions, recommended actions, and things to avoid.
"""

from ..core.forest_base import KnowledgeTree


class DecisionKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for decisions and action planning.
    
    Manages decision-making content including urgent actions,
    recommendations, and avoidance decisions.
    """
    
    def __init__(self):
        """Initialize the decision knowledge tree."""
        super().__init__(
            tree_name="Decisions and Actions",
            tree_description="Decision-making, actions, and behavioral guidance"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format decision knowledge into agent instruction section.
        
        Returns:
            Formatted decision section for agent instructions
        """
        if self.is_empty():
            return ""
        
        # Group decisions by type for better organization
        must_do = [item for item in self.knowledge_items if item.startswith("[Must Do]")]
        should_do = [item for item in self.knowledge_items if item.startswith("[Should Do]")]
        avoid = [item for item in self.knowledge_items if item.startswith("[Avoid]")]
        goals = [item for item in self.knowledge_items if item.startswith("[Goal]")]
        other = [item for item in self.knowledge_items if not any(item.startswith(prefix) for prefix in ["[Must Do]", "[Should Do]", "[Avoid]", "[Goal]"])]
        
        output_parts = []
        
        if must_do:
            formatted_must = [f"- {item[9:]}" for item in must_do]  # Remove [Must Do] prefix
            output_parts.append(f"\n## Must Do Actions\n" + "\n".join(formatted_must))
        
        if should_do:
            formatted_should = [f"- {item[11:]}" for item in should_do]  # Remove [Should Do] prefix  
            output_parts.append(f"\n## Recommended Actions\n" + "\n".join(formatted_should))
        
        if avoid:
            formatted_avoid = [f"- {item[7:]}" for item in avoid]  # Remove [Avoid] prefix
            output_parts.append(f"\n## Things to Avoid\n" + "\n".join(formatted_avoid))
        
        if goals:
            formatted_goals = [f"- {item[6:]}" for item in goals]  # Remove [Goal] prefix
            output_parts.append(f"\n## Goal Updates\n" + "\n".join(formatted_goals))
        
        if other:
            formatted_other = [f"- {item}" for item in other]
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_other))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_urgent_decision(self, action: str) -> 'DecisionKnowledgeTree':
        """
        Add an urgent action that must be taken.
        
        Args:
            action: The urgent action description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Must Do] {action}")
    
    def add_recommended_action(self, action: str) -> 'DecisionKnowledgeTree':
        """
        Add a recommended action or next step.
        
        Args:
            action: The recommended action description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Should Do] {action}")
    
    def add_avoidance_decision(self, item: str) -> 'DecisionKnowledgeTree':
        """
        Add something to avoid or stop doing.
        
        Args:
            item: The thing to avoid
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Avoid] {item}")
    
    def add_goal_decision(self, goal: str) -> 'DecisionKnowledgeTree':
        """
        Add a goal-related decision or update.
        
        Args:
            goal: The goal decision content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Goal] {goal}")
    
    def add_strategic_decision(self, decision: str) -> 'DecisionKnowledgeTree':
        """
        Add a strategic decision or planning element.
        
        Args:
            decision: The strategic decision content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(decision)