from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.BaseAction import BaseAction, event, thinking, finnish

class WorkflowInitialization(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_4_methodology_strategy_formulation",
            section_id="section_1_workflow_initialization",
            name="Methodology Strategy Workflow Initialization",
            ability="Initialize methodology strategy formulation workflow using intelligent action selection",
            require_variables=["problem_description", "comprehensive_eda_summary"]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("**Chapter Goal**: Formulate comprehensive methodology and strategy based on data insights") \
            .add_text("Developing optimal feature engineering approaches and machine learning strategies") \
            .next_thinking_event(
                event_tag="select_stage_actions",
                textArray=[
                    "PCS Agent analyzing methodology requirements...", 
                    "Evaluating feature engineering strategies...", 
                    "Selecting optimal modeling approaches for your goal..."
                ],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("select_stage_actions")
    def select_stage_actions(self):
        try:
            # Get user goal and current state for intelligent action selection
            user_goal = self.input.get("user_goal", "Develop optimal machine learning methodology")
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", "")
            
            # Define current data state (after insight acquisition)
            current_data_state = "Data insights have been acquired, ready for methodology strategy formulation"
            
            # Get available sections for this stage
            available_sections = self.available_actions if isinstance(self.available_actions, list) else [
                "section_1_workflow_initialization",
                "section_2_feature_and_model_method_proposal", 
                "section_3_training_evaluation_strategy_development",
                "section_4_methodology_strategy_consolidation"
            ]
            
            # Use PCS Agent to intelligently select necessary actions
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Define stage goal for Methodology Strategy Formulation
            stage_goal = "Formulate comprehensive methodology strategy including feature engineering approaches and machine learning model selection based on data insights"
            
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
                    "section_2_feature_and_model_method_proposal",
                    "section_3_training_evaluation_strategy_development"
                ]
                
                action_selection = {
                    "execution_order": essential_sections,
                    "stage_execution_plan": f"Executing essential methodology sections: {', '.join(essential_sections)}",
                    "goal_relevance": "Using fallback strategy for comprehensive methodology strategy formulation",
                    "selected_actions": [{"action_id": s, "necessity": "essential", "contribution_to_goal": "Core methodology functionality"} for s in essential_sections],
                    "skip_actions": []
                }
                
            return self.conclusion("action_selection", action_selection)
        except Exception as e:
            # Error fallback with minimal essential sections
            error_sections = ["section_1_workflow_initialization", "section_2_feature_and_model_method_proposal"]
            
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
            self.add_text(f"**Selected Actions** ({len(selected_actions)} actions for methodology formulation):")
            
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

async def generate_method_proposal_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()
    