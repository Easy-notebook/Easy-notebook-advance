from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate
from app.core.config import llm, PCSAgent
from app.core.workflow_manager import WorkflowManager

async def generate_data_loading_and_hypothesis_proposal_step_0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):     
        # Get workflow analysis and user goal
        workflow_analysis = state.get("workflow_analysis", {})
        user_goal = state.get("user_goal", "Data analysis")
        problem_description = state.get("problem_description", "")
        context_description = state.get("context_description", "")
        
        chapter_id = "chapter_1_data_existence_establishment"
        chapter_config = WorkflowManager.AVAILABLE_CHAPTERS[chapter_id]
        chapter_name = chapter_config["name"]
        
        step_template.new_chapter(chapter_name) \
                    .add_text(f"**Chapter Goal**: {chapter_config['description']}") \
                    .add_text("I will now analyze which specific actions are needed for this stage based on your requirements.") \
                    .next_thinking_event(event_tag="select_stage_actions",
                                        textArray=["PCS Agent analyzing stage requirements...", 
                                                 "Applying existence first principles...", 
                                                 "Selecting optimal actions for your goal..."])

        return step_template.end_event()
    
    if step_template.event("select_stage_actions"):
        # Call PCS Agent to select actions for this stage
        workflow_analysis = state.get("workflow_analysis", {})
        user_goal = state.get("user_goal", "Data analysis")
        problem_description = state.get("problem_description", "")
        context_description = state.get("context_description", "")
        
        chapter_id = "chapter_1_data_existence_establishment"
        chapter_config = WorkflowManager.AVAILABLE_CHAPTERS[chapter_id]
        available_actions = chapter_config["sections"]
        
        # Get stage info from workflow analysis
        stage_dependencies = workflow_analysis.get("stage_dependencies", {})
        stage_info = stage_dependencies.get("Data Existence Establishment", {})
        
        stage_name = chapter_config["name"]
        stage_goal = chapter_config["description"]
        required_states = stage_info.get("provides", ["Variable definitions", "Data structure understanding", "PCS hypothesis"])
        current_data_state = "Raw data available, structure unknown"
        
        # Create PCS Agent and select actions
        pcs_agent = PCSAgent(problem_description=problem_description, context_description=context_description, llm=llm)
        action_selection = pcs_agent.select_stage_actions_cli(
            stage_name=stage_name,
            stage_goal=stage_goal, 
            required_states=required_states,
            available_actions=available_actions,
            current_data_state=current_data_state,
            user_goal=user_goal
        )
        
        # Display selection results
        selected_actions = action_selection.get("selected_actions", [])
        skip_actions = action_selection.get("skip_actions", [])
        execution_plan = action_selection.get("stage_execution_plan", "")
        goal_relevance = action_selection.get("goal_relevance_analysis", "")
        
        step_template.add_text(f"**Stage Analysis**: {goal_relevance}") \
                    .add_text(f"**Execution Plan**: {execution_plan}") \
                    .add_text(f"**Selected Actions** ({len(selected_actions)} out of {len(available_actions)} available):")
        
        for action in selected_actions:
            necessity_icon = "🔴" if action.get('necessity') == 'essential' else "🟡" if action.get('necessity') == 'helpful' else "🟢"
            step_template.add_text(f"{necessity_icon} **{action['action_id']}**: {action['contribution_to_goal']}")
            
        if skip_actions:
            step_template.add_text("**Skipped Actions** (not essential for your goal):")
            for action in skip_actions:
                step_template.add_text(f"⏭️ **{action['action_id']}**: {action['skip_reason']}")
        
        step_template.add_variable("stage_action_selection", action_selection) \
                    .add_variable("selected_actions", [action['action_id'] for action in selected_actions]) \
                    .add_variable("execution_order", action_selection.get("execution_order", []))

        return step_template.end_event()
    
    return None
    