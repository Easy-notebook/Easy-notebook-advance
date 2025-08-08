from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.BaseAction import BaseAction, event, thinking, finnish

class WorkflowInitialization(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_3_data_insight_acquisition",
            section_id="section_1_workflow_initialization",
            name="Workflow Initialization",
            ability="Initialize the data insight acquisition workflow using intelligent action selection",
            require_variables=["problem_description"]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("**Chapter Goal**: Extract meaningful insights and patterns from cleaned data through exploratory data analysis") \
            .add_text("Analyzing which specific insight acquisition actions are needed based on your requirements") \
            .next_thinking_event(
                event_tag="select_stage_actions",
                textArray=[
                    "PCS Agent analyzing insight acquisition requirements...", 
                    "Evaluating data exploration strategies...", 
                    "Selecting optimal analytical approaches for your goal..."
                ],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("select_stage_actions")
    def select_stage_actions(self):
        try:
            # Get user goal and current state for intelligent action selection
            user_goal = self.input.get("user_goal", "Extract data insights through exploratory analysis")
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            
            # Define current data state (after cleaning phases)
            current_data_state = "Data has been cleaned and integrity assured, ready for insight extraction"
            
            # Get available sections for this stage
            available_sections = self.available_actions if isinstance(self.available_actions, list) else [
                "section_1_workflow_initialization",
                "section_2_current_data_state_assessment", 
                "section_3_targeted_inquiry_generation",
                "section_4_analytical_insight_extraction",
                "section_5_comprehensive_insight_consolidation"
            ]
            
            # Use PCS Agent to intelligently select necessary actions
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Define stage goal for Data Insight Acquisition
            stage_goal = "Extract meaningful insights, patterns, and relationships from clean data through comprehensive exploratory data analysis"
            
            stage_analysis = pcs_agent.select_stage_actions_cli(
                stage_name=self.stage_name,
                stage_goal=stage_goal,
                available_actions=available_sections,
                current_data_state=current_data_state,
                user_goal=user_goal
            )
            
            # Validate and process analysis results
            if stage_analysis and not stage_analysis.get("error"):
                selected_actions = [action["action_id"] for action in stage_analysis.get("selected_actions", [])]
                execution_order = stage_analysis.get("execution_order", selected_actions)
                stage_execution_plan = stage_analysis.get("stage_execution_plan", f"Execute selected sections: {', '.join(execution_order)}")
                goal_relevance = stage_analysis.get("goal_relevance_analysis", "")
                
                action_selection = {
                    "execution_order": execution_order,
                    "stage_execution_plan": stage_execution_plan,
                    "goal_relevance": goal_relevance,
                    "selected_actions": stage_analysis.get("selected_actions", []),
                    "skip_actions": stage_analysis.get("skip_actions", [])
                }
            else:
                # Fallback to essential sections if PCS analysis fails
                essential_sections = [
                    "section_1_workflow_initialization",
                    "section_2_current_data_state_assessment",
                    "section_3_targeted_inquiry_generation", 
                    "section_4_analytical_insight_extraction"
                ]
                
                action_selection = {
                    "execution_order": essential_sections,
                    "stage_execution_plan": f"Executing essential insight acquisition sections: {', '.join(essential_sections)}",
                    "goal_relevance": "Using fallback strategy for comprehensive data insight acquisition",
                    "selected_actions": [{"action_id": s, "necessity": "essential", "contribution_to_goal": "Core insight acquisition functionality"} for s in essential_sections],
                    "skip_actions": []
                }
                
            return self.conclusion("action_selection", action_selection)
        except Exception as e:
            # Error fallback with minimal essential sections
            error_sections = ["section_1_workflow_initialization", "section_2_current_data_state_assessment", "section_3_targeted_inquiry_generation"]
            
            error_selection = {
                "execution_order": error_sections,
                "stage_execution_plan": f"Error fallback: executing core sections: {', '.join(error_sections)}",
                "goal_relevance": f"Using error fallback due to: {str(e)}",
                "selected_actions": [{"action_id": s, "necessity": "error_fallback", "contribution_to_goal": "Essential functionality"} for s in error_sections],
                "skip_actions": []
            }
            return self.conclusion("action_selection", error_selection)
        finally:
            return self.end_event()

    @finnish("action_selection")
    def action_selection(self):
        action_selection = self.get_thinking("action_selection")
        
        # Display stage analysis and goal relevance
        goal_relevance = action_selection.get("goal_relevance", "")
        if goal_relevance:
            self.add_text(f"**Stage Analysis**: {goal_relevance}")
        
        # Display execution plan
        stage_execution_plan = action_selection.get("stage_execution_plan", "")
        self.add_text(f"**Execution Plan**: {stage_execution_plan}")
        
        # Display selected actions
        selected_actions = action_selection.get("selected_actions", [])
        if selected_actions:
            self.add_text(f"**Selected Actions** ({len(selected_actions)} actions for insight acquisition):")
            
            for action in selected_actions:
                necessity = action.get("necessity", "unknown")
                action_id = action.get("action_id", "unknown")
                contribution = action.get("contribution_to_goal", "")
                
                # Use icons to indicate necessity
                necessity_icon = "🔴" if necessity == 'essential' else "🟡" if necessity == 'helpful' else "🟢"
                if necessity == 'error_fallback':
                    necessity_icon = "⚠️"
                
                display_text = f"{necessity_icon} **{action_id}**"
                if contribution:
                    display_text += f": {contribution}"
                
                self.add_text(display_text)
        
        # Display skipped actions if any
        skip_actions = action_selection.get("skip_actions", [])
        if skip_actions:
            self.add_text("**Skipped Actions** (not essential for your goal):")
            for skip_action in skip_actions:
                action_id = skip_action.get("action_id", "unknown")
                skip_reason = skip_action.get("skip_reason", "Not required for current objectives")
                self.add_text(f"⏭️ **{action_id}**: {skip_reason}")
        
        # Update the workflow with selected steps
        execution_order = action_selection.get("execution_order", [])
        return self.update_stage_steps(execution_order) \
            .add_variable("stage_action_selection", action_selection) \
            .add_variable("selected_actions", [action["action_id"] for action in selected_actions]) \
            .end_event()

async def generate_exploratory_data_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()