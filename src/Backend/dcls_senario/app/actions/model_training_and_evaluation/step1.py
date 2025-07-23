from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.StepTemplate import StepTemplate

async def model_training_and_evaluation_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        step_template.add_text("### Step 1: Feature Engineering Methods Suggestion") \
                    .add_text("I will analyze the dataset characteristics and suggest appropriate feature engineering techniques to improve model performance.") \
                    .next_thinking_event(event_tag="suggest_feature_engineering",
                                        textArray=["Prediction Agent is analyzing...","Suggesting feature engineering methods..."])

        return step_template.end_event()
    
    problem_description = step_template.get_variable("problem_description")
    context_description = step_template.get_variable("context_description")
    eda_summary = step_template.get_variable("eda_summary")
    csv_file_path = step_template.get_variable("csv_file_path")
    response_variable_analysis = step_template.get_variable("response_variable_analysis")
    # 获取Stage 3的输出 (从stage_3_method_proposal生成的特征工程方法)
    stage3_feature_methods = step_template.get_variable("feature_engineering_methods")
    
    prediction_agent = PredictionAndInferenceAgent(
        problem_description=problem_description,
        context_description=context_description,
        eda_summary=eda_summary,
        llm=llm
    )
    
    if step_template.think_event("suggest_feature_engineering"):
        
        # 直接使用Stage 3生成的特征工程方法，不重新生成
        feature_engineering_table = step_template.to_tableh(stage3_feature_methods)
        
        step_template \
            .add_variable("feature_engineering_methods", stage3_feature_methods) \
            .add_text("## Feature Engineering Methods from Stage 3") \
            .add_text("Using the feature engineering methods recommended in Stage 3 Method Proposal:") \
            .add_text(feature_engineering_table) \
            .add_text("✅ Ready to proceed with model training using these feature engineering approaches.")
        
        return step_template.end_event()
            
    return None