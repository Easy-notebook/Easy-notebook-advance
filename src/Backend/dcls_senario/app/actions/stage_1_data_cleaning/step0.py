from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.StepTemplate import StepTemplate

async def generate_data_cleaning_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        
        step_template.new_chapter("Data Cleaning") \
                    .add_text("In this stage, we will do `Dimension Analysis`, `Invalid Value Analysis`, `Missing Value Analysis`, `Data Integrity Analysis`") \
        
        return step_template.end_event()
    
    return None
    