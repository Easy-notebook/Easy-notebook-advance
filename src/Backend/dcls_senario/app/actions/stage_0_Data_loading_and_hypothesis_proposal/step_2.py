from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent

# 假设StepTemplate在对应的模块中已定义并导入
from app.models.StepTemplate import StepTemplate

async def generate_data_loading_and_hypothesis_proposal_step_2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state)
    # 初始化场景内agent（如果需要）
    problem_definition_agent = ProblemDefinitionAndDataCollectionAgent(llm=llm)    
    
    # 分支1：初始化
    if step_template.event("start"):
        
        step_template \
            .add_text("### Step 1: Variable Describe") \
            .add_text("I need to analyze the data variables") \
            .next_thinking_event(event_tag="thinking_1",
                            textArray=["Problem Definition Agent is thinking...","analyzing the data variables..."], 
                            agentName="Problem Definition Agent", 
                            customText="") \
            
        return step_template.end_event()
    
    if step_template.think_event("thinking_1"):
        preview = step_template.get_current_effect()
        variables = step_template.get_variable("variables")
        problem_description =step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")

        var_analysis_response = problem_definition_agent.analyze_variables_cli(variables,preview,problem_description,context_description)        
        
        step_template \
            .add_text("according my thinking, i get following data description:") \
            .add_variable("variables", var_analysis_response) \
            .add_variable("preview", preview) \
            .add_text(var_analysis_response) \
            .add_variable("variables", var_analysis_response) \
            .add_text("Next Step, I will do variable relevance evaluation") \
            
        return step_template.end_event()
        
    
    return None
    