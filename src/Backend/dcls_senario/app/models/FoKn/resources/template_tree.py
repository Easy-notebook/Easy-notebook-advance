"""
Template Knowledge Tree - Manages templates and reusable patterns.

This module handles template-based knowledge for AI agents, including
reusable templates, patterns, and standardized formats.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any


class TemplateKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for templates and reusable patterns.
    
    Manages template information including standardized formats,
    reusable patterns, and template specifications.
    """
    
    def __init__(self):
        """Initialize the template knowledge tree."""
        super().__init__(
            tree_name="Available Templates",
            tree_description="Reusable templates and standardized patterns"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format template knowledge into agent instruction section.
        
        Returns:
            Formatted template section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple template information
        if self.knowledge_items:
            formatted_templates = []
            for template in self.knowledge_items:
                formatted_templates.append(f"- {template}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_templates))
        
        # Format structured template information
        if self.structured_items:
            templates_output = self._format_structured_templates()
            if templates_output:
                output_parts.append(templates_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_template(self, template_name: str, description: str, use_case: str = "") -> 'TemplateKnowledgeTree':
        """
        Add a template with description and use case.
        
        Args:
            template_name: Name of the template
            description: Description of the template
            use_case: When to use this template
            
        Returns:
            Self for method chaining
        """
        template_data = {
            "type": "template",
            "name": template_name,
            "description": description,
            "use_case": use_case
        }
        return self.add_structured_knowledge(template_data)
    
    def add_pattern(self, pattern_name: str, pattern_description: str) -> 'TemplateKnowledgeTree':
        """
        Add a reusable pattern.
        
        Args:
            pattern_name: Name of the pattern
            pattern_description: Description of the pattern
            
        Returns:
            Self for method chaining
        """
        pattern_data = {
            "type": "pattern",
            "name": pattern_name,
            "description": pattern_description
        }
        return self.add_structured_knowledge(pattern_data)
    
    def add_format_specification(self, format_name: str, specification: str) -> 'TemplateKnowledgeTree':
        """
        Add a format specification.
        
        Args:
            format_name: Name of the format
            specification: The format specification
            
        Returns:
            Self for method chaining
        """
        format_data = {
            "type": "format",
            "name": format_name,
            "specification": specification
        }
        return self.add_structured_knowledge(format_data)
    
    def add_template_content(self, content: str) -> 'TemplateKnowledgeTree':
        """
        Add general template content.
        
        Args:
            content: The template content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(content)
    
    def _format_structured_templates(self) -> str:
        """Format structured templates section."""
        if not self.structured_items:
            return ""
        
        templates = [item for item in self.structured_items if item.get("type") == "template"]
        patterns = [item for item in self.structured_items if item.get("type") == "pattern"]
        formats = [item for item in self.structured_items if item.get("type") == "format"]
        
        output_parts = []
        
        if templates:
            formatted_templates = []
            for template in templates:
                template_str = f"- **{template['name']}**: {template['description']}"
                if template.get('use_case'):
                    template_str += f" (Use case: {template['use_case']})"
                formatted_templates.append(template_str)
            output_parts.append(f"\n## Available Templates\n" + "\n".join(formatted_templates))
        
        if patterns:
            formatted_patterns = []
            for pattern in patterns:
                pattern_str = f"- **{pattern['name']}**: {pattern['description']}"
                formatted_patterns.append(pattern_str)
            output_parts.append(f"\n## Reusable Patterns\n" + "\n".join(formatted_patterns))
        
        if formats:
            formatted_formats = []
            for format_item in formats:
                format_str = f"- **{format_item['name']}**: {format_item['specification']}"
                formatted_formats.append(format_str)
            output_parts.append(f"\n## Format Specifications\n" + "\n".join(formatted_formats))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""