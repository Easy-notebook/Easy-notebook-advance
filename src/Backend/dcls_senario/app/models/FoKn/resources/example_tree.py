"""
Example Knowledge Tree - Manages examples and demonstrations.

This module handles example-based knowledge for AI agents, including
demonstrations, use cases, and illustrative examples.
"""

from ..core.forest_base import KnowledgeTree


class ExampleKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for examples and demonstrations.
    
    Manages example content including demonstrations,
    use cases, and illustrative examples.
    """
    
    def __init__(self):
        """Initialize the example knowledge tree."""
        super().__init__(
            tree_name="Examples",
            tree_description="Demonstrations and illustrative examples"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format example knowledge into agent instruction section.
        
        Returns:
            Formatted example section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_examples = []
        for example in self.knowledge_items:
            formatted_examples.append(f"- {example}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_examples) + "\n"
    
    def add_example(self, example: str) -> 'ExampleKnowledgeTree':
        """
        Add an example or demonstration.
        
        Args:
            example: The example content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(example)
    
    def add_use_case(self, use_case: str) -> 'ExampleKnowledgeTree':
        """
        Add a use case example.
        
        Args:
            use_case: The use case description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Use Case] {use_case}")
    
    def add_demonstration(self, demonstration: str) -> 'ExampleKnowledgeTree':
        """
        Add a demonstration example.
        
        Args:
            demonstration: The demonstration content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Demo] {demonstration}")
    
    def add_code_example(self, code_example: str) -> 'ExampleKnowledgeTree':
        """
        Add a code example.
        
        Args:
            code_example: The code example
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Code Example] {code_example}")