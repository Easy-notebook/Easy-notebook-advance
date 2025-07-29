from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_exploratory_data_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        
        step_template.new_chapter("Exploratory Data Analysis") \
                    .add_text("In order to better understand the data, we need to do some exploratory data analysis.") \
                    
        return step_template.end_event()
    
    return None
    