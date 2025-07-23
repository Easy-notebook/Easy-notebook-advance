from fastapi import HTTPException
from typing import Dict, Any, Optional

from app.utils.helpers import get_stage_or_abort, validate_step_index

async def get_sequence_generator(stage_id: str, step_index: int, state: Optional[Dict[str, Any]] = None, lang: str = "en") -> Dict[str, Any]:
    """
    根据阶段ID和步骤索引获取相应的序列生成器
    
    Args:
        stage_id: 阶段ID
        step_index: 步骤索引
        state: 上下文信息
        lang: 语言
        
    Returns:
        包含序列信息的字典，steps可能是列表或异步迭代器
    """
    stage = get_stage_or_abort(stage_id)
    step = validate_step_index(stage, step_index)
    
    print(f"!get_sequence_generator!lang: {lang}")
    
    if stage_id == "data-cleaning":
        return await generate_data_cleaning_sequence(step_index, step, state, lang)
    
    if stage_id == "data-loading-and-hypothesis-proposal":
        return await generate_data_loading_and_hypothesis_proposal_sequence(step_index, step, state, lang)
    
    if stage_id == "exploratory-data-analysis":
        return await generate_exploratory_data_sequence(step_index, step, state, lang)
    
    if stage_id == "model-proposal":
        return await generate_model_proposal_sequence(step_index, step, state, lang)
    
    raise HTTPException(status_code=404, detail=f"No sequence generator implemented for stage {stage_id}")


from app.actions.general.choicemaps import generate_question_choice_map
async def general_response(issue: str, context: Any, lang: str = "en"):
    if issue == "generate_question_choice_map":
        return {"status": "success", "message": await generate_question_choice_map(context, lang)}
    else:
        return {"status": "error", "message": "Invalid issue"}


from app.actions.stage_1_data_cleaning.step0 import generate_data_cleaning_sequence_step0
from app.actions.stage_1_data_cleaning.step1 import generate_data_cleaning_sequence_step1
from app.actions.stage_1_data_cleaning.step2 import generate_data_cleaning_sequence_step2
from app.actions.stage_1_data_cleaning.step3 import generate_data_cleaning_sequence_step3
from app.actions.stage_1_data_cleaning.step4 import generate_data_cleaning_sequence_step4

async def generate_data_cleaning_sequence(step_index: int, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, lang: str = "en") -> Dict[str, Any]:
    sequence_generators = {
        0: generate_data_cleaning_sequence_step0,
        1: generate_data_cleaning_sequence_step1,
        2: generate_data_cleaning_sequence_step2,
        3: generate_data_cleaning_sequence_step3,
        4: generate_data_cleaning_sequence_step4,
    }
    generator = sequence_generators.get(step_index)
    
    if generator:
        return await generator(step, state, lang)
    
    raise HTTPException(status_code=404, detail=f"No sequence defined for step index {step_index}") 


from app.actions.stage_0_Data_loading_and_hypothesis_proposal import generate_data_loading_and_hypothesis_proposal_step_0
from app.actions.stage_0_Data_loading_and_hypothesis_proposal import generate_data_loading_and_hypothesis_proposal_step_1
from app.actions.stage_0_Data_loading_and_hypothesis_proposal import generate_data_loading_and_hypothesis_proposal_step_2
from app.actions.stage_0_Data_loading_and_hypothesis_proposal import generate_data_loading_and_hypothesis_proposal_step_3
from app.actions.stage_0_Data_loading_and_hypothesis_proposal import generate_data_loading_and_hypothesis_proposal_step_4
from app.actions.stage_0_Data_loading_and_hypothesis_proposal import generate_data_loading_and_hypothesis_proposal_step_5

async def generate_data_loading_and_hypothesis_proposal_sequence(step_index: int, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, lang: str = "en") -> Dict[str, Any]:
    sequence_generators = {
        0: generate_data_loading_and_hypothesis_proposal_step_0,
        1: generate_data_loading_and_hypothesis_proposal_step_1,
        2: generate_data_loading_and_hypothesis_proposal_step_2,
        3: generate_data_loading_and_hypothesis_proposal_step_3,
        4: generate_data_loading_and_hypothesis_proposal_step_4,
        5: generate_data_loading_and_hypothesis_proposal_step_5,
    }
    generator = sequence_generators.get(step_index)
    
    if generator:
        return await generator(step, state, lang)
    
    raise HTTPException(status_code=404, detail=f"No sequence defined for step index {step_index}") 


from app.actions.stage_2_exploratory_data_analysis.step0 import generate_exploratory_data_sequence_step0
from app.actions.stage_2_exploratory_data_analysis.step1 import generate_exploratory_data_sequence_step1
from app.actions.stage_2_exploratory_data_analysis.step2 import generate_exploratory_data_sequence_step2
from app.actions.stage_2_exploratory_data_analysis.step3 import generate_exploratory_data_sequence_step3


async def generate_exploratory_data_sequence(step_index: int, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, lang: str = "en") -> Dict[str, Any]:
    sequence_generators = {
        0: generate_exploratory_data_sequence_step0,    
        1: generate_exploratory_data_sequence_step1,
        2: generate_exploratory_data_sequence_step2,
        3: generate_exploratory_data_sequence_step3,
    }
    generator = sequence_generators.get(step_index) 
    
    if generator:
        return await generator(step, state, lang)
    
    raise HTTPException(status_code=404, detail=f"No sequence defined for step index {step_index}") 


from app.actions.stage_3_method_proposal.step0 import generate_method_proposal_sequence_step0
from app.actions.stage_3_method_proposal.step1 import generate_method_proposal_sequence_step1



async def generate_model_proposal_sequence(step_index: int, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, lang: str = "en") -> Dict[str, Any]:
    sequence_generators = {
        0: generate_method_proposal_sequence_step0,
        1: generate_method_proposal_sequence_step1,
    }
    generator = sequence_generators.get(step_index)
    
    if generator:
        return await generator(step, state, lang)
    
    raise HTTPException(status_code=404, detail=f"No sequence defined for step index {step_index}") 
