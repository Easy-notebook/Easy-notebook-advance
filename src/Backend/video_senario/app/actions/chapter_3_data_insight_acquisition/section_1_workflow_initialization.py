from typing import Dict, Any, Optional
from app.core.workflow_initialization_template import create_workflow_initialization

async def generate_exploratory_data_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    return await create_workflow_initialization(
        step=step,
        state=state, 
        stream=stream,
        chapter_id="chapter_3_data_insight_acquisition"
    )
    