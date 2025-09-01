"""
Variable Knowledge Tree - Manages variables and state data.

This module handles variable-based knowledge for AI agents, including
state variables, data variables, and variable dependencies.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any, List, Optional


class VariableKnowledgeTree(StructuredKnowledgeTree):
    """
    Knowledge tree for variables and state data management.
    
    Manages variables, their values, dependencies, and state information
    that the agent needs to track and use.
    """
    
    def __init__(self):
        """Initialize the variable knowledge tree."""
        super().__init__(
            tree_name="Variables and State",
            tree_description="Agent variables, state data, and dependencies"
        )
        
        # Internal variable storage
        self._variables = {}
        self._variable_dependencies = {}
    
    def format_knowledge_section(self) -> str:
        """
        Format variable knowledge into agent instruction section.
        
        Returns:
            Formatted variable section for agent instructions
        """
        if self.is_empty() and not self._variables:
            return ""
        
        output_parts = []
        
        # Format stored variables
        if self._variables:
            variables_output = self._format_stored_variables()
            if variables_output:
                output_parts.append(variables_output)
        
        # Format variable dependencies
        if self._variable_dependencies:
            dependencies_output = self._format_variable_dependencies()
            if dependencies_output:
                output_parts.append(dependencies_output)
        
        # Format simple variable information
        if self.knowledge_items:
            formatted_vars = []
            for var_info in self.knowledge_items:
                formatted_vars.append(f"- {var_info}")
            output_parts.append(f"\n## Variable Information\n" + "\n".join(formatted_vars))
        
        # Format structured variable information
        if self.structured_items:
            structured_output = self._format_structured_variables()
            if structured_output:
                output_parts.append(structured_output)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_variable(self, name: str, value: Any, description: str = "", var_type: str = "unknown") -> 'VariableKnowledgeTree':
        """
        Add a variable with its value.
        
        Args:
            name: Variable name
            value: Variable value
            description: Optional description of the variable
            var_type: Type of the variable (string, number, object, etc.)
            
        Returns:
            Self for method chaining
        """
        self._variables[name] = {
            "value": value,
            "description": description,
            "type": var_type
        }
        return self
    
    def get_variable(self, name: str) -> Any:
        """
        Get a variable's value.
        
        Args:
            name: Variable name
            
        Returns:
            Variable value or None if not found
        """
        var_info = self._variables.get(name)
        return var_info["value"] if var_info else None
    
    def update_variable(self, name: str, value: Any) -> 'VariableKnowledgeTree':
        """
        Update an existing variable's value.
        
        Args:
            name: Variable name
            value: New value
            
        Returns:
            Self for method chaining
        """
        if name in self._variables:
            self._variables[name]["value"] = value
        else:
            self.add_variable(name, value)
        return self
    
    def add_variable_dependency(self, variable: str, depends_on: List[str], description: str = "") -> 'VariableKnowledgeTree':
        """
        Add variable dependency information.
        
        Args:
            variable: Variable name
            depends_on: List of variables this variable depends on
            description: Optional description of the dependency
            
        Returns:
            Self for method chaining
        """
        self._variable_dependencies[variable] = {
            "depends_on": depends_on,
            "description": description
        }
        return self
    
    def add_state_variable(self, name: str, value: Any, description: str = "") -> 'VariableKnowledgeTree':
        """
        Add a state variable (workflow state information).
        
        Args:
            name: State variable name
            value: State value
            description: Description of the state
            
        Returns:
            Self for method chaining
        """
        state_data = {
            "type": "state_variable",
            "name": name,
            "value": value,
            "description": description
        }
        return self.add_structured_knowledge(state_data)
    
    def add_data_variable(self, name: str, value: Any, source: str = "", description: str = "") -> 'VariableKnowledgeTree':
        """
        Add a data variable (processed data or results).
        
        Args:
            name: Data variable name
            value: Data value
            source: Source of the data
            description: Description of the data
            
        Returns:
            Self for method chaining
        """
        data_var = {
            "type": "data_variable",
            "name": name,
            "value": value,
            "source": source,
            "description": description
        }
        return self.add_structured_knowledge(data_var)
    
    def add_config_variable(self, name: str, value: Any, description: str = "") -> 'VariableKnowledgeTree':
        """
        Add a configuration variable.
        
        Args:
            name: Config variable name
            value: Config value
            description: Description of the configuration
            
        Returns:
            Self for method chaining
        """
        config_var = {
            "type": "config_variable",
            "name": name,
            "value": value,
            "description": description
        }
        return self.add_structured_knowledge(config_var)
    
    def add_result_variable(self, name: str, value: Any, operation: str = "", description: str = "") -> 'VariableKnowledgeTree':
        """
        Add a result variable (output from operations).
        
        Args:
            name: Result variable name
            value: Result value
            operation: Operation that produced this result
            description: Description of the result
            
        Returns:
            Self for method chaining
        """
        result_var = {
            "type": "result_variable",
            "name": name,
            "value": value,
            "operation": operation,
            "description": description
        }
        return self.add_structured_knowledge(result_var)
    
    def add_variable_info(self, info: str) -> 'VariableKnowledgeTree':
        """
        Add general variable information.
        
        Args:
            info: Variable information text
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(info)
    
    def get_all_variables(self) -> Dict[str, Any]:
        """
        Get all stored variables.
        
        Returns:
            Dictionary of all variables
        """
        return self._variables.copy()
    
    def has_variable(self, name: str) -> bool:
        """
        Check if a variable exists.
        
        Args:
            name: Variable name
            
        Returns:
            True if variable exists, False otherwise
        """
        return name in self._variables
    
    def _format_stored_variables(self) -> str:
        """Format stored variables section."""
        if not self._variables:
            return ""
        
        formatted_vars = []
        for name, var_info in self._variables.items():
            var_str = f"- `{name}`: {var_info['value']}"
            if var_info.get('description'):
                var_str += f" ({var_info['description']})"
            if var_info.get('type') and var_info['type'] != 'unknown':
                var_str += f" [Type: {var_info['type']}]"
            formatted_vars.append(var_str)
        
        return f"\n## Current Variables\n" + "\n".join(formatted_vars) + "\n"
    
    def _format_variable_dependencies(self) -> str:
        """Format variable dependencies section."""
        if not self._variable_dependencies:
            return ""
        
        formatted_deps = []
        for var_name, dep_info in self._variable_dependencies.items():
            dep_str = f"- `{var_name}` depends on: {', '.join(dep_info['depends_on'])}"
            if dep_info.get('description'):
                dep_str += f" ({dep_info['description']})"
            formatted_deps.append(dep_str)
        
        return f"\n## Variable Dependencies\n" + "\n".join(formatted_deps) + "\n"
    
    def _format_structured_variables(self) -> str:
        """Format structured variables section."""
        if not self.structured_items:
            return ""
        
        # Group by type
        state_vars = [item for item in self.structured_items if item.get("type") == "state_variable"]
        data_vars = [item for item in self.structured_items if item.get("type") == "data_variable"]
        config_vars = [item for item in self.structured_items if item.get("type") == "config_variable"]
        result_vars = [item for item in self.structured_items if item.get("type") == "result_variable"]
        
        output_parts = []
        
        if state_vars:
            formatted_state = []
            for var in state_vars:
                var_str = f"- `{var['name']}`: {var['value']}"
                if var.get('description'):
                    var_str += f" ({var['description']})"
                formatted_state.append(var_str)
            output_parts.append(f"\n## State Variables\n" + "\n".join(formatted_state))
        
        if data_vars:
            formatted_data = []
            for var in data_vars:
                var_str = f"- `{var['name']}`: {var['value']}"
                if var.get('source'):
                    var_str += f" [Source: {var['source']}]"
                if var.get('description'):
                    var_str += f" ({var['description']})"
                formatted_data.append(var_str)
            output_parts.append(f"\n## Data Variables\n" + "\n".join(formatted_data))
        
        if config_vars:
            formatted_config = []
            for var in config_vars:
                var_str = f"- `{var['name']}`: {var['value']}"
                if var.get('description'):
                    var_str += f" ({var['description']})"
                formatted_config.append(var_str)
            output_parts.append(f"\n## Configuration Variables\n" + "\n".join(formatted_config))
        
        if result_vars:
            formatted_result = []
            for var in result_vars:
                var_str = f"- `{var['name']}`: {var['value']}"
                if var.get('operation'):
                    var_str += f" [From: {var['operation']}]"
                if var.get('description'):
                    var_str += f" ({var['description']})"
                formatted_result.append(var_str)
            output_parts.append(f"\n## Result Variables\n" + "\n".join(formatted_result))
        
        return "\n".join(output_parts) + "\n" if output_parts else ""