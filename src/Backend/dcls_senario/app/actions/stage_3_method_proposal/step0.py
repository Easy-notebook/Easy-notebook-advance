from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_method_proposal_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state, lang)
    
    if lang == "zh":
        if step_template.event("start"):
            
            step_template.add_text("## 阶段4: 方法和模型提案") \
                        .add_text("这一步是提出各种特征工程方法和模型选择。") \
                        .add_text("我们将提出3种特征工程方法和3种模型, 然后根据EDA结果选择最好的一个。")
                        
            return step_template.end_event()
    else:
        
        if step_template.event("start"):
            
            step_template.add_text("## Stage 4: Method and Model Proposal") \
                        .add_text("This stage is to propose various feature engineering methods and models selections.") \
                        .add_text("We will propose 3 feature engineering methods and 3 models, and then select the best one based on the EDA results.")
                        
            return step_template.end_event()
    
    return None
    