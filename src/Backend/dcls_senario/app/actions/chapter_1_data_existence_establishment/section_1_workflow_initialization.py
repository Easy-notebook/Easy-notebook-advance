from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.BaseAction import BaseAction, event, thinking, finnish

class WorkflowInitialization(BaseAction):
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
            .next_thinking_event(event_tag="select_stage_actions",
                                textArray=["PCS Agent analyzing stage requirements...", 
                                            "Applying existence first principles...", 
                                            "Selecting optimal actions for your goal..."])\
            .end_event()
    
    @thinking("select_stage_actions")
    def select_stage_actions(self):
        # available_actions是一个list，包含所有可用的sections
        available_sections = self.available_actions if isinstance(self.available_actions, list) else []
        
        # 构造标准的action_selection格式
        action_selection = {
            "execution_order": available_sections,
            "stage_execution_plan": f"将执行以下sections: {', '.join(available_sections)}"
        }
        return self.conclusion("action_selection", action_selection)\
            .end_event()


    @finnish("action_selection")
    def action_selection(self):
        action_selection = self.get_thinking("action_selection")
        return self.update_stage_steps(action_selection["execution_order"]) \
            .add_text(action_selection["stage_execution_plan"]) \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()