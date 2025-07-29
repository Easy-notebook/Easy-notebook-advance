from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.StepTemplate import StepTemplate

async def generate_data_loading_and_hypothesis_proposal_step_5(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    # 初始化场景内agent（如果需要）
    step_template = StepTemplate(step, state)
    problem_description = step_template.get_variable("problem_description")
    context_description = step_template.get_variable("context_description")
    
    pcs_agent = PCSAgent(llm=llm, problem_description=problem_description, context_description=context_description)
    
    # 分支1：待办事项为空
    if step_template.event("start"):
        
        step_template.new_section("Hypothesis Propose") \
                    .add_text("I need to propose a pcs hypothesis") \
                    .next_thinking_event(event_tag="pcs_hypothesis_thinking",
                                    textArray=["Problem Definition Agent is thinking...","proposing a pcs hypothesis..."], 
                                    agentName="Problem Definition Agent", 
                                    customText="") \
                    
        return step_template.end_event()
    
    if step_template.think_event("pcs_hypothesis_thinking"):
        
        variables = step_template.get_variable("variables")
        problem_description = step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")
        unit_check = step_template.get_variable("unit_check")
        relative_analysis = step_template.get_variable("relative_analysis")

        pcs_hypothesis = pcs_agent.evaluate_problem_definition_cli(problem_description, context_description, variables, unit_check, relative_analysis)
        
        markdown_str = ""
        markdown_str = step_template.to_tableh(pcs_hypothesis)

        step_template.add_text("I propose the following pcs hypothesis:") \
                    .add_variable("pcs_hypothesis",pcs_hypothesis) \
                    .add_text(markdown_str) \
                    .add_text("okay, we finished the data loading and hypothesis proposal, let's do the data cleaning.")
                    
        return step_template.end_event()
    
    return None
    