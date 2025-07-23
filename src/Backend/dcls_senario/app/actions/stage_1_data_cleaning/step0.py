from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_data_cleaning_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state, lang)
    
    if lang == "zh":
        if step_template.event("start"):
            
            step_template.add_text("## 阶段2: 数据清洗") \
                        .add_text("在这一阶段, 我们将进行`维度分析`, `无效值分析`, `缺失值分析`, `数据完整性分析`") \
        
            return step_template.end_event()
    else:
        if step_template.event("start"):
            
            step_template.add_text("## Stage 2: Data Cleaning") \
                        .add_text("In this stage, we will do `Dimension Analysis`, `Invalid Value Analysis`, `Missing Value Analysis`, `Data Integrity Analysis`") \
                        
            return step_template.end_event()
    
    return None