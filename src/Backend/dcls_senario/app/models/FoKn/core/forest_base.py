"""
FoKn (Framework of Knowledge) - Knowledge Forest Base Architecture

Design Philosophy: Knowledge Forest → Knowledge Areas → Knowledge Trees
Author: silan.hu

This module provides the foundational architecture for the FoKn framework,
implementing a hierarchical knowledge management system for AI agent instruction building.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from collections import OrderedDict


class KnowledgeTree(ABC):
    """
    Abstract base class for all knowledge trees.
    
    A knowledge tree represents a specific domain of knowledge within a knowledge area.
    Each tree is responsible for storing, managing, and formatting its knowledge items.
    """
    
    def __init__(self, tree_name: str, tree_description: str = ""):
        """
        Initialize a knowledge tree.
        
        Args:
            tree_name: Unique identifier for the knowledge tree
            tree_description: Optional description of the tree's purpose
        """
        self.tree_name = tree_name
        self.tree_description = tree_description
        self.knowledge_items: List[str] = []
    
    def add_knowledge(self, knowledge: str) -> 'KnowledgeTree':
        """
        Add a knowledge item to this tree.
        
        Args:
            knowledge: The knowledge item to add
            
        Returns:
            Self for method chaining
        """
        if knowledge and knowledge.strip():
            self.knowledge_items.append(knowledge.strip())
        return self
    
    def get_knowledge_items(self) -> List[str]:
        """
        Get all knowledge items in this tree.
        
        Returns:
            A copy of the knowledge items list
        """
        return self.knowledge_items.copy()
    
    def clear_knowledge(self) -> 'KnowledgeTree':
        """
        Clear all knowledge items from this tree.
        
        Returns:
            Self for method chaining
        """
        self.knowledge_items.clear()
        return self
    
    @abstractmethod
    def format_knowledge_section(self) -> str:
        """
        Format this tree's knowledge into a string section.
        
        Each knowledge tree must implement its own formatting logic.
        
        Returns:
            Formatted string representation of the knowledge section
        """
        pass
    
    def is_empty(self) -> bool:
        """
        Check if this knowledge tree contains any knowledge items.
        
        Returns:
            True if the tree is empty, False otherwise
        """
        return len(self.knowledge_items) == 0
    
    def get_section_title(self) -> str:
        """
        Get the formatted section title for this knowledge tree.
        
        Returns:
            Formatted section title
        """
        return f"## {self.tree_name}"


class StructuredKnowledgeTree(KnowledgeTree):
    """
    Knowledge tree that supports complex structured data.
    
    This extends the basic knowledge tree to handle dictionaries and
    other structured data types alongside simple string knowledge items.
    """
    
    def __init__(self, tree_name: str, tree_description: str = ""):
        """
        Initialize a structured knowledge tree.
        
        Args:
            tree_name: Unique identifier for the knowledge tree
            tree_description: Optional description of the tree's purpose
        """
        super().__init__(tree_name, tree_description)
        self.structured_items: List[Dict[str, Any]] = []
    
    def add_structured_knowledge(self, knowledge_data: Dict[str, Any]) -> 'StructuredKnowledgeTree':
        """
        Add structured knowledge data to this tree.
        
        Args:
            knowledge_data: Dictionary containing structured knowledge
            
        Returns:
            Self for method chaining
        """
        if knowledge_data:
            self.structured_items.append(knowledge_data.copy())
        return self
    
    def get_structured_items(self) -> List[Dict[str, Any]]:
        """
        Get all structured knowledge items.
        
        Returns:
            A copy of the structured items list
        """
        return [item.copy() for item in self.structured_items]
    
    def clear_structured_knowledge(self) -> 'StructuredKnowledgeTree':
        """
        Clear all structured knowledge items.
        
        Returns:
            Self for method chaining
        """
        self.structured_items.clear()
        return self
    
    def is_empty(self) -> bool:
        """
        Check if this tree is empty of both simple and structured knowledge.
        
        Returns:
            True if both knowledge_items and structured_items are empty
        """
        return super().is_empty() and len(self.structured_items) == 0


class KnowledgeArea:
    """
    Knowledge area that manages multiple related knowledge trees.
    
    A knowledge area represents a logical grouping of knowledge trees
    that work together to provide comprehensive coverage of a domain.
    """
    
    def __init__(self, area_name: str, area_description: str = ""):
        """
        Initialize a knowledge area.
        
        Args:
            area_name: Unique identifier for the knowledge area
            area_description: Optional description of the area's purpose
        """
        self.area_name = area_name
        self.area_description = area_description
        self.knowledge_trees: OrderedDict[str, KnowledgeTree] = OrderedDict()
    
    def add_knowledge_tree(self, tree: KnowledgeTree) -> 'KnowledgeArea':
        """
        Add a knowledge tree to this area.
        
        Args:
            tree: The knowledge tree to add
            
        Returns:
            Self for method chaining
        """
        self.knowledge_trees[tree.tree_name] = tree
        return self
    
    def get_knowledge_tree(self, tree_name: str) -> Optional[KnowledgeTree]:
        """
        Get a specific knowledge tree by name.
        
        Args:
            tree_name: Name of the tree to retrieve
            
        Returns:
            The knowledge tree if found, None otherwise
        """
        return self.knowledge_trees.get(tree_name)
    
    def remove_knowledge_tree(self, tree_name: str) -> 'KnowledgeArea':
        """
        Remove a knowledge tree from this area.
        
        Args:
            tree_name: Name of the tree to remove
            
        Returns:
            Self for method chaining
        """
        self.knowledge_trees.pop(tree_name, None)
        return self
    
    def format_area_output(self) -> str:
        """
        Format all non-empty knowledge trees in this area.
        
        Returns:
            Formatted string representation of all trees in this area
        """
        if not self.knowledge_trees:
            return ""
        
        output_parts = []
        for tree in self.knowledge_trees.values():
            if not tree.is_empty():
                formatted_section = tree.format_knowledge_section()
                if formatted_section:
                    output_parts.append(formatted_section)
        
        return "\n".join(output_parts)
    
    def is_empty(self) -> bool:
        """
        Check if all knowledge trees in this area are empty.
        
        Returns:
            True if all trees are empty, False otherwise
        """
        return all(tree.is_empty() for tree in self.knowledge_trees.values())
    
    def get_tree_names(self) -> List[str]:
        """
        Get names of all knowledge trees in this area.
        
        Returns:
            List of tree names
        """
        return list(self.knowledge_trees.keys())


class KnowledgeForest:
    """
    The root knowledge forest that manages all knowledge areas.
    
    This is the main entry point for the FoKn framework, providing
    a unified interface for building and generating AI agent instructions.
    """
    
    def __init__(self, forest_name: str = "FoKn Knowledge Forest"):
        """
        Initialize the knowledge forest.
        
        Args:
            forest_name: Name identifier for this forest instance
        """
        self.forest_name = forest_name
        self.knowledge_areas: OrderedDict[str, KnowledgeArea] = OrderedDict()
        self.base_description = ""
    
    def add_knowledge_area(self, area: KnowledgeArea) -> 'KnowledgeForest':
        """
        Add a knowledge area to this forest.
        
        Args:
            area: The knowledge area to add
            
        Returns:
            Self for method chaining
        """
        self.knowledge_areas[area.area_name] = area
        return self
    
    def get_knowledge_area(self, area_name: str) -> Optional[KnowledgeArea]:
        """
        Get a specific knowledge area by name.
        
        Args:
            area_name: Name of the area to retrieve
            
        Returns:
            The knowledge area if found, None otherwise
        """
        return self.knowledge_areas.get(area_name)
    
    def remove_knowledge_area(self, area_name: str) -> 'KnowledgeForest':
        """
        Remove a knowledge area from this forest.
        
        Args:
            area_name: Name of the area to remove
            
        Returns:
            Self for method chaining
        """
        self.knowledge_areas.pop(area_name, None)
        return self
    
    def set_base_description(self, description: str) -> 'KnowledgeForest':
        """
        Set the base description for the generated output.
        
        Args:
            description: The base description text
            
        Returns:
            Self for method chaining
        """
        self.base_description = description
        return self
    
    def generate_knowledge_output(self) -> str:
        """
        Generate the complete knowledge output for AI agent instructions.
        
        This is the core method that combines all knowledge areas and trees
        into a single, formatted instruction set for AI agents.
        
        Returns:
            Complete formatted knowledge output
        """
        output_parts = []
        
        # Add base description if provided
        if self.base_description:
            output_parts.append(self.base_description)
        
        # Generate output for all non-empty knowledge areas
        for area in self.knowledge_areas.values():
            if not area.is_empty():
                area_output = area.format_area_output()
                if area_output:
                    output_parts.append(area_output)
        
        return "\n".join(filter(None, output_parts))
    
    def is_empty(self) -> bool:
        """
        Check if the entire forest is empty.
        
        Returns:
            True if all areas are empty and no base description exists
        """
        has_base_desc = bool(self.base_description.strip())
        areas_empty = all(area.is_empty() for area in self.knowledge_areas.values())
        return not has_base_desc and areas_empty
    
    def get_area_names(self) -> List[str]:
        """
        Get names of all knowledge areas in this forest.
        
        Returns:
            List of area names
        """
        return list(self.knowledge_areas.keys())
    
    def __str__(self) -> str:
        """
        String representation of the forest.
        
        Returns:
            Complete formatted knowledge output
        """
        return self.generate_knowledge_output()
    
    def __repr__(self) -> str:
        """
        Developer representation of the forest.
        
        Returns:
            Technical representation for debugging
        """
        return f"KnowledgeForest(name='{self.forest_name}', areas={len(self.knowledge_areas)})"