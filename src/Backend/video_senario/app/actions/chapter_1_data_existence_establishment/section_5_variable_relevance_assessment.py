from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent
from app.models.Action import Action

async def generate_data_loading_and_hypothesis_proposal_step_4(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    problem_definition_agent = ProblemDefinitionAndDataCollectionAgent(llm=llm)
    
    step_template = Action(step, state)
    
    
    if step_template.event("start"):
        step_template.new_section("Variable Relevance Analysis") \
                    .add_text("I need to analyze the data variables") \
                    .next_thinking_event(event_tag="relative_analysis_thinking",
                                    textArray=["Problem Definition Agent is thinking...","analyzing the data variables..."], 
                                    agentName="Problem Definition Agent", 
                                    customText="") \
                    
        return step_template.end_event()
    
    if step_template.think_event("relative_analysis_thinking"):
        variables = step_template.get_variable("variables")
        preview = step_template.get_variable("preview")
        problem_description = step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")

        relative_analysis = problem_definition_agent.evaluate_variable_relevance_cli(
            variables=variables,
            preview=preview,
            problem_description=problem_description,
            context_description=context_description
        )

        step_template.add_text("Based on the variable analysis, we have the following information:") \
                    .add_variable("relative_analysis",relative_analysis) \
                    .add_text(relative_analysis) \
        
        return step_template.end_event()
    
    return None
    