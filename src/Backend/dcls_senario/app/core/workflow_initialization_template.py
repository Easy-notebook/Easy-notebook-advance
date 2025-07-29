from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate
from app.core.config import llm, PCSAgent
from app.core.workflow_manager import WorkflowManager

async def create_workflow_initialization(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False,
    chapter_id: str = ""
) -> Dict[str, Any]:
    """
    通用的workflow initialization函数
    为任何章节生成PCS Agent驱动的action选择
    """
    state = state or {}
        
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):     
        # Get workflow analysis and user goal
        workflow_analysis = state.get("workflow_analysis", {})
        user_goal = state.get("user_goal", "Data analysis")
        problem_description = state.get("problem_description", "")
        context_description = state.get("context_description", "")
        
        chapter_config = WorkflowManager.AVAILABLE_CHAPTERS.get(chapter_id, {})
        chapter_name = chapter_config.get("name", chapter_id)
        
        step_template.new_chapter(chapter_name) \
                    .add_text(f"**Chapter Goal**: {chapter_config.get('description', 'Processing data')}") \
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
        
        chapter_config = WorkflowManager.AVAILABLE_CHAPTERS.get(chapter_id, {})
        available_actions = chapter_config.get("sections", [])
        
        # Map chapter_id to stage name for workflow analysis lookup
        chapter_to_stage_mapping = {
            "chapter_1_data_existence_establishment": "Data Existence Establishment",
            "chapter_2_data_integrity_assurance": "Data Integrity Assurance",
            "chapter_3_data_insight_acquisition": "Data Insight Acquisition",
            "chapter_4_methodology_strategy_formulation": "Methodology Strategy Formulation",
            "chapter_5_model_implementation_execution": "Model Implementation Execution",
            "chapter_6_stability_validation": "Stability Validation",
            "chapter_7_results_evaluation_confirmation": "Results Evaluation Confirmation"
        }
        
        stage_name_for_analysis = chapter_to_stage_mapping.get(chapter_id, chapter_config.get("name", ""))
        
        # Get stage info from workflow analysis
        stage_dependencies = workflow_analysis.get("stage_dependencies", {})
        stage_info = stage_dependencies.get(stage_name_for_analysis, {})
        
        stage_name = chapter_config.get("name", chapter_id)
        stage_goal = chapter_config.get("description", "Processing data")
        required_states = stage_info.get("provides", ["Data processing", "Analysis results"])
        current_data_state = "Previous stage completed, ready for processing"
        
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