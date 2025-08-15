"""
Output Format Knowledge Tree - Manages agent output formatting requirements.

This module handles output format knowledge for AI agents, including required
output structures, formatting guidelines, and response templates.
"""

from ..core.forest_base import KnowledgeTree


class OutputFormatKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for agent output formatting requirements.
    
    Manages information about how the agent should format its outputs,
    including required structures and formatting guidelines.
    """
    
    def __init__(self):
        """Initialize the output format knowledge tree."""
        super().__init__(
            tree_name="Your Output Format Requirements",
            tree_description="Required output structures and formatting guidelines"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format output format knowledge into agent instruction section.
        
        Returns:
            Formatted output format section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_formats = []
        for format_item in self.knowledge_items:
            formatted_formats.append(f"- {format_item}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_formats) + "\n"
    
    def add_output_format(self, format_specification: str) -> 'OutputFormatKnowledgeTree':
        """
        Add an output format specification.
        
        Args:
            format_specification: The output format specification
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(format_specification)
    
    def add_response_template(self, template: str) -> 'OutputFormatKnowledgeTree':
        """
        Add a response template or structure.
        
        Args:
            template: The response template description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(template)
    
    def add_formatting_rule(self, rule: str) -> 'OutputFormatKnowledgeTree':
        """
        Add a formatting rule or guideline.
        
        Args:
            rule: The formatting rule description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(rule)
    
    def add_tag_specification(self, tag_spec: str) -> 'OutputFormatKnowledgeTree':
        """
        Add a tag or markup specification.
        
        Args:
            tag_spec: The tag specification description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(tag_spec)