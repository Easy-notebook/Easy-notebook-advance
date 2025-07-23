from typing import Dict, Any, Optional
from DCLSAgents import PredictionAndInferenceAgent
from app.models.StepTemplate import StepTemplate

async def generate_method_proposal_sequence_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state, lang)
    
    if lang == "zh":
            
        if step_template.event("start"):
            step_template.add_text("### 步骤1 生成特征工程方法") \
                        .add_text("我将根据EDA结果生成3种特征工程方法。") \
                        .next_thinking_event(event_tag="generate_feature_engineering_methods",
                                            textArray=["特征工程代理正在思考...","生成特征工程方法..."])

            return step_template.end_event()
        
        
        problem_description = step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")
        eda_summary = step_template.get_variable("eda_summary")    
        
        prediction_agent = PredictionAndInferenceAgent(
            lang=lang,
            problem_description=problem_description,
            context_description=context_description,
            eda_summary=eda_summary,
        )
        
        if step_template.think_event("generate_feature_engineering_methods"):
            
            feature_engineering_methods = prediction_agent.suggest_feature_engineering_methods_cli()
            
            feature_engineering_methods_table = step_template.to_tableh(feature_engineering_methods)
            
            step_template \
                .add_variable("feature_engineering_methods",feature_engineering_methods) \
                .add_text("以下是我生成的特征工程方法:") \
                .add_text(feature_engineering_methods_table) \
                .next_thinking_event(event_tag="generate_model_methods",
                                    textArray=["模型选择代理正在思考...","生成模型方法..."])
            
            return step_template.end_event()
        
        if step_template.think_event("generate_model_methods"):
            
            model_methods = prediction_agent.suggest_model_methods_cli()
            
            model_methods_table = step_template.to_tableh(model_methods)
            
            step_template \
                .add_variable("model_methods",model_methods) \
                .add_text("以下是我生成的模型方法:") \
                .add_text(model_methods_table)
            
            return step_template.end_event()
        
        
    else:
        
        if step_template.event("start"):
            step_template.add_text("### Step 0: Generate Feature Engineering Methods") \
                        .add_text("I will generate 3 feature engineering methods based on the EDA results.") \
                        .next_thinking_event(event_tag="generate_feature_engineering_methods",
                                            textArray=["Feature Engineering Agent is thinking...","generating feature engineering methods..."])

            return step_template.end_event()
        
        
        problem_description = step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")
        eda_summary = step_template.get_variable("eda_summary")    
        
        prediction_agent = PredictionAndInferenceAgent(
            lang=lang,
            problem_description=problem_description,
            context_description=context_description,
            eda_summary=eda_summary,
        )
        
        if step_template.think_event("generate_feature_engineering_methods"):
            
            feature_engineering_methods = prediction_agent.suggest_feature_engineering_methods_cli()
            
            feature_engineering_methods_table = step_template.to_tableh(feature_engineering_methods)
            
            step_template \
                .add_variable("feature_engineering_methods",feature_engineering_methods) \
                .add_text("Here are the feature engineering methods I have generated:") \
                .add_text(feature_engineering_methods_table) \
                .next_thinking_event(event_tag="generate_model_methods",
                                    textArray=["Model Selection Agent is thinking...","generating model methods..."])
            
            return step_template.end_event()
        
        if step_template.think_event("generate_model_methods"):
            
            model_methods = prediction_agent.suggest_model_methods_cli()
            
            model_methods_table = step_template.to_tableh(model_methods)
            
            step_template \
                .add_variable("model_methods",model_methods) \
                .add_text("Here are the model methods I have generated:") \
                .add_text(model_methods_table)
            
            return step_template.end_event()
                
    return None
    