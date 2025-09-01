"""
Task Workflow Knowledge Area - Manages tasks, workflows, and planning.

This knowledge area handles all aspects of task management including
current tasks, available workflows, and strategic planning.
"""

from .task_tree import TaskKnowledgeTree
from .workflow_tree import WorkflowKnowledgeTree
from .plan_tree import PlanKnowledgeTree
from ..core.forest_base import KnowledgeArea


def create_task_workflow_area() -> KnowledgeArea:
    """
    Create a complete task workflow knowledge area.
    
    Returns:
        Configured knowledge area with all task-related trees
    """
    area = KnowledgeArea(
        area_name="task_workflow",
        area_description="Tasks, workflows, and planning"
    )
    
    # Add all task-related knowledge trees
    area.add_knowledge_tree(TaskKnowledgeTree())
    area.add_knowledge_tree(WorkflowKnowledgeTree())
    area.add_knowledge_tree(PlanKnowledgeTree())
    
    return area


__all__ = [
    "TaskKnowledgeTree",
    "WorkflowKnowledgeTree",
    "PlanKnowledgeTree",
    "create_task_workflow_area"
]