from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_method_proposal_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        
        step_template.add_text("## Stage 4: Method and Model Proposal") \
                    .add_text("This stage is to propose various feature engineering methods and models selections.") \
                    .add_text("We will propose 3 feature engineering methods and 3 models, and then select the best one based on the EDA results.")
                    
        return step_template.end_event()
    
    return None
    