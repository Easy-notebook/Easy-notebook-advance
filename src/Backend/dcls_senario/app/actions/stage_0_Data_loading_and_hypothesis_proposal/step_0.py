from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_data_loading_and_hypothesis_proposal_step_0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state, lang)
    
    if lang == "zh":
        if step_template.event("start"):     
            problem_name = step_template.get_variable("problem_name")
            step_template \
                .update_title(f"{problem_name}: 数据科学分析") \
                .add_text("## 阶段1: 数据加载和预处理") \
                .add_text("在这一阶段，我们将加载数据并进行一些预处理") 

            return step_template.end_event()
    else:        
        if step_template.event("start"):     
            problem_name = step_template.get_variable("problem_name")
            step_template \
                .update_title(f"{problem_name}: Data Science Analysis") \
                .add_text("## Stage 1: Data Loading and Preprocessing") \
                .add_text("on this stage, we will load the data and do some preprocessing") 

            return step_template.end_event()
    
    return None