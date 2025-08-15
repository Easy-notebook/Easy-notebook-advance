"""
Insight Knowledge Tree - Manages insights and realizations from thinking processes.

This module handles insight-based knowledge for AI agents, including
insights gained from thinking, analysis, and reflection processes.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any


class InsightKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for insights and realizations.
    
    Manages insights gained from thinking processes, analysis,
    and reflective activities that lead to new understanding.
    """
    
    def __init__(self):
        """Initialize the insight knowledge tree."""
        super().__init__(
            tree_name="Accumulated Insights from Thinking",
            tree_description="Insights and realizations from thinking processes"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format insight knowledge into agent instruction section.
        
        Returns:
            Formatted insight section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple insights
        if self.knowledge_items:
            formatted_insights = []
            for insight in self.knowledge_items:
                formatted_insights.append(f"- {insight}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_insights))
        
        # Format structured insights
        if self.structured_items:
            insights_output = self._format_structured_insights()
            if insights_output:
                output_parts.append(insights_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_insight(self, insight: str, context: str = "") -> 'InsightKnowledgeTree':
        """
        Add an insight with optional context.
        
        Args:
            insight: The insight or realization
            context: Optional context where this insight was gained
            
        Returns:
            Self for method chaining
        """
        insight_data = {
            "type": "insight",
            "insight": insight,
            "context": context,
            "source": "thinking_process"
        }
        return self.add_structured_knowledge(insight_data)
    
    def add_thinking_insight(self, insight: str, thinking_context: str = "") -> 'InsightKnowledgeTree':
        """
        Add an insight specifically from thinking processes.
        
        Args:
            insight: The insight gained from thinking
            thinking_context: Context of the thinking process
            
        Returns:
            Self for method chaining
        """
        insight_data = {
            "type": "thinking_insight",
            "insight": insight,
            "thinking_context": thinking_context,
            "source": "think_tag"
        }
        return self.add_structured_knowledge(insight_data)
    
    def add_analytical_insight(self, insight: str, analysis_context: str = "") -> 'InsightKnowledgeTree':
        """
        Add an insight from analytical processes.
        
        Args:
            insight: The insight from analysis
            analysis_context: Context of the analysis
            
        Returns:
            Self for method chaining
        """
        insight_data = {
            "type": "analytical_insight",
            "insight": insight,
            "analysis_context": analysis_context,
            "source": "analysis"
        }
        return self.add_structured_knowledge(insight_data)
    
    def add_realization(self, realization: str) -> 'InsightKnowledgeTree':
        """
        Add a general realization or understanding.
        
        Args:
            realization: The realization or new understanding
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(realization)
    
    def _format_structured_insights(self) -> str:
        """Format structured insights section."""
        if not self.structured_items:
            return ""
        
        formatted_insights = []
        for insight_item in self.structured_items:
            insight_type = insight_item.get("type", "insight")
            insight = insight_item.get("insight", "")
            
            if insight_type == "insight":
                insight_str = f"- {insight}"
                if insight_item.get('context'):
                    insight_str += f" (Context: {insight_item['context']})"
            elif insight_type == "thinking_insight":
                insight_str = f"- {insight} [From Thinking]"
                if insight_item.get('thinking_context'):
                    insight_str += f" (Context: {insight_item['thinking_context']})"
            elif insight_type == "analytical_insight":
                insight_str = f"- {insight} [From Analysis]"
                if insight_item.get('analysis_context'):
                    insight_str += f" (Context: {insight_item['analysis_context']})"
            else:
                insight_str = f"- {insight}"
            
            formatted_insights.append(insight_str)
        
        if not formatted_insights:
            return ""
        
        return f"\n## Accumulated Insights from Thinking\n" + "\n".join(formatted_insights) + "\n"