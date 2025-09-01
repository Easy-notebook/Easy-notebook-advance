"""
Workflow Knowledge Tree - Manages workflows and procedures.

This module handles workflow-based knowledge for AI agents, including
available workflows, workflow steps, and procedural information.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any


class WorkflowKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for workflows and procedures.
    
    Manages information about available workflows, workflow steps,
    and procedural knowledge.
    """
    
    def __init__(self):
        """Initialize the workflow knowledge tree."""
        super().__init__(
            tree_name="Available Workflows",
            tree_description="Workflows, procedures, and step-by-step processes"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format workflow knowledge into agent instruction section.
        
        Returns:
            Formatted workflow section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple workflow information
        if self.knowledge_items:
            formatted_workflows = []
            for workflow in self.knowledge_items:
                formatted_workflows.append(f"- {workflow}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_workflows))
        
        # Format structured workflow information
        if self.structured_items:
            workflows_output = self._format_available_workflows()
            if workflows_output:
                output_parts.append(workflows_output)
            
            steps_output = self._format_workflow_steps()
            if steps_output:
                output_parts.append(steps_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_available_workflow(self, workflow_name: str, description: str, suitable_for: str = "") -> 'WorkflowKnowledgeTree':
        """
        Add an available workflow.
        
        Args:
            workflow_name: Name of the workflow
            description: Description of the workflow
            suitable_for: What the workflow is suitable for
            
        Returns:
            Self for method chaining
        """
        workflow_data = {
            "type": "available_workflow",
            "name": workflow_name,
            "description": description,
            "suitable_for": suitable_for
        }
        return self.add_structured_knowledge(workflow_data)
    
    def add_workflow_step(self, workflow_name: str, step_number: int, step_description: str, notes: str = "") -> 'WorkflowKnowledgeTree':
        """
        Add a workflow step.
        
        Args:
            workflow_name: Name of the workflow this step belongs to
            step_number: Step number in the workflow
            step_description: Description of the step
            notes: Optional notes about the step
            
        Returns:
            Self for method chaining
        """
        step_data = {
            "type": "workflow_step",
            "workflow": workflow_name,
            "step": step_number,
            "description": step_description,
            "notes": notes
        }
        return self.add_structured_knowledge(step_data)
    
    def add_procedure(self, procedure_name: str, steps: str, when_to_use: str = "") -> 'WorkflowKnowledgeTree':
        """
        Add a standard procedure.
        
        Args:
            procedure_name: Name of the procedure
            steps: Steps in the procedure
            when_to_use: When to use this procedure
            
        Returns:
            Self for method chaining
        """
        procedure_data = {
            "type": "procedure",
            "name": procedure_name,
            "steps": steps,
            "when_to_use": when_to_use
        }
        return self.add_structured_knowledge(procedure_data)
    
    def _format_available_workflows(self) -> str:
        """Format available workflows section."""
        workflows = [item for item in self.structured_items if item.get("type") == "available_workflow"]
        if not workflows:
            return ""
        
        formatted_workflows = []
        for workflow in workflows:
            workflow_str = f"- **{workflow['name']}**: {workflow['description']}"
            if workflow.get('suitable_for'):
                workflow_str += f" (Suitable for: {workflow['suitable_for']})"
            formatted_workflows.append(workflow_str)
        
        return f"\n## Available Workflows\n" + "\n".join(formatted_workflows) + "\n"
    
    def _format_workflow_steps(self) -> str:
        """Format workflow steps section."""
        steps = [item for item in self.structured_items if item.get("type") == "workflow_step"]
        if not steps:
            return ""
        
        # Group steps by workflow
        workflows = {}
        for step in steps:
            workflow_name = step['workflow']
            if workflow_name not in workflows:
                workflows[workflow_name] = []
            workflows[workflow_name].append(step)
        
        formatted_sections = []
        for workflow_name, workflow_steps in workflows.items():
            formatted_sections.append(f"### {workflow_name}")
            # Sort steps by step number
            workflow_steps.sort(key=lambda x: x['step'])
            for step in workflow_steps:
                step_str = f"{step['step']}. {step['description']}"
                if step.get('notes'):
                    step_str += f" (Note: {step['notes']})"
                formatted_sections.append(step_str)
            formatted_sections.append("")  # Empty line between workflows
        
        return f"\n## Workflow Steps\n" + "\n".join(formatted_sections)