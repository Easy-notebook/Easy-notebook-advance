"""
Reflection Knowledge Tree - Manages reflective thinking and questions.

This module handles reflection-based knowledge for AI agents, including
state reflections, questions for consideration, and reflective insights.
"""

from ..core.forest_base import KnowledgeTree


class ReflectionKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for reflective thinking and questions.
    
    Manages reflective content including state assessments,
    questions to consider, and reflective observations.
    """
    
    def __init__(self):
        """Initialize the reflection knowledge tree."""
        super().__init__(
            tree_name="Reflections and Questions",
            tree_description="Reflective thinking, state assessments, and questions"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format reflection knowledge into agent instruction section.
        
        Returns:
            Formatted reflection section for agent instructions
        """
        if self.is_empty():
            return ""
        
        # Group reflections by type
        state_reflections = [item for item in self.knowledge_items if item.startswith("[State]")]
        questions = [item for item in self.knowledge_items if item.startswith("[Question]")]
        other_reflections = [item for item in self.knowledge_items if not any(item.startswith(prefix) for prefix in ["[State]", "[Question]"])]
        
        output_parts = []
        
        if state_reflections:
            formatted_states = [f"- {item[7:]}" for item in state_reflections]  # Remove [State] prefix
            output_parts.append(f"\n## Current State Reflections\n" + "\n".join(formatted_states))
        
        if questions:
            formatted_questions = [f"- {item[10:]}" for item in questions]  # Remove [Question] prefix
            output_parts.append(f"\n## Questions to Consider\n" + "\n".join(formatted_questions))
        
        if other_reflections:
            formatted_other = [f"- {item}" for item in other_reflections]
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_other))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_state_reflection(self, state: str) -> 'ReflectionKnowledgeTree':
        """
        Add a state reflection or assessment.
        
        Args:
            state: The state reflection content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[State] {state}")
    
    def add_question(self, question: str) -> 'ReflectionKnowledgeTree':
        """
        Add a question for consideration.
        
        Args:
            question: The question to consider
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Question] {question}")
    
    def add_self_reflection(self, reflection: str) -> 'ReflectionKnowledgeTree':
        """
        Add a self-reflective observation.
        
        Args:
            reflection: The self-reflection content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Self-Reflection] {reflection}")
    
    def add_progress_reflection(self, reflection: str) -> 'ReflectionKnowledgeTree':
        """
        Add a progress-related reflection.
        
        Args:
            reflection: The progress reflection content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Progress] {reflection}")
    
    def add_general_reflection(self, reflection: str) -> 'ReflectionKnowledgeTree':
        """
        Add a general reflective thought.
        
        Args:
            reflection: The general reflection content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(reflection)