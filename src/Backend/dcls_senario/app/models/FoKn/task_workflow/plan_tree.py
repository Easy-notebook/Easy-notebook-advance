"""
Plan Knowledge Tree - Manages plans and strategic planning.

This module handles plan-based knowledge for AI agents, including
strategic plans, tactical plans, and planning information.
"""

from ..core.forest_base import KnowledgeTree


class PlanKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree for plans and strategic planning.
    
    Manages planning information including strategic plans,
    tactical approaches, and planning considerations.
    """
    
    def __init__(self):
        """Initialize the plan knowledge tree."""
        super().__init__(
            tree_name="Plans",
            tree_description="Strategic and tactical plans"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format plan knowledge into agent instruction section.
        
        Returns:
            Formatted plan section for agent instructions
        """
        if self.is_empty():
            return ""
        
        # Group plans by type
        plans = [item for item in self.knowledge_items if not any(item.startswith(prefix) for prefix in ["[Strategic]", "[Tactical]", "[Contingency]"])]
        strategic = [item for item in self.knowledge_items if item.startswith("[Strategic]")]
        tactical = [item for item in self.knowledge_items if item.startswith("[Tactical]")]
        contingency = [item for item in self.knowledge_items if item.startswith("[Contingency]")]
        
        output_parts = []
        
        if plans:
            formatted_plans = [f"- {item}" for item in plans]
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_plans))
        
        if strategic:
            formatted_strategic = [f"- {item[12:]}" for item in strategic]  # Remove [Strategic] prefix
            output_parts.append(f"\n## Strategic Plans\n" + "\n".join(formatted_strategic))
        
        if tactical:
            formatted_tactical = [f"- {item[10:]}" for item in tactical]  # Remove [Tactical] prefix
            output_parts.append(f"\n## Tactical Plans\n" + "\n".join(formatted_tactical))
        
        if contingency:
            formatted_contingency = [f"- {item[13:]}" for item in contingency]  # Remove [Contingency] prefix
            output_parts.append(f"\n## Contingency Plans\n" + "\n".join(formatted_contingency))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_strategic_plan(self, plan: str) -> 'PlanKnowledgeTree':
        """
        Add a strategic plan.
        
        Args:
            plan: The strategic plan description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Strategic] {plan}")
    
    def add_tactical_plan(self, plan: str) -> 'PlanKnowledgeTree':
        """
        Add a tactical plan.
        
        Args:
            plan: The tactical plan description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Tactical] {plan}")
    
    def add_contingency_plan(self, plan: str) -> 'PlanKnowledgeTree':
        """
        Add a contingency plan.
        
        Args:
            plan: The contingency plan description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(f"[Contingency] {plan}")
    
    def add_general_plan(self, plan: str) -> 'PlanKnowledgeTree':
        """
        Add a general plan.
        
        Args:
            plan: The general plan description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(plan)