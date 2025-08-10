from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.Behavior import Behavior, event, thinking, finnish, after_exec

class WorkflowInitialization(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_1_data_existence_establishment",
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
            .add_text("Early deliverable of this stage: generate correlation and multicollinearity heatmaps, identify variables irrelevant to the goal, and remove them immediately.") \
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
        
        # Define stage goal for Data Existence Establishment
        stage_goal = (
            "Establish variable definitions and observation units; generate early deliverable: "
            "correlation/multicollinearity heatmaps and remove goal-irrelevant variables."
        )
        
        try:
            stage_analysis = pcs_agent.select_stage_actions_cli(
                stage_name=self.stage_name,
                stage_goal=stage_goal,
                available_actions=available_sections,
                current_data_state=current_data_state,
                user_goal=user_goal
            )
            # stage_analysis = {                                                                                                       
            #         "goal_relevance_analysis": "The Data Existence Establishment stage is crucial as it sets the",                                                                 
            #         "essential_for_user_goal": ["Variable definitions", "Observation units", "PCS hypothesis"],           
            #         "selected_actions": [                                                                                 
            #           {                                                                                                   
            #             "action_id": "section_1_workflow_initialization",                                                 
            #             "contribution_to_goal": "Helps in setting up the overall workflow which is necessary for a structured data science analysis.",                                                                     
            #             "necessity": "essential",                                                                         
            #             "provides_for_goal": "A starting point for the analysis process"                                  
            #           },                                                                                                  
            #           {                                                                                                   
            #             "action_id": "section_2_data_structure_discovery",                                                
            #             "contribution_to_goal": "Understanding the data structure is fundamental for further analysis, which is part of completing the data science analysis.",                                                
            #             "necessity": "essential",                                                                         
            #             "provides_for_goal": "Knowledge about how the data is organized"                                  
            #           },                                                                                                  
                                                                                                             
            #         ],                                                                                                    
            #         "execution_order": ["section_1_workflow_initialization", "section_2_data_structure_discovery"],                    
            #         "skip_actions": [],                                                                                   
            #         "stage_execution_plan": "In this stage I will perform section_1_workflow_initialization "                                                                                              
            #       }                 
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
        
        self.add_text(action_selection["stage_execution_plan"])
        
        # Update the workflow with selected steps
        return self.update_stage_steps(action_selection["execution_order"]) \
            .next_event("data_collection_strategy") \
            .end_event()
    
    @event("data_collection_strategy")
    def data_collection_strategy(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Data Collection Strategy Execution") \
            .add_text("Execute data collection strategy and verify data source reliability") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for basic data audit
eda_toolkit = EDAToolkit()
audit_report = eda_toolkit.basic_data_audit("{csv_file_path}")
''') \
            .exe_code_cli(
                event_tag="initial_data_audit",
                mark_finnish="Data collection strategy execution completed"
            ) \
            .end_event()
    
    @after_exec("initial_data_audit")
    def initial_data_audit(self):
        audit_result = self.get_current_effect()
        return self.add_variable("data_collection_report", audit_result) \
            .add_text("Data collection strategy validation completed, establishing data version control foundation") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()