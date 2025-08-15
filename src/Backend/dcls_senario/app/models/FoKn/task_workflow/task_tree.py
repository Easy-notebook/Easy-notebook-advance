"""
Task Knowledge Tree - Manages current tasks and goals.

This module handles task-based knowledge for AI agents, including
current tasks, goals, and task-related information.
"""

from ..core.forest_base import KnowledgeTree


class TaskKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for current tasks and goals.
    
    Manages information about current tasks, objectives,
    and task-related priorities.
    """
    
    def __init__(self):
        """Initialize the task knowledge tree."""
        super().__init__(
            tree_name="Your Current Tasks",
            tree_description="Current tasks, goals, and objectives"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format task knowledge into agent instruction section.
        
        Returns:
            Formatted task section for agent instructions
        """
        if self.is_empty():
            return ""
        
        # Group tasks by type
        tasks = [item for item in self.knowledge_items if not any(item.startswith(prefix) for prefix in ["[Goal]", "[Priority]", "[Objective]"])]
        goals = [item for item in self.knowledge_items if item.startswith("[Goal]")]
        priorities = [item for item in self.knowledge_items if item.startswith("[Priority]")]
        objectives = [item for item in self.knowledge_items if item.startswith("[Objective]")]
        
        output_parts = []
        
        if tasks:
            formatted_tasks = [f"- {item}" for item in tasks]
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_tasks))
        
        if goals:
            formatted_goals = [f"- {item[6:]}" for item in goals]  # Remove [Goal] prefix
            output_parts.append(f"\n## Your Goals\n" + "\n".join(formatted_goals))
        
        if priorities:
            formatted_priorities = [f"- {item[10:]}" for item in priorities]  # Remove [Priority] prefix
            output_parts.append(f"\n## Priority Tasks\n" + "\n".join(formatted_priorities))
        
        if objectives:
            formatted_objectives = [f"- {item[11:]}" for item in objectives]  # Remove [Objective] prefix
            output_parts.append(f"\n## Objectives\n" + "\n".join(formatted_objectives))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_current_task(self, task: str) -> 'TaskKnowledgeTree':
        """
        Add a current task.
        
        Args:
            task: The current task description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(task)
    
    def add_goal(self, goal: str) -> 'TaskKnowledgeTree':
        """
        Add a goal or objective.
        
        Args:
            goal: The goal description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Goal] {goal}")
    
    def add_priority_task(self, task: str) -> 'TaskKnowledgeTree':
        """
        Add a high-priority task.
        
        Args:
            task: The priority task description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Priority] {task}")
    
    def add_objective(self, objective: str) -> 'TaskKnowledgeTree':
        """
        Add an objective or target.
        
        Args:
            objective: The objective description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Objective] {objective}")