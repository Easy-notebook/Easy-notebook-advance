"""
Understanding Knowledge Tree - Manages understanding and recognition information.

This module handles understanding-based knowledge for AI agents, including
cognitive understanding, recognition patterns, and learning comprehension.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any, List


class UnderstandingKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for understanding and recognition information.
    
    Manages cognitive understanding, pattern recognition, comprehension
    levels, and learning insights about concepts and situations.
    """
    
    def __init__(self):
        """Initialize the understanding knowledge tree."""
        super().__init__(
            tree_name="Understanding & Recognition",
            tree_description="Cognitive understanding and recognition patterns"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format understanding knowledge into agent instruction section.
        
        Returns:
            Formatted understanding section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Format simple understanding information
        if self.knowledge_items:
            formatted_understanding = []
            for understanding in self.knowledge_items:
                formatted_understanding.append(f"- {understanding}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_understanding))
        
        # Format structured understanding information
        if self.structured_items:
            structured_output = self._format_structured_understanding()
            if structured_output:
                output_parts.append(structured_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_concept_understanding(self, concept: str, understanding_level: str, description: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add understanding about a specific concept.
        
        Args:
            concept: The concept name
            understanding_level: Level of understanding (basic, intermediate, advanced, expert)
            description: Description of the understanding
            
        Returns:
            Self for method chaining
        """
        understanding_data = {
            "type": "concept_understanding",
            "concept": concept,
            "level": understanding_level,
            "description": description
        }
        return self.add_structured_knowledge(understanding_data)
    
    def add_pattern_recognition(self, pattern: str, context: str = "", confidence: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add recognized pattern information.
        
        Args:
            pattern: The recognized pattern
            context: Context where this pattern was recognized
            confidence: Confidence level in the recognition
            
        Returns:
            Self for method chaining
        """
        pattern_data = {
            "type": "pattern_recognition",
            "pattern": pattern,
            "context": context,
            "confidence": confidence
        }
        return self.add_structured_knowledge(pattern_data)
    
    def add_user_understanding(self, user_trait: str, evidence: str = "", confidence: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add understanding about user characteristics.
        
        Args:
            user_trait: Understanding about the user
            evidence: Evidence supporting this understanding
            confidence: Confidence level in this understanding
            
        Returns:
            Self for method chaining
        """
        user_data = {
            "type": "user_understanding",
            "trait": user_trait,
            "evidence": evidence,
            "confidence": confidence
        }
        return self.add_structured_knowledge(user_data)
    
    def add_situation_understanding(self, situation: str, interpretation: str, context: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add understanding about a situation.
        
        Args:
            situation: The situation description
            interpretation: How the situation is understood
            context: Additional context
            
        Returns:
            Self for method chaining
        """
        situation_data = {
            "type": "situation_understanding",
            "situation": situation,
            "interpretation": interpretation,
            "context": context
        }
        return self.add_structured_knowledge(situation_data)
    
    def add_learning_comprehension(self, topic: str, comprehension_level: str, notes: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add comprehension level about learned topics.
        
        Args:
            topic: The learned topic
            comprehension_level: Level of comprehension
            notes: Additional notes about the learning
            
        Returns:
            Self for method chaining
        """
        learning_data = {
            "type": "learning_comprehension",
            "topic": topic,
            "level": comprehension_level,
            "notes": notes
        }
        return self.add_structured_knowledge(learning_data)
    
    def add_cognitive_model(self, model_name: str, description: str, application: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add cognitive model understanding.
        
        Args:
            model_name: Name of the cognitive model
            description: Description of the model
            application: Where this model applies
            
        Returns:
            Self for method chaining
        """
        model_data = {
            "type": "cognitive_model",
            "name": model_name,
            "description": description,
            "application": application
        }
        return self.add_structured_knowledge(model_data)
    
    def add_recognition_ability(self, ability: str, strength: str = "", limitation: str = "") -> 'UnderstandingKnowledgeTree':
        """
        Add recognition ability information.
        
        Args:
            ability: The recognition ability
            strength: Strength in this area
            limitation: Limitations in this area
            
        Returns:
            Self for method chaining
        """
        ability_data = {
            "type": "recognition_ability",
            "ability": ability,
            "strength": strength,
            "limitation": limitation
        }
        return self.add_structured_knowledge(ability_data)
    
    def add_general_understanding(self, understanding: str) -> 'UnderstandingKnowledgeTree':
        """
        Add general understanding information.
        
        Args:
            understanding: The understanding information
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(understanding)
    
    def _format_structured_understanding(self) -> str:
        """Format structured understanding information."""
        if not self.structured_items:
            return ""
        
        # Group by type
        concepts = [item for item in self.structured_items if item.get("type") == "concept_understanding"]
        patterns = [item for item in self.structured_items if item.get("type") == "pattern_recognition"]
        user_understanding = [item for item in self.structured_items if item.get("type") == "user_understanding"]
        situations = [item for item in self.structured_items if item.get("type") == "situation_understanding"]
        learning = [item for item in self.structured_items if item.get("type") == "learning_comprehension"]
        models = [item for item in self.structured_items if item.get("type") == "cognitive_model"]
        abilities = [item for item in self.structured_items if item.get("type") == "recognition_ability"]
        
        output_parts = []
        
        if concepts:
            formatted_concepts = []
            for concept in concepts:
                concept_str = f"- **{concept['concept']}** (Level: {concept['level']})"
                if concept.get('description'):
                    concept_str += f": {concept['description']}"
                formatted_concepts.append(concept_str)
            output_parts.append(f"\n## Concept Understanding\n" + "\n".join(formatted_concepts))
        
        if patterns:
            formatted_patterns = []
            for pattern in patterns:
                pattern_str = f"- {pattern['pattern']}"
                if pattern.get('context'):
                    pattern_str += f" (Context: {pattern['context']})"
                if pattern.get('confidence'):
                    pattern_str += f" [Confidence: {pattern['confidence']}]"
                formatted_patterns.append(pattern_str)
            output_parts.append(f"\n## Pattern Recognition\n" + "\n".join(formatted_patterns))
        
        if user_understanding:
            formatted_users = []
            for user in user_understanding:
                user_str = f"- {user['trait']}"
                if user.get('evidence'):
                    user_str += f" (Evidence: {user['evidence']})"
                if user.get('confidence'):
                    user_str += f" [Confidence: {user['confidence']}]"
                formatted_users.append(user_str)
            output_parts.append(f"\n## User Understanding\n" + "\n".join(formatted_users))
        
        if situations:
            formatted_situations = []
            for situation in situations:
                situation_str = f"- **{situation['situation']}**: {situation['interpretation']}"
                if situation.get('context'):
                    situation_str += f" (Context: {situation['context']})"
                formatted_situations.append(situation_str)
            output_parts.append(f"\n## Situation Understanding\n" + "\n".join(formatted_situations))
        
        if learning:
            formatted_learning = []
            for learn in learning:
                learn_str = f"- **{learn['topic']}** (Level: {learn['level']})"
                if learn.get('notes'):
                    learn_str += f": {learn['notes']}"
                formatted_learning.append(learn_str)
            output_parts.append(f"\n## Learning Comprehension\n" + "\n".join(formatted_learning))
        
        if models:
            formatted_models = []
            for model in models:
                model_str = f"- **{model['name']}**: {model['description']}"
                if model.get('application'):
                    model_str += f" (Application: {model['application']})"
                formatted_models.append(model_str)
            output_parts.append(f"\n## Cognitive Models\n" + "\n".join(formatted_models))
        
        if abilities:
            formatted_abilities = []
            for ability in abilities:
                ability_str = f"- **{ability['ability']}"
                if ability.get('strength'):
                    ability_str += f" (Strength: {ability['strength']})"
                if ability.get('limitation'):
                    ability_str += f" (Limitation: {ability['limitation']})"
                formatted_abilities.append(ability_str)
            output_parts.append(f"\n## Recognition Abilities\n" + "\n".join(formatted_abilities))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""