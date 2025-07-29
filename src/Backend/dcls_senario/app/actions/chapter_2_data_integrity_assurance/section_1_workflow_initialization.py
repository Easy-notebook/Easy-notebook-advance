from typing import Dict, Any, Optional
from app.core.workflow_initialization_template import create_workflow_initialization

async def generate_data_cleaning_sequence_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    return await create_workflow_initialization(
        step=step,
        state=state, 
        stream=stream,
        chapter_id="chapter_2_data_integrity_assurance"
    )
    