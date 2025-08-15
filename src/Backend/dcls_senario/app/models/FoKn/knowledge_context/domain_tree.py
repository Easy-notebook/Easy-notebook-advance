"""
Domain Knowledge Tree - Manages domain-specific expertise and knowledge.

This module handles domain-specific knowledge for AI agents, including
specialized expertise, industry knowledge, and technical domains.
"""

from ..core.forest_base import KnowledgeTree


class DomainKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for domain-specific expertise and specialized knowledge.
    
    Manages information about specialized domains, technical expertise,
    and industry-specific knowledge that the agent should be aware of.
    """
    
    def __init__(self):
        """Initialize the domain knowledge tree."""
        super().__init__(
            tree_name="Domain Knowledge",
            tree_description="Specialized domain expertise and technical knowledge"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format domain knowledge into agent instruction section.
        
        Returns:
            Formatted domain knowledge section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_knowledge = []
        for knowledge in self.knowledge_items:
            formatted_knowledge.append(f"- {knowledge}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_knowledge) + "\n"
    
    def add_domain_expertise(self, expertise: str) -> 'DomainKnowledgeTree':
        """
        Add domain-specific expertise.
        
        Args:
            expertise: The domain expertise description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(expertise)
    
    def add_technical_knowledge(self, knowledge: str) -> 'DomainKnowledgeTree':
        """
        Add technical knowledge or specification.
        
        Args:
            knowledge: The technical knowledge description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(knowledge)
    
    def add_industry_insight(self, insight: str) -> 'DomainKnowledgeTree':
        """
        Add industry-specific insight or knowledge.
        
        Args:
            insight: The industry insight description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(insight)
    
    def add_specialized_fact(self, fact: str) -> 'DomainKnowledgeTree':
        """
        Add specialized factual knowledge.
        
        Args:
            fact: The specialized fact description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(fact)