"""
FoKn Integration - Core Agent Instruction Builder

This module provides a simplified FoKn class that maintains backward compatibility
while using the new knowledge forest architecture for the core functionality.
"""

from typing import Dict, Any, List, Set
from .core import KnowledgeForest, KnowledgeArea
from .core.high_quality_formatter import HighQualityFormatter
from .agent_identity import (
    RoleKnowledgeTree,
    PolicyKnowledgeTree, 
    CapabilityKnowledgeTree
)
from .behavioral_rules import (
    RuleKnowledgeTree,
    ConstraintKnowledgeTree,
    LimitationKnowledgeTree
)
from .communication import (
    OutputFormatKnowledgeTree,
    AgentCommunicationTree
)


class FoKn:
    """
    FoKn (Framework of Knowledge) - Simplified Agent Instruction Builder
    
    This class builds comprehensive instruction sets for AI agents using a
    hierarchical knowledge forest structure while maintaining backward compatibility.
    """
    
    def __init__(self):
        """Initialize the FoKn knowledge forest with core knowledge areas."""
        self.forest = KnowledgeForest("FoKn Agent Knowledge Forest")
        
        # Initialize core knowledge areas
        self._setup_core_areas()
        
        # Maintain backward compatibility fields
        self.workflow_section = ""
        self.workflow_title = ""
        self.background_knowledge = ""
        self.background_title = ""
        self.things_you_should_know = ""
        self.things_title = ""
        self.base_description = ""
        
        # Import all knowledge trees
        from .knowledge_context import DomainKnowledgeTree, ContextKnowledgeTree, MemoryKnowledgeTree
        from .task_workflow import TaskKnowledgeTree, WorkflowKnowledgeTree, PlanKnowledgeTree
        from .learning_experience import PracticeKnowledgeTree, LessonKnowledgeTree, InsightKnowledgeTree
        from .thinking_process import AnalysisKnowledgeTree, DecisionKnowledgeTree, ReflectionKnowledgeTree
        from .resources import TemplateKnowledgeTree, ExampleKnowledgeTree, ResourceKnowledgeTree
        from .state_management import VariableKnowledgeTree, UnderstandingKnowledgeTree, RequirementKnowledgeTree
        
        # Add additional knowledge areas
        self._setup_additional_areas(
            DomainKnowledgeTree, ContextKnowledgeTree, MemoryKnowledgeTree,
            TaskKnowledgeTree, WorkflowKnowledgeTree, PlanKnowledgeTree,
            PracticeKnowledgeTree, LessonKnowledgeTree, InsightKnowledgeTree,
            AnalysisKnowledgeTree, DecisionKnowledgeTree, ReflectionKnowledgeTree,
            TemplateKnowledgeTree, ExampleKnowledgeTree, ResourceKnowledgeTree,
            VariableKnowledgeTree, UnderstandingKnowledgeTree, RequirementKnowledgeTree
        )
        
        # Simple storage for any remaining backward compatibility  
        self.additional_sections = {}
        
        # Initialize high quality formatter
        self._high_quality_formatter = HighQualityFormatter(self.forest)
    
    def _setup_core_areas(self):
        """Set up core knowledge areas and their trees."""
        # Agent Identity Area
        identity_area = KnowledgeArea("agent_identity", "Agent identity, roles, and capabilities")
        self.role_tree = RoleKnowledgeTree()
        self.policy_tree = PolicyKnowledgeTree()
        self.capability_tree = CapabilityKnowledgeTree()
        identity_area.add_knowledge_tree(self.role_tree)
        identity_area.add_knowledge_tree(self.policy_tree)
        identity_area.add_knowledge_tree(self.capability_tree)
        self.forest.add_knowledge_area(identity_area)
        
        # Behavioral Rules Area
        rules_area = KnowledgeArea("behavioral_rules", "Rules, constraints, and limitations")
        self.rule_tree = RuleKnowledgeTree()
        self.constraint_tree = ConstraintKnowledgeTree()
        self.limitation_tree = LimitationKnowledgeTree()
        rules_area.add_knowledge_tree(self.rule_tree)
        rules_area.add_knowledge_tree(self.constraint_tree)
        rules_area.add_knowledge_tree(self.limitation_tree)
        self.forest.add_knowledge_area(rules_area)
        
        # Communication Area
        comm_area = KnowledgeArea("communication", "Communication protocols and formats")
        self.output_format_tree = OutputFormatKnowledgeTree()
        self.agent_comm_tree = AgentCommunicationTree()
        comm_area.add_knowledge_tree(self.output_format_tree)
        comm_area.add_knowledge_tree(self.agent_comm_tree)
        self.forest.add_knowledge_area(comm_area)
    
    def _setup_additional_areas(self, DomainKnowledgeTree, ContextKnowledgeTree, MemoryKnowledgeTree,
                               TaskKnowledgeTree, WorkflowKnowledgeTree, PlanKnowledgeTree,
                               PracticeKnowledgeTree, LessonKnowledgeTree, InsightKnowledgeTree,
                               AnalysisKnowledgeTree, DecisionKnowledgeTree, ReflectionKnowledgeTree,
                               TemplateKnowledgeTree, ExampleKnowledgeTree, ResourceKnowledgeTree,
                               VariableKnowledgeTree, UnderstandingKnowledgeTree, RequirementKnowledgeTree):
        """Set up additional knowledge areas with all trees."""
        
        # Knowledge Context Area
        context_area = KnowledgeArea("knowledge_context", "Domain knowledge and context")
        self.domain_tree = DomainKnowledgeTree()
        self.context_tree = ContextKnowledgeTree()
        self.memory_tree = MemoryKnowledgeTree()
        context_area.add_knowledge_tree(self.domain_tree)
        context_area.add_knowledge_tree(self.context_tree)
        context_area.add_knowledge_tree(self.memory_tree)
        self.forest.add_knowledge_area(context_area)
        
        # Task Workflow Area
        task_area = KnowledgeArea("task_workflow", "Tasks, workflows, and planning")
        self.task_tree = TaskKnowledgeTree()
        self.workflow_tree = WorkflowKnowledgeTree()
        self.plan_tree = PlanKnowledgeTree()
        task_area.add_knowledge_tree(self.task_tree)
        task_area.add_knowledge_tree(self.workflow_tree)
        task_area.add_knowledge_tree(self.plan_tree)
        self.forest.add_knowledge_area(task_area)
        
        # Learning Experience Area
        learning_area = KnowledgeArea("learning_experience", "Learning and experience")
        self.practice_tree = PracticeKnowledgeTree()
        self.lesson_tree = LessonKnowledgeTree()
        self.insight_tree = InsightKnowledgeTree()
        learning_area.add_knowledge_tree(self.practice_tree)
        learning_area.add_knowledge_tree(self.lesson_tree)
        learning_area.add_knowledge_tree(self.insight_tree)
        self.forest.add_knowledge_area(learning_area)
        
        # Thinking Process Area
        thinking_area = KnowledgeArea("thinking_process", "Analysis and decision making")
        self.analysis_tree = AnalysisKnowledgeTree()
        self.decision_tree = DecisionKnowledgeTree()
        self.reflection_tree = ReflectionKnowledgeTree()
        thinking_area.add_knowledge_tree(self.analysis_tree)
        thinking_area.add_knowledge_tree(self.decision_tree)
        thinking_area.add_knowledge_tree(self.reflection_tree)
        self.forest.add_knowledge_area(thinking_area)
        
        # Resources Area
        resources_area = KnowledgeArea("resources", "Templates, examples, and resources")
        self.template_tree = TemplateKnowledgeTree()
        self.example_tree = ExampleKnowledgeTree()
        self.resource_tree = ResourceKnowledgeTree()
        resources_area.add_knowledge_tree(self.template_tree)
        resources_area.add_knowledge_tree(self.example_tree)
        resources_area.add_knowledge_tree(self.resource_tree)
        self.forest.add_knowledge_area(resources_area)
        
        # State Management Area
        state_area = KnowledgeArea("state_management", "Variables, understanding, and requirements")
        self.variable_tree = VariableKnowledgeTree()
        self.understanding_tree = UnderstandingKnowledgeTree()
        self.requirement_tree = RequirementKnowledgeTree()
        state_area.add_knowledge_tree(self.variable_tree)
        state_area.add_knowledge_tree(self.understanding_tree)
        state_area.add_knowledge_tree(self.requirement_tree)
        self.forest.add_knowledge_area(state_area)
    
    # Core backward compatible methods
    def add_role(self, role: str) -> 'FoKn':
        """Add agent role definition."""
        self.role_tree.add_primary_role(role)
        return self
    
    def add_policy(self, policy: str) -> 'FoKn':
        """Add behavioral policy."""
        self.policy_tree.add_behavioral_policy(policy)
        return self
    
    def add_tool(self, tool: str) -> 'FoKn':
        """Add agent capability or tool."""
        self.capability_tree.add_tool(tool)
        return self
    
    def add_rule(self, rule: str) -> 'FoKn':
        """Add mandatory rule."""
        self.rule_tree.add_mandatory_rule(rule)
        return self
    
    def add_constraint(self, constraint: str) -> 'FoKn':
        """Add operational constraint."""
        self.constraint_tree.add_operational_constraint(constraint)
        return self
    
    def add_limitation(self, limitation: str) -> 'FoKn':
        """Add capability limitation."""
        self.limitation_tree.add_capability_limitation(limitation)
        return self
    
    def add_output_format(self, format_item: str) -> 'FoKn':
        """Add output format requirement."""
        self.output_format_tree.add_output_format(format_item)
        return self
    
    def add_communication(self, comm_item: str) -> 'FoKn':
        """Add communication protocol."""
        self.agent_comm_tree.add_communication_protocol(comm_item)
        return self
    
    def add_ability(self, ability_name: str, capability_description: str = "", 
                   xml_tag_name: str = "", xml_attributes: dict = None, 
                   xml_content_structure: str = "", detailed_explanation: str = "",
                   is_self_closing: bool = False) -> 'FoKn':
        """
        Add a standard ability with capability, XML output format specification, and optional detailed explanation.
        
        This method provides a comprehensive way to define an agent's ability by:
        1. Adding the capability description to the capability tree
        2. Adding corresponding XML output format requirements to the output format tree
        3. Optionally adding detailed explanations to the domain knowledge
        
        Args:
            ability_name: Name of the ability (e.g., "Data Analysis", "Report Generation")
            capability_description: Description of what the agent can do with this ability
            xml_tag_name: XML tag name for the output format (e.g., "analysis_result", "data_summary")
            xml_attributes: Dictionary of XML attributes for the tag (e.g., {"type": "summary", "format": "json"})
            xml_content_structure: Expected content structure within the XML tag (ignored for self-closing tags)
            detailed_explanation: Optional detailed explanation of the ability and its usage
            is_self_closing: Whether the XML tag is self-closing (single tag format)
            
        Returns:
            Self for method chaining
            
        Examples:
            # Regular XML tag with content
            fokn.add_ability(
                ability_name="Data Analysis",
                capability_description="Analyze datasets and generate statistical summaries",
                xml_tag_name="analysis_result",
                xml_attributes={"type": "statistical", "format": "structured"},
                xml_content_structure="summary: string, statistics: object, insights: array",
                detailed_explanation="This ability performs comprehensive data analysis..."
            )
            
            # Self-closing XML tag
            fokn.add_ability(
                ability_name="Status Check",
                capability_description="Check current processing status",
                xml_tag_name="status",
                xml_attributes={"state": "completed", "progress": "100"},
                is_self_closing=True
            )
        """
        # Add the capability if description is provided
        if capability_description:
            formatted_capability = f"{ability_name}: {capability_description}"
            self.capability_tree.add_technical_capability(formatted_capability)
        
        # Add XML output format requirement if XML tag is provided
        if xml_tag_name:
            # Build XML tag specification
            tag_spec = f"<{xml_tag_name}"
            
            # Add attributes if provided
            if xml_attributes:
                attr_parts = []
                for key, value in xml_attributes.items():
                    attr_parts.append(f'{key}="{value}"')
                if attr_parts:
                    tag_spec += f" {' '.join(attr_parts)}"
            
            # Handle self-closing vs regular tags
            if is_self_closing:
                tag_spec += " />"
            else:
                tag_spec += ">"
                
                # Add content structure if provided and not self-closing
                if xml_content_structure:
                    tag_spec += f"\n  Content Structure: {xml_content_structure}\n"
                
                tag_spec += f"</{xml_tag_name}>"
            
            formatted_xml_output = f"[{ability_name}] Use XML format: {tag_spec}"
            self.output_format_tree.add_tag_specification(formatted_xml_output)
        
        # Add detailed explanation to domain knowledge if provided
        if detailed_explanation:
            formatted_explanation = f"[{ability_name} - Detailed Guide] {detailed_explanation}"
            self.domain_tree.add_domain_expertise(formatted_explanation)
        
        return self
    
    def add_available_agent(self, agent_name: str, description: str, capabilities: str = "") -> 'FoKn':
        """Add available agent information."""
        self.agent_comm_tree.add_available_agent(agent_name, description, capabilities)
        return self
    
    def add_received_task(self, task: str, from_agent: str = "", priority: str = "") -> 'FoKn':
        """Add received task information."""
        self.agent_comm_tree.add_received_task(task, from_agent, priority)
        return self
    
    def add_agent_message(self, message: str, from_agent: str, message_type: str = "info") -> 'FoKn':
        """Add agent message."""
        self.agent_comm_tree.add_agent_message(message, from_agent, message_type)
        return self
    
    # Simple storage methods for backward compatibility
    def _add_to_section(self, section_name: str, item: str) -> 'FoKn':
        """Add item to a generic section for backward compatibility."""
        if section_name not in self.additional_sections:
            self.additional_sections[section_name] = []
        self.additional_sections[section_name].append(item)
        return self
    
    def add_domain_knowledge(self, knowledge: str) -> 'FoKn':
        """Add domain-specific knowledge."""
        self.domain_tree.add_domain_expertise(knowledge)
        return self
    
    def add_context(self, context: str) -> 'FoKn':
        """Add contextual information.""" 
        self.context_tree.add_contextual_info(context)
        return self
    
    def add_memory(self, memory: str) -> 'FoKn':
        """Add memory or historical information."""
        self.memory_tree.add_memory_item(memory)
        return self
    
    def add_user_preference(self, preference: str) -> 'FoKn':
        """Add user preference."""
        self.context_tree.add_user_preference(preference)
        return self
    
    def add_environment_setting(self, setting: str) -> 'FoKn':
        """Add environment setting."""
        self.context_tree.add_environment_setting(setting)
        return self
    
    def add_current_state(self, state: str) -> 'FoKn':
        """Add current state information."""
        self.context_tree.add_current_state(state)
        return self
    
    def add_special_instruction(self, instruction: str) -> 'FoKn':
        """Add special instruction."""
        self.context_tree.add_special_instruction(instruction)
        return self
    
    def add_task(self, task: str) -> 'FoKn':
        """Add current task."""
        self.task_tree.add_current_task(task)
        return self
    
    def add_goal(self, goal: str) -> 'FoKn':
        """Add goal information."""
        self.task_tree.add_goal(goal)
        return self
    
    def add_plan(self, plan: str) -> 'FoKn':
        """Add plan information."""
        self.plan_tree.add_strategic_plan(plan)
        return self
    
    def add_example(self, example: str) -> 'FoKn':
        """Add example."""
        self.example_tree.add_example(example)
        return self
    
    def add_resource(self, resource: str) -> 'FoKn':
        """Add resource."""
        self.resource_tree.add_resource(resource)
        return self
    
    def add_result(self, result: str) -> 'FoKn':
        """Add result."""
        return self._add_to_section("Results", result)
    
    # Enhanced thinking methods
    def add_think_user_preference(self, preference: str) -> 'FoKn':
        """Add user preference from thinking."""
        self.context_tree.add_user_preference(f"[From Thinking] {preference}")
        return self
    
    def add_think_environment_setting(self, setting: str) -> 'FoKn':
        """Add environment setting from thinking."""
        self.context_tree.add_environment_setting(f"[From Thinking] {setting}")
        return self
    
    def add_think_memory_item(self, memory: str) -> 'FoKn':
        """Add memory item from thinking."""
        self.memory_tree.add_memory_item(f"[From Thinking] {memory}")
        return self
    
    def add_think_domain_knowledge_item(self, knowledge: str) -> 'FoKn':
        """Add domain knowledge from thinking."""
        self.domain_tree.add_domain_expertise(f"[From Thinking] {knowledge}")
        return self
    
    def add_think_limitation(self, limitation: str) -> 'FoKn':
        """Add limitation from thinking."""
        self.limitation_tree.add_capability_limitation(f"[From Thinking] {limitation}")
        return self
    
    def add_think_special_instruction(self, instruction: str) -> 'FoKn':
        """Add special instruction from thinking."""
        self.context_tree.add_special_instruction(f"[From Thinking] {instruction}")
        return self
    
    # Additional backward compatible methods
    def add_think_analysis(self, analysis: str) -> 'FoKn':
        """Add thinking analysis."""
        self.analysis_tree.add_analysis(analysis)
        return self
    
    def add_think_state(self, state: str) -> 'FoKn':
        """Add thinking state."""
        self.reflection_tree.add_state_reflection(state)
        return self
    
    def add_think_goal(self, goal: str) -> 'FoKn':
        """Add thinking goal."""
        self.decision_tree.add_goal_decision(goal)
        return self
    
    def add_must_to_do(self, action: str) -> 'FoKn':
        """Add must-do action."""
        self.decision_tree.add_urgent_decision(action)
        return self
    
    def add_should_do(self, action: str) -> 'FoKn':
        """Add should-do action."""
        self.decision_tree.add_recommended_action(action)
        return self
    
    def add_avoid_item(self, item: str) -> 'FoKn':
        """Add item to avoid."""
        self.decision_tree.add_avoidance_decision(item)
        return self
    
    def add_remember_item(self, item: str) -> 'FoKn':
        """Add item to remember."""
        self.memory_tree.add_remember_item(item)
        return self
    
    def add_question(self, question: str) -> 'FoKn':
        """Add question."""
        self.reflection_tree.add_question(question)
        return self
    
    def add_risk(self, risk: str) -> 'FoKn':
        """Add risk assessment."""
        self.analysis_tree.add_risk_analysis(risk)
        return self
    
    def add_best_practice(self, practice: str, context: str = "") -> 'FoKn':
        """Add best practice."""
        self.practice_tree.add_best_practice(practice, context)
        return self
    
    def add_lesson_learned(self, lesson: str, situation: str = "") -> 'FoKn':
        """Add lesson learned."""
        self.lesson_tree.add_lesson_learned(lesson, situation)
        return self
    
    def add_think_insight(self, insight: str, context: str = "") -> 'FoKn':
        """Add thinking insight."""
        self.insight_tree.add_thinking_insight(insight, context)
        return self
    
    def add_auto_learned_practice(self, practice: str, learned_from: str = "") -> 'FoKn':
        """Add automatically learned practice."""
        self.practice_tree.add_learned_practice(practice, learned_from)
        return self
    
    def add_available_workflow(self, workflow_name: str, description: str, suitable_for: str = "") -> 'FoKn':
        """Add available workflow."""
        self.workflow_tree.add_available_workflow(workflow_name, description, suitable_for)
        return self
    
    def add_workflow_step(self, workflow_name: str, step_number: int, step_description: str, notes: str = "") -> 'FoKn':
        """Add workflow step."""
        self.workflow_tree.add_workflow_step(workflow_name, step_number, step_description, notes)
        return self
    
    def add_template(self, template_name: str, description: str, use_case: str = "") -> 'FoKn':
        """Add template."""
        self.template_tree.add_template(template_name, description, use_case)
        return self
    
    def add_procedure(self, procedure_name: str, steps: str, when_to_use: str = "") -> 'FoKn':
        """Add procedure."""
        self.resource_tree.add_procedure(procedure_name, steps, when_to_use)
        return self
    
    # Workflow section methods
    def set_workflow_section(self, workflow_section: str, title: str = "Planning things you couldn't finish for <plan>") -> 'FoKn':
        """Set workflow section content."""
        self.workflow_section = workflow_section
        self.workflow_title = title
        return self
    
    def set_background_knowledge(self, background_knowledge: str, title: str = "The background knowledge") -> 'FoKn':
        """Set background knowledge section."""
        self.background_knowledge = background_knowledge
        self.background_title = title
        return self
    
    def set_things_you_should_know(self, things_you_should_know: str, title: str = "The things you should know") -> 'FoKn':
        """Set things you should know section."""
        self.things_you_should_know = things_you_should_know
        self.things_title = title
        return self
    
    def set_base_description(self, description: str) -> 'FoKn':
        """Set base description."""
        self.base_description = description
        self.forest.set_base_description(description)
        return self
    
    def process_think_content(self, think_content: str, context: str = "") -> 'FoKn':
        """Process think tag content."""
        self.add_think_insight(think_content, context)
        return self
    
    # Variable management methods
    def add_variable(self, name: str, value: Any, description: str = "", var_type: str = "unknown") -> 'FoKn':
        """Add a variable with its value."""
        self.variable_tree.add_variable(name, value, description, var_type)
        return self
    
    def get_variable(self, name: str) -> Any:
        """Get a variable's value."""
        return self.variable_tree.get_variable(name)
    
    def update_variable(self, name: str, value: Any) -> 'FoKn':
        """Update an existing variable's value."""
        self.variable_tree.update_variable(name, value)
        return self
    
    def add_state_variable(self, name: str, value: Any, description: str = "") -> 'FoKn':
        """Add a state variable."""
        self.variable_tree.add_state_variable(name, value, description)
        return self
    
    def add_data_variable(self, name: str, value: Any, source: str = "", description: str = "") -> 'FoKn':
        """Add a data variable."""
        self.variable_tree.add_data_variable(name, value, source, description)
        return self
    
    def add_result_variable(self, name: str, value: Any, operation: str = "", description: str = "") -> 'FoKn':
        """Add a result variable."""
        self.variable_tree.add_result_variable(name, value, operation, description)
        return self
    
    def add_variable_dependency(self, variable: str, depends_on: List[str], description: str = "") -> 'FoKn':
        """Add variable dependency information."""
        self.variable_tree.add_variable_dependency(variable, depends_on, description)
        return self
    
    # Understanding management methods
    def add_concept_understanding(self, concept: str, understanding_level: str, description: str = "") -> 'FoKn':
        """Add understanding about a specific concept."""
        self.understanding_tree.add_concept_understanding(concept, understanding_level, description)
        return self
    
    def add_pattern_recognition(self, pattern: str, context: str = "", confidence: str = "") -> 'FoKn':
        """Add recognized pattern information."""
        self.understanding_tree.add_pattern_recognition(pattern, context, confidence)
        return self
    
    def add_user_understanding(self, user_trait: str, evidence: str = "", confidence: str = "") -> 'FoKn':
        """Add understanding about user characteristics."""
        self.understanding_tree.add_user_understanding(user_trait, evidence, confidence)
        return self
    
    def add_situation_understanding(self, situation: str, interpretation: str, context: str = "") -> 'FoKn':
        """Add understanding about a situation."""
        self.understanding_tree.add_situation_understanding(situation, interpretation, context)
        return self
    
    def add_learning_comprehension(self, topic: str, comprehension_level: str, notes: str = "") -> 'FoKn':
        """Add comprehension level about learned topics."""
        self.understanding_tree.add_learning_comprehension(topic, comprehension_level, notes)
        return self
    
    # Requirements management methods
    def add_required_variable(self, variable_name: str, description: str = "", validation_rule: str = "") -> 'FoKn':
        """Add a required variable."""
        self.requirement_tree.add_required_variable(variable_name, description, validation_rule)
        return self
    
    def add_optional_variable(self, variable_name: str, description: str = "", default_value: Any = None) -> 'FoKn':
        """Add an optional variable."""
        self.requirement_tree.add_optional_variable(variable_name, description, default_value)
        return self
    
    def add_prerequisite(self, operation: str, prerequisites: List[str], description: str = "") -> 'FoKn':
        """Add prerequisite requirements for operations."""
        self.requirement_tree.add_prerequisite(operation, prerequisites, description)
        return self
    
    def add_validation_rule(self, variable: str, rule: str, description: str = "") -> 'FoKn':
        """Add validation rule for a variable."""
        self.requirement_tree.add_validation_rule(variable, rule, description)
        return self
    
    # Utility methods for variable management
    def get_all_variables(self) -> Dict[str, Any]:
        """Get all stored variables."""
        return self.variable_tree.get_all_variables()
    
    def has_variable(self, name: str) -> bool:
        """Check if a variable exists."""
        return self.variable_tree.has_variable(name)
    
    def get_required_variables(self) -> Set[str]:
        """Get all required variables."""
        return self.requirement_tree.get_required_variables()
    
    def is_variable_required(self, variable_name: str) -> bool:
        """Check if a variable is required."""
        return self.requirement_tree.is_variable_required(variable_name)
    
    def _format_additional_sections(self) -> str:
        """Format additional sections for backward compatibility."""
        if not self.additional_sections:
            return ""
        
        output_parts = []
        for section_name, items in self.additional_sections.items():
            if items:
                formatted_items = []
                for item in items:
                    formatted_items.append(f"- {item}")
                output_parts.append(f"\n## {section_name}\n" + "\n".join(formatted_items) + "\n")
        
        return "\n".join(output_parts)
    
    def generate_knowledge_output(self) -> str:
        """Generate the complete knowledge output."""
        output_parts = []
        
        # Add forest-generated content
        forest_output = self.forest.generate_knowledge_output()
        if forest_output:
            output_parts.append(forest_output)
        
        # Add additional sections
        additional_output = self._format_additional_sections()
        if additional_output:
            output_parts.append(additional_output)
        
        # Add backward-compatible custom sections
        if self.workflow_section:
            if self.workflow_title:
                output_parts.append(f"\n## {self.workflow_title}\n{self.workflow_section}")
            else:
                output_parts.append(f"\n{self.workflow_section}")
        
        if self.background_knowledge:
            if self.background_title:
                output_parts.append(f"\n## {self.background_title}\n{self.background_knowledge}")
            else:
                output_parts.append(f"\n{self.background_knowledge}")
        
        if self.things_you_should_know:
            if self.things_title:
                output_parts.append(f"\n## {self.things_title}\n{self.things_you_should_know}")
            else:
                output_parts.append(f"\n{self.things_you_should_know}")
        
        return "\n".join(filter(None, output_parts))
    
    def generate_high_quality_prompt(self) -> str:
        """
        Generate high-quality, production-ready AI agent prompt.
        
        This method produces concise, practical prompts optimized for production use,
        following the format used in successful AI systems.
        
        Returns:
            High-quality formatted agent instruction prompt
        """
        return self._high_quality_formatter.format_agent_prompt(
            base_description=self.base_description,
            workflow_section=self.workflow_section,
            background_knowledge=self.background_knowledge,
            things_you_should_know=self.things_you_should_know
        )
    
    def __str__(self) -> str:
        """Generate complete agent instruction set."""
        return self.generate_knowledge_output()
    
    def __repr__(self) -> str:
        """Developer representation."""
        return f"FoKn(areas={len(self.forest.knowledge_areas)}, sections={len(self.additional_sections)})"