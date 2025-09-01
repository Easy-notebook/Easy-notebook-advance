from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.Behavior import Behavior, event, thinking, finnish

class WorkflowInitialization(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_2_data_integrity_assurance",
            section_id="section_1_workflow_initialization",
            name="Workflow Initialization",
            ability="Initialize the workflow",
            require_variables=[
                            "problem_description", 
                            ]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("I will now analyze which specific actions are needed for this stage based on your requirements.") \
            .next_thinking_event(event_tag="select_stage_actions",
                                textArray=["PCS Agent analyzing stage requirements...", 
                                            "Applying existence first principles...", 
                                            "Selecting optimal actions for your goal..."])\
            .end_event()
    
    @thinking("select_stage_actions")
    def select_stage_actions(self):
        # Get user goal and current state for intelligent action selection
        user_goal = self.input.get("user_goal", "Complete data science analysis")
        current_data_state = "Initial stage - no data processed yet"
        
        # Get available sections for this stage
        available_sections = self.available_actions if isinstance(self.available_actions, list) else []
        
        # Use PCS Agent to intelligently select necessary actions
        pcs_agent = PCSAgent(
            problem_description=self.input.get("problem_description", ""),
            context_description=self.input.get("context_description", ""),
            llm=llm
        )
        
        # Define stage goal for Data Integrity Assurance
        stage_goal = "Ensure data integrity through dimensional validation, value validation, completeness restoration and comprehensive verification"
        
        try:
            stage_analysis = pcs_agent.select_stage_actions_cli(
                stage_name=self.stage_name,
                stage_goal=stage_goal,
                available_actions=available_sections,
                current_data_state=current_data_state,
                user_goal=user_goal
            )                 
            if stage_analysis and not stage_analysis.get("error"):
                selected_actions = [action["action_id"] for action in stage_analysis.get("selected_actions", [])]
                execution_order = stage_analysis.get("execution_order", selected_actions)
                stage_execution_plan = stage_analysis.get("stage_execution_plan", f"Execute selected sections: {', '.join(execution_order)}")
                
                action_selection = {
                    "execution_order": execution_order,
                    "stage_execution_plan": stage_execution_plan,
                    "goal_relevance": stage_analysis.get("goal_relevance_analysis", ""),
                    "selected_actions": stage_analysis.get("selected_actions", []),
                    "skip_actions": stage_analysis.get("skip_actions", [])
                }
            else:
                # Fallback to all sections if PCS analysis fails
                print(f"PCS Agent analysis failed: {stage_analysis.get('error') if stage_analysis else 'No response'}")
                action_selection = {
                    "execution_order": available_sections,
                    "stage_execution_plan": f"Executing all available sections: {', '.join(available_sections)}",
                    "goal_relevance": "Using fallback strategy due to analysis failure",
                    "selected_actions": [{"action_id": s, "necessity": "fallback"} for s in available_sections],
                    "skip_actions": []
                }
                
        except Exception as e:
            print(f"Error in PCS Agent analysis: {str(e)}")
            # Fallback to all sections
            action_selection = {
                "execution_order": available_sections,
                "stage_execution_plan": f"Executing all available sections (error fallback): {', '.join(available_sections)}",
                "goal_relevance": f"Using error fallback due to: {str(e)}",
                "selected_actions": [{"action_id": s, "necessity": "error_fallback"} for s in available_sections],
                "skip_actions": []
            }
        
        return self.conclusion("action_selection", action_selection)\
            .end_event()


    @finnish("action_selection")
    def action_selection(self):
        action_selection = self.get_thinking("action_selection")
        
        # if action_selection.get("goal_relevance"):
        #     self.add_text(f"**Goal Relevance**: {action_selection['goal_relevance']}")
        # result = result.add_text("### Selected Actions:")
        # selected_actions = action_selection.get("selected_actions", [])
        # for action in selected_actions:
        #     if isinstance(action, dict):
        #         necessity = action.get("necessity", "unknown")
        #         action_id = action.get("action_id", "unknown")
        #         contribution = action.get("contribution_to_goal", "")
        #         if contribution:
        #             result = result.add_text(f"- **{action_id}** ({necessity}): {contribution}")
        #         else:
        #             result = result.add_text(f"- **{action_id}** ({necessity})")
        
        # Show skipped actions if any
        # skip_actions = action_selection.get("skip_actions", [])
        # if skip_actions:
        #     result = result.add_text("### Skipped Actions:")
        #     for skip_action in skip_actions:
        #         if isinstance(skip_action, dict):
        #             action_id = skip_action.get("action_id", "unknown")
        #             skip_reason = skip_action.get("skip_reason", "No reason provided")
        #             result = result.add_text(f"- **{action_id}**: {skip_reason}")
        
        # result = result.add_text("### Execution Plan:")
        self.add_text(action_selection["stage_execution_plan"])
        
        # Update the workflow with selected steps
        return self.update_stage_steps(action_selection["execution_order"]) \
            .end_event()

async def generate_data_cleaning_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()