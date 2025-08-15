"""
Resource Knowledge Tree - Manages resources and references.

This module handles resource-based knowledge for AI agents, including
references, documentation, tools, and external resources.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any


class ResourceKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for resources and references.
    
    Manages resource information including references,
    documentation, tools, and external resources.
    """
    
    def __init__(self):
        """Initialize the resource knowledge tree."""
        super().__init__(
            tree_name="Resources",
            tree_description="References, documentation, and external resources"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format resource knowledge into agent instruction section.
        
        Returns:
            Formatted resource section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple resources
        if self.knowledge_items:
            formatted_resources = []
            for resource in self.knowledge_items:
                formatted_resources.append(f"- {resource}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_resources))
        
        # Format structured resources
        if self.structured_items:
            procedures_output = self._format_procedures()
            if procedures_output:
                output_parts.append(procedures_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_resource(self, resource: str) -> 'ResourceKnowledgeTree':
        """
        Add a general resource.
        
        Args:
            resource: The resource description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(resource)
    
    def add_reference(self, reference: str) -> 'ResourceKnowledgeTree':
        """
        Add a reference or citation.
        
        Args:
            reference: The reference information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Reference] {reference}")
    
    def add_documentation(self, doc_title: str, doc_description: str) -> 'ResourceKnowledgeTree':
        """
        Add documentation reference.
        
        Args:
            doc_title: Title of the documentation
            doc_description: Description of the documentation
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Documentation] {doc_title}: {doc_description}")
    
    def add_tool_reference(self, tool_name: str, tool_description: str) -> 'ResourceKnowledgeTree':
        """
        Add tool reference.
        
        Args:
            tool_name: Name of the tool
            tool_description: Description of the tool
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Tool] {tool_name}: {tool_description}")
    
    def add_procedure(self, procedure_name: str, steps: str, when_to_use: str = "") -> 'ResourceKnowledgeTree':
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
    
    def _format_procedures(self) -> str:
        """Format procedures section."""
        procedures = [item for item in self.structured_items if item.get("type") == "procedure"]
        if not procedures:
            return ""
        
        formatted_procedures = []
        for procedure in procedures:
            procedure_str = f"- **{procedure['name']}**: {procedure['steps']}"
            if procedure.get('when_to_use'):
                procedure_str += f" (When to use: {procedure['when_to_use']})"
            formatted_procedures.append(procedure_str)
        
        return f"\n## Standard Procedures\n" + "\n".join(formatted_procedures) + "\n"