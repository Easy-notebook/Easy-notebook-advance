from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.StepTemplate import StepTemplate

async def model_training_and_evaluation_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        step_template.add_text("### Step 0: Response Variable Identification") \
                    .add_text("I will analyze the dataset structure and problem context to identify the target variable for prediction.") \
                    .next_thinking_event(event_tag="identify_response_variable",
                                        textArray=["Prediction Agent is analyzing...","Identifying response variable..."])

        return step_template.end_event()
    
    problem_description = step_template.get_variable("problem_description")
    context_description = step_template.get_variable("context_description")
    eda_summary = step_template.get_variable("eda_summary")
    csv_file_path = step_template.get_variable("csv_file_path")
    
    prediction_agent = PredictionAndInferenceAgent(
        problem_description=problem_description,
        context_description=context_description,
        eda_summary=eda_summary,
        llm=llm
    )
    
    if step_template.think_event("identify_response_variable"):
        
        response_variable_analysis = prediction_agent.identify_response_variable_cli(csv_file_path)
        
        response_variable_table = step_template.to_tableh(response_variable_analysis)
        
        step_template \
            .add_variable("response_variable_analysis", response_variable_analysis) \
            .add_text("## Response Variable Identification Analysis") \
            .add_text("Based on the problem description, context, and dataset structure, here is the analysis:") \
            .add_text(response_variable_table) \
            .add_text("✅ Response variable identification completed successfully.")
        
        return step_template.end_event()
            
    return None