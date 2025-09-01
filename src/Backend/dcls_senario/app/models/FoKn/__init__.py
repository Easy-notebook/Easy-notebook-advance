"""
FoKn (Forest of Knowledge) - Complete Knowledge Forest Framework

This is the main entry point for the FoKn framework, providing a comprehensive
knowledge management system for AI agent instruction building.

Design Philosophy: Knowledge Forest → Knowledge Areas → Knowledge Trees
Author: silan.hu
"""

from .core import (
    KnowledgeTree,
    StructuredKnowledgeTree,
    KnowledgeArea,
    KnowledgeForest
)

from .agent_identity import (
    RoleKnowledgeTree,
    PolicyKnowledgeTree,
    CapabilityKnowledgeTree,
    create_agent_identity_area
)

from .behavioral_rules import (
    RuleKnowledgeTree,
    ConstraintKnowledgeTree,
    LimitationKnowledgeTree,
    create_behavioral_rules_area
)

from .communication import (
    OutputFormatKnowledgeTree,
    AgentCommunicationTree,
    create_communication_area
)

from .knowledge_context import (
    DomainKnowledgeTree,
    ContextKnowledgeTree, 
    MemoryKnowledgeTree,
    create_knowledge_context_area
)

from .task_workflow import (
    TaskKnowledgeTree,
    WorkflowKnowledgeTree,
    PlanKnowledgeTree,
    create_task_workflow_area
)

from .learning_experience import (
    PracticeKnowledgeTree,
    LessonKnowledgeTree,
    InsightKnowledgeTree,
    create_learning_experience_area
)

from .thinking_process import (
    AnalysisKnowledgeTree,
    DecisionKnowledgeTree,
    ReflectionKnowledgeTree,
    create_thinking_process_area
)

from .resources import (
    TemplateKnowledgeTree,
    ExampleKnowledgeTree,
    ResourceKnowledgeTree,
    create_resources_area
)

from .state_management import (
    VariableKnowledgeTree,
    UnderstandingKnowledgeTree,
    RequirementKnowledgeTree,
    create_state_management_area
)

from .fokn import FoKn

# Main public interface
__all__ = [
    # Main FoKn class (backward compatible)
    "FoKn",
    
    # Core framework components
    "KnowledgeTree",
    "StructuredKnowledgeTree", 
    "KnowledgeArea",
    "KnowledgeForest",
    
    # Agent Identity trees
    "RoleKnowledgeTree",
    "PolicyKnowledgeTree", 
    "CapabilityKnowledgeTree",
    
    # Behavioral Rules trees
    "RuleKnowledgeTree",
    "ConstraintKnowledgeTree",
    "LimitationKnowledgeTree",
    
    # Communication trees
    "OutputFormatKnowledgeTree",
    "AgentCommunicationTree",
    
    # Knowledge Context trees
    "DomainKnowledgeTree",
    "ContextKnowledgeTree",
    "MemoryKnowledgeTree",
    
    # Task Workflow trees  
    "TaskKnowledgeTree",
    "WorkflowKnowledgeTree",
    "PlanKnowledgeTree",
    
    # Learning Experience trees
    "PracticeKnowledgeTree", 
    "LessonKnowledgeTree",
    "InsightKnowledgeTree",
    
    # Thinking Process trees
    "AnalysisKnowledgeTree",
    "DecisionKnowledgeTree",
    "ReflectionKnowledgeTree",
    
    # Resource trees
    "TemplateKnowledgeTree",
    "ExampleKnowledgeTree", 
    "ResourceKnowledgeTree",
    
    # State Management trees
    "VariableKnowledgeTree",
    "UnderstandingKnowledgeTree",
    "RequirementKnowledgeTree",
    
    # Area creators
    "create_agent_identity_area",
    "create_behavioral_rules_area",
    "create_communication_area",
    "create_knowledge_context_area", 
    "create_task_workflow_area",
    "create_learning_experience_area",
    "create_thinking_process_area",
    "create_resources_area",
    "create_state_management_area"
]

# Version information
__version__ = "1.0.0"
__author__ = "silan.hu"