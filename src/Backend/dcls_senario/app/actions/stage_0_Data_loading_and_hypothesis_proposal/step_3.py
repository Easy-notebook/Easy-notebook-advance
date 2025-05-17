from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent
from app.models.StepTemplate import StepTemplate

async def generate_data_loading_and_hypothesis_proposal_step_3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
        
    # 初始化场景内agent（如果需要）
    problem_definition_agent = ProblemDefinitionAndDataCollectionAgent(llm=llm)
    
    step_template = StepTemplate(step, state)
    
    
    # 分支1：待办事项为空
    if step_template.event("start"):
        
        step_template.add_text("### Step 2: Analysis of the observation unit") \
                    .add_text("I need to analyze the data variables") \
                    .next_thinking_event(event_tag="unit_check_thinking",
                                    textArray=["Problem Definition Agent is thinking...","analyzing the data variables..."], 
                                    agentName="Problem Definition Agent", 
                                    customText="") \
                    
        return step_template.end_event()
    
    
    if step_template.think_event("unit_check_thinking"):
        variables = step_template.get_variable("variables")
        preview = step_template.get_variable("preview")
        problem_description = step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")

        unit_check = problem_definition_agent.detect_observation_unit_cli(
            variables=variables,
            preview=preview,
            problem_description=problem_description,
            context_description=context_description
        )

        step_template.add_text("Based on the variable analysis, we have the following information:") \
                    .add_variable("unit_check",unit_check) \
                    .add_text(unit_check) \
                    
        return step_template.end_event()
    
    return None
    