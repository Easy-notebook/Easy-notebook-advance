"""
Analysis Knowledge Tree - Manages analytical thinking and risk assessments.

This module handles analysis-based knowledge for AI agents, including
analytical thoughts, risk assessments, and systematic evaluations.
"""

from ..core.forest_base import KnowledgeTree


class AnalysisKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for analytical thinking and assessments.
    
    Manages analytical content including risk assessments,
    systematic evaluations, and analytical insights.
    """
    
    def __init__(self):
        """Initialize the analysis knowledge tree."""
        super().__init__(
            tree_name="Recent Analyses",
            tree_description="Analytical thinking, risk assessments, and evaluations"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format analysis knowledge into agent instruction section.
        
        Returns:
            Formatted analysis section for agent instructions
        """
        if self.is_empty():
            return ""
        
        formatted_analyses = []
        for analysis in self.knowledge_items:
            formatted_analyses.append(f"- {analysis}")
        
        return f"\n{self.get_section_title()}\n" + "\n".join(formatted_analyses) + "\n"
    
    def add_analysis(self, analysis: str) -> 'AnalysisKnowledgeTree':
        """
        Add an analytical observation or evaluation.
        
        Args:
            analysis: The analytical content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(analysis)
    
    def add_risk_analysis(self, risk: str) -> 'AnalysisKnowledgeTree':
        """
        Add a risk assessment or identification.
        
        Args:
            risk: The risk analysis content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Risk] {risk}")
    
    def add_systematic_evaluation(self, evaluation: str) -> 'AnalysisKnowledgeTree':
        """
        Add a systematic evaluation or assessment.
        
        Args:
            evaluation: The evaluation content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Evaluation] {evaluation}")
    
    def add_comparative_analysis(self, analysis: str) -> 'AnalysisKnowledgeTree':
        """
        Add a comparative analysis.
        
        Args:
            analysis: The comparative analysis content
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Comparative] {analysis}")