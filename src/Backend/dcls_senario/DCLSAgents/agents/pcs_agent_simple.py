from .base_agent import BaseAgent
from DCLSAgents.prompts.pcs_prompts_simple import *
import json

class SimplePCSAgent(BaseAgent):
    def __init__(self, problem_description, context_description, memory=None, llm=None):
        """
        Simplified PCS Agent with Yes/No multi-answer structure
        
        Features:
        - Simple Yes/No decision making
        - Clean JSON output format
        - Focused on user goal achievement
        - No complex multi-layered analysis
        """
        system_message = SIMPLE_PCS_SYSTEM_PROMPT.format(
            problem_description=problem_description,
            context_description=context_description
        )
        super().__init__(
            name="Simple PCS Agent",
            model=llm if llm else "gpt-4o",
            system_prompt=system_message
        )
        self.context_description = context_description
        self.problem_description = problem_description
        self.info("Simple PCS Agent initialized with Yes/No decision structure")
    
    def generate_workflow_cli(self, user_goal: str, problem_description: str, context_description: str):
        """
        Simple workflow generation with Yes/No decisions for each stage
        
        Returns clean JSON with minimal_workflow and promise only
        """
        input_data = SIMPLE_WORKFLOW_GENERATION_TEMPLATE.format(
            user_goal=user_goal,
            problem_description=problem_description,
            context_description=context_description
        )
        
        self.info("Generating simple workflow with Yes/No decisions")
        response = self.analyzing(input_data)
        
        if response:
            try:
                if isinstance(response, dict):
                    # Extract only the essential fields for compatibility
                    minimal_workflow = []
                    stage_decisions = response.get("stage_decisions", {})
                    
                    # Build minimal_workflow from Yes decisions
                    stage_order = [
                        "Data Existence Establishment",
                        "Data Integrity Assurance", 
                        "Data Insight Acquisition",
                        "Methodology Strategy Formulation",
                        "Model Implementation Execution",
                        "Stability Validation",
                        "Results Evaluation Confirmation"
                    ]
                    
                    for stage in stage_order:
                        if stage_decisions.get(stage, "No").lower() == "yes":
                            minimal_workflow.append(stage)
                    
                    # Extract reasoning if available
                    reasoning = response.get("reasoning", {})
                    
                    return {
                        "minimal_workflow": minimal_workflow,
                        "promise": response.get("promise", f"I will execute the selected stages to achieve: {user_goal}"),
                        "stage_reasoning": reasoning
                    }
                else:
                    # Handle non-dict response
                    self.warning(f"Unexpected response format: {type(response)}")
                    return {"error": "Invalid response format from agent"}
                    
            except Exception as e:
                self.warning(f"Error parsing simple workflow response: {e}")
                return {"error": f"Failed to parse workflow response: {str(e)}"}
        else:
            return {"error": "Could not generate simple workflow"}

    def select_stage_actions_cli(self, stage_name: str, stage_goal: str,
                                available_actions: list, current_data_state: str, user_goal: str):
        """
        Simple action selection with Yes/No decisions for each action
        
        Returns clean JSON with selected_actions, execution_order, and skip_actions
        """
        self.info(f"Simple action selection for stage: {stage_name}")
        
        # Generate action questions dynamically
        action_questions, action_decision_template = generate_action_questions(available_actions)
        actions_str = "\n".join([f"- {action}" for action in available_actions])
        
        input_data = SIMPLE_ACTION_SELECTION_TEMPLATE.format(
            user_goal=user_goal,
            stage_name=stage_name,
            stage_goal=stage_goal,
            current_data_state=current_data_state,
            available_actions=actions_str,
            action_questions=action_questions,
            action_decision_template=action_decision_template
        )
        
        response = self.analyzing(input_data)
        
        if response:
            try:
                if isinstance(response, dict):
                    # Build clean response structure
                    action_decisions = response.get("action_decisions", {})
                    selected_actions = []
                    skip_actions = []
                    execution_order = []
                    
                    # Process each action based on Yes/No decision
                    for action in available_actions:
                        decision = action_decisions.get(action, "No").lower()
                        if decision == "yes":
                            selected_actions.append({
                                "action_id": action,
                                "necessity": "essential",
                                "contribution_to_goal": f"Supports {user_goal}"
                            })
                            execution_order.append(action)
                        else:
                            skip_actions.append({
                                "action_id": action,
                                "skip_reason": "Not needed for user goal"
                            })
                    
                    return {
                        "selected_actions": selected_actions,
                        "execution_order": execution_order,
                        "skip_actions": skip_actions,
                        "stage_execution_plan": response.get("stage_execution_plan", 
                                                           f"Execute selected actions to achieve: {user_goal}")
                    }
                else:
                    self.warning(f"Unexpected response format: {type(response)}")
                    # Fallback to all actions
                    return {
                        "selected_actions": [{"action_id": action, "necessity": "fallback"} 
                                           for action in available_actions],
                        "execution_order": available_actions,
                        "skip_actions": []
                    }
                    
            except Exception as e:
                self.warning(f"Error parsing simple action selection: {e}")
                # Fallback to all actions
                return {
                    "selected_actions": [{"action_id": action, "necessity": "fallback"} 
                                       for action in available_actions],
                    "execution_order": available_actions,
                    "skip_actions": []
                }
        else:
            self.warning("Simple action selection failed, using fallback")
            return {
                "selected_actions": [{"action_id": action, "necessity": "fallback"} 
                                   for action in available_actions],
                "execution_order": available_actions,
                "skip_actions": []
            }

    def evaluate_problem_definition_cli(self, problem_description: str, context_description: str, 
                                      var_json: str, unit_check: str, relative_analysis: str):
        """
        Simple problem definition evaluation with single focused hypothesis
        """
        self.info("Simple problem definition evaluation")
        
        input_data = SIMPLE_HYPOTHESIS_GENERATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            unit_check=unit_check,
            relevant_variables_analysis=relative_analysis
        )

        response = self.analyzing(input_data)
        
        if response:
            try:
                if isinstance(response, dict):
                    return {
                        "hypothesis": response.get("hypothesis", "Data quality assessment needed"),
                        "verification_method": response.get("vds_verification_method", "VDS analysis"),
                        "expected_outcome": response.get("expected_outcome", "Quality validation")
                    }
                else:
                    return {
                        "hypothesis": "Simple data quality evaluation needed",
                        "verification_method": "VDS tools analysis",
                        "expected_outcome": "Data quality validation"
                    }
                    
            except Exception as e:
                self.warning(f"Error parsing simple hypothesis: {e}")
                return {
                    "hypothesis": "Data quality evaluation needed",
                    "verification_method": "VDS analysis",
                    "expected_outcome": "Quality validation"
                }
        else:
            return {
                "hypothesis": "Unable to generate simple hypothesis",
                "verification_method": "Manual review",
                "expected_outcome": "Basic quality check"
            }

# Make SimplePCSAgent available for import
__all__ = ["SimplePCSAgent"]