from .base_agent import BaseAgent
from DCLSAgents.prompts.pcs_prompts import *
from DCLSAgents.prompts.pcs_prompts_enhanced import *
import json
import pandas as pd

class EnhancedPCSAgent(BaseAgent):
    def __init__(self, problem_description, context_description, memory=None, llm=None):
        """
        Enhanced PCS Agent with multi-answer structure and problem decomposition
        
        Features:
        - Multi-layered problem decomposition
        - VDS tools integration awareness  
        - Backwards reasoning from goals
        - Optimized for efficiency and goal achievement
        """
        system_message = ENHANCED_PCS_EVALUATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description
        )
        super().__init__(
            name="Enhanced PCS Agent",
            model=llm if llm else "gpt-4o",  # Use more capable model for complex reasoning
            system_prompt=system_message
        )
        self.context_description = context_description
        self.problem_description = problem_description
        self.info("Enhanced PCS Agent initialized with multi-answer capabilities")
    
    def generate_workflow_cli(self, user_goal: str, problem_description: str, context_description: str):
        """
        Enhanced workflow generation with multi-answer decomposition
        
        Returns structured analysis with:
        1. Goal decomposition
        2. Dependency analysis  
        3. Minimal execution plan
        4. Final commitment
        """
        input_data = ENHANCED_WORKFLOW_GENERATION_TEMPLATE.format(
            user_goal=user_goal,
            problem_description=problem_description,
            context_description=context_description
        )
        
        self.info("Generating enhanced workflow with multi-answer analysis")
        response = self.analyzing(input_data)
        
        if response:
            # Extract the minimal workflow from the structured response
            try:
                if isinstance(response, dict):
                    # If response contains structured answers, extract minimal_workflow
                    minimal_workflow = response.get("minimal_workflow", [])
                    promise = response.get("commitment", response.get("promise", ""))
                    
                    return {
                        "minimal_workflow": minimal_workflow,
                        "promise": promise,
                        "enhanced_analysis": response
                    }
                elif isinstance(response, list) and len(response) > 0:
                    # Handle list response format
                    last_answer = response[-1] if isinstance(response[-1], dict) else {}
                    return {
                        "minimal_workflow": last_answer.get("minimal_workflow", []),
                        "promise": last_answer.get("commitment", "Workflow analysis completed"),
                        "multi_answer": response
                    }
                else:
                    # Fallback to original format
                    return response
            except Exception as e:
                self.warning(f"Error parsing enhanced workflow response: {e}")
                return response
        else:
            return {"error": "Could not generate enhanced workflow"}

    def select_stage_actions_cli(self, stage_name: str, stage_goal: str,
                                available_actions: list, current_data_state: str, user_goal: str):
        """
        Enhanced action selection with multi-answer problem decomposition
        
        Returns structured analysis with:
        1. Goal context analysis
        2. Action necessity analysis
        3. Execution strategy
        4. Stage commitment plan
        """
        self.info(f"Enhanced action selection for stage: {stage_name}")
        
        # Format available_actions for better readability
        actions_str = "\n".join([f"- {action}" for action in available_actions])
        
        input_data = ENHANCED_STAGE_ACTION_SELECTION_TEMPLATE.format(
            stage_name=stage_name,
            stage_goal=stage_goal,
            available_actions=actions_str,
            current_data_state=current_data_state,
            user_goal=user_goal
        )
        
        response = self.analyzing(input_data)
        
        if response:
            try:
                # Handle multi-answer structure response
                if isinstance(response, list) and len(response) >= 4:
                    # Extract from multi-answer structure
                    goal_analysis = response[0] if len(response) > 0 else {}
                    necessity_analysis = response[1] if len(response) > 1 else {}
                    execution_strategy = response[2] if len(response) > 2 else {}
                    commitment_plan = response[3] if len(response) > 3 else {}
                    
                    # Build compatible response structure
                    selected_actions = []
                    skip_actions = []
                    
                    # Extract essential actions
                    essential = necessity_analysis.get("essential_actions", [])
                    for action in essential:
                        selected_actions.append({
                            "action_id": action.get("action_id", ""),
                            "contribution_to_goal": action.get("goal_contribution", ""),
                            "necessity": "essential",
                            "provides_for_goal": action.get("necessity_reason", "")
                        })
                    
                    # Extract optional actions (mark as helpful)
                    optional = necessity_analysis.get("optional_actions", [])
                    for action in optional:
                        selected_actions.append({
                            "action_id": action.get("action_id", ""),
                            "contribution_to_goal": action.get("optional_reason", ""),
                            "necessity": "helpful", 
                            "provides_for_goal": "Additional value"
                        })
                    
                    # Extract redundant actions for skipping
                    redundant = necessity_analysis.get("redundant_actions", [])
                    for action in redundant:
                        skip_actions.append({
                            "action_id": action,
                            "skip_reason": "Not necessary for user goal"
                        })
                    
                    return {
                        "goal_relevance_analysis": goal_analysis.get("user_goal_interpretation", ""),
                        "essential_for_user_goal": goal_analysis.get("goal_components", []),
                        "selected_actions": selected_actions,
                        "execution_order": execution_strategy.get("execution_order", []),
                        "skip_actions": skip_actions,
                        "stage_execution_plan": commitment_plan.get("stage_execution_plan", ""),
                        "enhanced_analysis": {
                            "goal_context": goal_analysis,
                            "necessity_analysis": necessity_analysis,
                            "execution_strategy": execution_strategy,
                            "commitment_plan": commitment_plan
                        }
                    }
                elif isinstance(response, dict):
                    # Handle direct dict response (backwards compatibility)
                    return response
                else:
                    # Handle simple response format
                    return {
                        "goal_relevance_analysis": "Analysis completed",
                        "selected_actions": [{"action_id": action, "necessity": "essential"} 
                                           for action in available_actions],
                        "execution_order": available_actions,
                        "skip_actions": [],
                        "stage_execution_plan": f"Execute all actions for {stage_name}"
                    }
                    
            except Exception as e:
                self.warning(f"Error parsing enhanced action selection: {e}")
                # Fallback to simple response
                return {
                    "selected_actions": [{"action_id": action, "necessity": "essential"} 
                                       for action in available_actions],
                    "execution_order": available_actions,
                    "skip_actions": []
                }
        else:
            self.warning("Enhanced action selection failed, using fallback")
            return {
                "selected_actions": [{"action_id": action, "necessity": "fallback"} 
                                   for action in available_actions],
                "execution_order": available_actions,
                "skip_actions": []
            }

    def evaluate_problem_definition_cli(self, problem_description: str, context_description: str, 
                                      var_json: str, unit_check: str, relative_analysis: str):
        """
        Enhanced problem definition evaluation with VDS integration awareness
        """
        self.info("Enhanced problem definition evaluation")
        
        input_data = ENHANCED_HYPOTHESIS_GENERATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            var_json=json.dumps(var_json, ensure_ascii=False, indent=2),
            unit_check=unit_check,
            relevant_variables_analysis=relative_analysis
        )

        response = self.analyzing(input_data)
        
        if response:
            try:
                # Handle multi-answer structure
                if isinstance(response, list) and len(response) >= 2:
                    risk_assessment = response[0] if len(response) > 0 else {}
                    hypothesis = response[1] if len(response) > 1 else {}
                    validation_strategy = response[2] if len(response) > 2 else {}
                    
                    return {
                        "hypothesis": hypothesis.get("hypothesis", "Data quality assessment needed"),
                        "verification_method": hypothesis.get("vds_verification_method", "VDS analysis"),
                        "expected_outcome": hypothesis.get("expected_findings", "Quality validation"),
                        "enhanced_analysis": {
                            "risk_assessment": risk_assessment,
                            "hypothesis_details": hypothesis,
                            "validation_strategy": validation_strategy
                        }
                    }
                elif isinstance(response, dict):
                    return response
                else:
                    return {"hypothesis": "Enhanced analysis completed", "verification_method": "VDS tools"}
                    
            except Exception as e:
                self.warning(f"Error parsing enhanced hypothesis: {e}")
                return {"hypothesis": "Data quality evaluation needed", "verification_method": "VDS analysis"}
        else:
            return {"hypothesis": "Unable to generate enhanced hypothesis", "verification_method": "Manual review"}

    def backwards_reasoning_analysis(self, target_outcome: str, problem_context: str):
        """
        Apply backwards reasoning for complex problem solving
        """
        self.info(f"Applying backwards reasoning for: {target_outcome}")
        
        input_data = BACKWARDS_REASONING_TEMPLATE.format(
            target_outcome=target_outcome,
            problem_context=problem_context
        )
        
        response = self.analyzing(input_data)
        return response if response else {"error": "Backwards reasoning analysis failed"}

# Backwards compatibility - create alias to original PCSAgent
PCSAgent = EnhancedPCSAgent