"""
FoKn Core - Core components of the Framework of Knowledge.

This module provides the foundational classes and utilities for the FoKn framework.
"""

from .forest_base import (
    KnowledgeTree,
    StructuredKnowledgeTree, 
    KnowledgeArea,
    KnowledgeForest
)

__all__ = [
    "KnowledgeTree",
    "StructuredKnowledgeTree",
    "KnowledgeArea", 
    "KnowledgeForest"
]