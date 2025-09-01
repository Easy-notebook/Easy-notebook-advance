"""
Practice Knowledge Tree - Manages best practices and learned practices.

This module handles practice-based knowledge for AI agents, including
best practices, learned methodologies, and effective approaches.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any


class PracticeKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for practices and methodologies.
    
    Manages information about effective practices, both predefined
    best practices and automatically learned practices from experience.
    """
    
    def __init__(self):
        """Initialize the practice knowledge tree."""
        super().__init__(
            tree_name="Best Practices",
            tree_description="Effective practices and methodologies"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format practice knowledge into agent instruction section.
        
        Returns:
            Formatted practice section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple practices
        if self.knowledge_items:
            formatted_practices = []
            for practice in self.knowledge_items:
                formatted_practices.append(f"- {practice}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_practices))
        
        # Format structured practices
        if self.structured_items:
            best_practices = self._format_best_practices()
            if best_practices:
                output_parts.append(best_practices)
            
            auto_practices = self._format_auto_learned_practices()
            if auto_practices:
                output_parts.append(auto_practices)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_best_practice(self, practice: str, context: str = "") -> 'PracticeKnowledgeTree':
        """
        Add a best practice with optional context.
        
        Args:
            practice: The best practice description
            context: Optional context where this practice applies
            
        Returns:
            Self for method chaining
        """
        practice_data = {
            "type": "best_practice",
            "practice": practice,
            "context": context
        }
        return self.add_structured_knowledge(practice_data)
    
    def add_learned_practice(self, practice: str, learned_from: str = "") -> 'PracticeKnowledgeTree':
        """
        Add an automatically learned practice.
        
        Args:
            practice: The learned practice description
            learned_from: Source or context where this was learned
            
        Returns:
            Self for method chaining
        """
        practice_data = {
            "type": "auto_learned_practice", 
            "practice": practice,
            "learned_from": learned_from
        }
        return self.add_structured_knowledge(practice_data)
    
    def add_methodology(self, methodology: str) -> 'PracticeKnowledgeTree':
        """
        Add a general methodology or approach.
        
        Args:
            methodology: The methodology description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(methodology)
    
    def _format_best_practices(self) -> str:
        """Format best practices section."""
        practices = [item for item in self.structured_items if item.get("type") == "best_practice"]
        if not practices:
            return ""
        
        formatted_practices = []
        for practice in practices:
            practice_str = f"- {practice['practice']}"
            if practice.get('context'):
                practice_str += f" (Context: {practice['context']})"
            formatted_practices.append(practice_str)
        
        return f"\n## Best Practices\n" + "\n".join(formatted_practices) + "\n"
    
    def _format_auto_learned_practices(self) -> str:
        """Format auto-learned practices section."""
        practices = [item for item in self.structured_items if item.get("type") == "auto_learned_practice"]
        if not practices:
            return ""
        
        formatted_practices = []
        for practice in practices:
            practice_str = f"- {practice['practice']}"
            if practice.get('learned_from'):
                practice_str += f" (Learned from: {practice['learned_from']})"
            formatted_practices.append(practice_str)
        
        return f"\n## Auto-Learned Practices\n" + "\n".join(formatted_practices) + "\n"