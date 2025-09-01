"""
Requirement Knowledge Tree - Manages variable requirements and dependencies.

This module handles requirement-based knowledge for AI agents, including
variable requirements, dependency validation, and prerequisite management.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any, List, Set


class RequirementKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for requirements and dependencies management.
    
    Manages variable requirements, dependencies, prerequisites,
    and validation rules for agent operations.
    """
    
    def __init__(self):
        """Initialize the requirement knowledge tree."""
        super().__init__(
            tree_name="Requirements & Dependencies",
            tree_description="Variable requirements and operational dependencies"
        )
        
        # Track required variables
        self._required_variables: Set[str] = set()
        self._optional_variables: Set[str] = set()
    
    def format_knowledge_section(self) -> str:
        """
        Format requirement knowledge into agent instruction section.
        
        Returns:
            Formatted requirement section for agent instructions
        """
        if self.is_empty() and not self._required_variables and not self._optional_variables:
            return ""
        
        output_parts = []
        
        # Format required variables
        if self._required_variables:
            formatted_required = [f"- {var}" for var in sorted(self._required_variables)]
            output_parts.append(f"\n## Required Variables\n" + "\n".join(formatted_required))
        
        # Format optional variables
        if self._optional_variables:
            formatted_optional = [f"- {var}" for var in sorted(self._optional_variables)]
            output_parts.append(f"\n## Optional Variables\n" + "\n".join(formatted_optional))
        
        # Format simple requirement information
        if self.knowledge_items:
            formatted_reqs = []
            for req in self.knowledge_items:
                formatted_reqs.append(f"- {req}")
            output_parts.append(f"\n## General Requirements\n" + "\n".join(formatted_reqs))
        
        # Format structured requirement information
        if self.structured_items:
            structured_output = self._format_structured_requirements()
            if structured_output:
                output_parts.append(structured_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_required_variable(self, variable_name: str, description: str = "", validation_rule: str = "") -> 'RequirementKnowledgeTree':
        """
        Add a required variable.
        
        Args:
            variable_name: Name of the required variable
            description: Description of why this variable is required
            validation_rule: Optional validation rule for the variable
            
        Returns:
            Self for method chaining
        """
        self._required_variables.add(variable_name)
        
        if description or validation_rule:
            req_data = {
                "type": "required_variable",
                "name": variable_name,
                "description": description,
                "validation_rule": validation_rule
            }
            self.add_structured_knowledge(req_data)
        
        return self
    
    def add_optional_variable(self, variable_name: str, description: str = "", default_value: Any = None) -> 'RequirementKnowledgeTree':
        """
        Add an optional variable.
        
        Args:
            variable_name: Name of the optional variable
            description: Description of the optional variable
            default_value: Default value if variable is not provided
            
        Returns:
            Self for method chaining
        """
        self._optional_variables.add(variable_name)
        
        if description or default_value is not None:
            opt_data = {
                "type": "optional_variable",
                "name": variable_name,
                "description": description,
                "default_value": default_value
            }
            self.add_structured_knowledge(opt_data)
        
        return self
    
    def add_dependency_requirement(self, dependent: str, dependencies: List[str], description: str = "") -> 'RequirementKnowledgeTree':
        """
        Add dependency requirement between variables.
        
        Args:
            dependent: Variable that depends on others
            dependencies: List of variables that must exist first
            description: Description of the dependency relationship
            
        Returns:
            Self for method chaining
        """
        dep_data = {
            "type": "dependency_requirement",
            "dependent": dependent,
            "dependencies": dependencies,
            "description": description
        }
        return self.add_structured_knowledge(dep_data)
    
    def add_prerequisite(self, operation: str, prerequisites: List[str], description: str = "") -> 'RequirementKnowledgeTree':
        """
        Add prerequisite requirements for operations.
        
        Args:
            operation: Operation name
            prerequisites: List of prerequisites needed
            description: Description of why prerequisites are needed
            
        Returns:
            Self for method chaining
        """
        prereq_data = {
            "type": "prerequisite",
            "operation": operation,
            "prerequisites": prerequisites,
            "description": description
        }
        return self.add_structured_knowledge(prereq_data)
    
    def add_validation_rule(self, variable: str, rule: str, description: str = "") -> 'RequirementKnowledgeTree':
        """
        Add validation rule for a variable.
        
        Args:
            variable: Variable name
            rule: Validation rule
            description: Description of the validation rule
            
        Returns:
            Self for method chaining
        """
        validation_data = {
            "type": "validation_rule",
            "variable": variable,
            "rule": rule,
            "description": description
        }
        return self.add_structured_knowledge(validation_data)
    
    def add_conditional_requirement(self, condition: str, required_if_true: List[str], required_if_false: List[str] = None) -> 'RequirementKnowledgeTree':
        """
        Add conditional requirement based on conditions.
        
        Args:
            condition: The condition to check
            required_if_true: Variables required if condition is true
            required_if_false: Variables required if condition is false
            
        Returns:
            Self for method chaining
        """
        conditional_data = {
            "type": "conditional_requirement",
            "condition": condition,
            "required_if_true": required_if_true,
            "required_if_false": required_if_false or []
        }
        return self.add_structured_knowledge(conditional_data)
    
    def add_general_requirement(self, requirement: str) -> 'RequirementKnowledgeTree':
        """
        Add general requirement information.
        
        Args:
            requirement: The requirement description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(requirement)
    
    def get_required_variables(self) -> Set[str]:
        """
        Get all required variables.
        
        Returns:
            Set of required variable names
        """
        return self._required_variables.copy()
    
    def get_optional_variables(self) -> Set[str]:
        """
        Get all optional variables.
        
        Returns:
            Set of optional variable names
        """
        return self._optional_variables.copy()
    
    def is_variable_required(self, variable_name: str) -> bool:
        """
        Check if a variable is required.
        
        Args:
            variable_name: Variable name to check
            
        Returns:
            True if variable is required, False otherwise
        """
        return variable_name in self._required_variables
    
    def is_variable_optional(self, variable_name: str) -> bool:
        """
        Check if a variable is optional.
        
        Args:
            variable_name: Variable name to check
            
        Returns:
            True if variable is optional, False otherwise
        """
        return variable_name in self._optional_variables
    
    def _format_structured_requirements(self) -> str:
        """Format structured requirements information."""
        if not self.structured_items:
            return ""
        
        # Group by type
        dependencies = [item for item in self.structured_items if item.get("type") == "dependency_requirement"]
        prerequisites = [item for item in self.structured_items if item.get("type") == "prerequisite"]
        validations = [item for item in self.structured_items if item.get("type") == "validation_rule"]
        conditionals = [item for item in self.structured_items if item.get("type") == "conditional_requirement"]
        required_vars = [item for item in self.structured_items if item.get("type") == "required_variable"]
        optional_vars = [item for item in self.structured_items if item.get("type") == "optional_variable"]
        
        output_parts = []
        
        if dependencies:
            formatted_deps = []
            for dep in dependencies:
                dep_str = f"- `{dep['dependent']}` depends on: {', '.join(dep['dependencies'])}"
                if dep.get('description'):
                    dep_str += f" ({dep['description']})"
                formatted_deps.append(dep_str)
            output_parts.append(f"\n## Variable Dependencies\n" + "\n".join(formatted_deps))
        
        if prerequisites:
            formatted_prereqs = []
            for prereq in prerequisites:
                prereq_str = f"- **{prereq['operation']}** requires: {', '.join(prereq['prerequisites'])}"
                if prereq.get('description'):
                    prereq_str += f" ({prereq['description']})"
                formatted_prereqs.append(prereq_str)
            output_parts.append(f"\n## Operation Prerequisites\n" + "\n".join(formatted_prereqs))
        
        if validations:
            formatted_validations = []
            for validation in validations:
                val_str = f"- `{validation['variable']}` must satisfy: {validation['rule']}"
                if validation.get('description'):
                    val_str += f" ({validation['description']})"
                formatted_validations.append(val_str)
            output_parts.append(f"\n## Validation Rules\n" + "\n".join(formatted_validations))
        
        if conditionals:
            formatted_conditionals = []
            for conditional in conditionals:
                cond_str = f"- If `{conditional['condition']}` then require: {', '.join(conditional['required_if_true'])}"
                if conditional['required_if_false']:
                    cond_str += f", else require: {', '.join(conditional['required_if_false'])}"
                formatted_conditionals.append(cond_str)
            output_parts.append(f"\n## Conditional Requirements\n" + "\n".join(formatted_conditionals))
        
        if required_vars:
            formatted_required_details = []
            for req_var in required_vars:
                req_str = f"- `{req_var['name']}`"
                if req_var.get('description'):
                    req_str += f": {req_var['description']}"
                if req_var.get('validation_rule'):
                    req_str += f" [Rule: {req_var['validation_rule']}]"
                formatted_required_details.append(req_str)
            output_parts.append(f"\n## Required Variable Details\n" + "\n".join(formatted_required_details))
        
        if optional_vars:
            formatted_optional_details = []
            for opt_var in optional_vars:
                opt_str = f"- `{opt_var['name']}`"
                if opt_var.get('description'):
                    opt_str += f": {opt_var['description']}"
                if opt_var.get('default_value') is not None:
                    opt_str += f" [Default: {opt_var['default_value']}]"
                formatted_optional_details.append(opt_str)
            output_parts.append(f"\n## Optional Variable Details\n" + "\n".join(formatted_optional_details))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""