from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_exploratory_data_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state, lang)
    
    if lang == "zh":
        
        if step_template.event("start"):
            
            step_template.add_text("## 阶段3: 探索性数据分析") \
                        .add_text("为了更好地理解数据, 我们需要进行一些探索性数据分析。") \
                        
            return step_template.end_event()
        
    else:
        if step_template.event("start"):
            
            step_template.add_text("## Stage 3: Exploratory Data Analysis") \
                        .add_text("In order to better understand the data, we need to do some exploratory data analysis.") \
                        
            return step_template.end_event()
    
    return None
    