"""
Lesson Knowledge Tree - Manages lessons learned and experience-based knowledge.

This module handles lesson-based knowledge for AI agents, including
lessons learned from experience, mistakes to avoid, and wisdom gained.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any


class LessonKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for lessons learned and experiential knowledge.
    
    Manages information about lessons learned from experience,
    including both successful outcomes and failures to learn from.
    """
    
    def __init__(self):
        """Initialize the lesson knowledge tree."""
        super().__init__(
            tree_name="Lessons Learned",
            tree_description="Experience-based lessons and wisdom gained"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format lesson knowledge into agent instruction section.
        
        Returns:
            Formatted lesson section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple lessons
        if self.knowledge_items:
            formatted_lessons = []
            for lesson in self.knowledge_items:
                formatted_lessons.append(f"- {lesson}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_lessons))
        
        # Format structured lessons
        if self.structured_items:
            lessons_output = self._format_structured_lessons()
            if lessons_output:
                output_parts.append(lessons_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_lesson_learned(self, lesson: str, situation: str = "") -> 'LessonKnowledgeTree':
        """
        Add a lesson learned from experience.
        
        Args:
            lesson: The lesson learned
            situation: Optional situation or context where this was learned
            
        Returns:
            Self for method chaining
        """
        lesson_data = {
            "type": "lesson_learned",
            "lesson": lesson,
            "situation": situation
        }
        return self.add_structured_knowledge(lesson_data)
    
    def add_failure_lesson(self, lesson: str, failure_context: str = "") -> 'LessonKnowledgeTree':
        """
        Add a lesson learned from a failure or mistake.
        
        Args:
            lesson: The lesson learned from the failure
            failure_context: Context of the failure that led to this lesson
            
        Returns:
            Self for method chaining
        """
        lesson_data = {
            "type": "failure_lesson",
            "lesson": lesson,
            "failure_context": failure_context
        }
        return self.add_structured_knowledge(lesson_data)
    
    def add_success_lesson(self, lesson: str, success_context: str = "") -> 'LessonKnowledgeTree':
        """
        Add a lesson learned from a successful outcome.
        
        Args:
            lesson: The lesson learned from success
            success_context: Context of the success that led to this lesson
            
        Returns:
            Self for method chaining
        """
        lesson_data = {
            "type": "success_lesson",
            "lesson": lesson,
            "success_context": success_context
        }
        return self.add_structured_knowledge(lesson_data)
    
    def add_general_wisdom(self, wisdom: str) -> 'LessonKnowledgeTree':
        """
        Add general wisdom or experiential knowledge.
        
        Args:
            wisdom: The wisdom or general knowledge
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(wisdom)
    
    def _format_structured_lessons(self) -> str:
        """Format structured lessons section."""
        if not self.structured_items:
            return ""
        
        formatted_lessons = []
        for lesson_item in self.structured_items:
            lesson_type = lesson_item.get("type", "lesson_learned")
            lesson = lesson_item.get("lesson", "")
            
            if lesson_type == "lesson_learned":
                lesson_str = f"- {lesson}"
                if lesson_item.get('situation'):
                    lesson_str += f" (Situation: {lesson_item['situation']})"
            elif lesson_type == "failure_lesson":
                lesson_str = f"- {lesson} [From Failure]"
                if lesson_item.get('failure_context'):
                    lesson_str += f" (Context: {lesson_item['failure_context']})"
            elif lesson_type == "success_lesson":
                lesson_str = f"- {lesson} [From Success]"
                if lesson_item.get('success_context'):
                    lesson_str += f" (Context: {lesson_item['success_context']})"
            else:
                lesson_str = f"- {lesson}"
            
            formatted_lessons.append(lesson_str)
        
        if not formatted_lessons:
            return ""
        
        return f"\n## Lessons Learned\n" + "\n".join(formatted_lessons) + "\n"