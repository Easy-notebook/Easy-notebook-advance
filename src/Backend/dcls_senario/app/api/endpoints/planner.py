import logging
from fastapi import APIRouter, HTTPException

from app.models.planner import (
    SequenceRequest, 
    FeedbackRequest, 
    SequenceResponse, 
    FeedbackResponse, 
    GenerateRequest,
    GenerateResponse,
)
from app.utils.helpers import get_stage_or_abort, validate_step_index, create_streaming_response
from app.actions import get_sequence_generator
from app.actions import general_response

logger = logging.getLogger("app")
router = APIRouter()

@router.post("/actions", response_model=SequenceResponse)
async def planner_sequence(request: SequenceRequest):
    stage = get_stage_or_abort(request.stage_id)
    step = validate_step_index(stage, request.step_index)
    
    sequence = await get_sequence_generator(
        request.stage_id, 
        request.step_index, 
        request.state,
        lang=request.lang
    )
    
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence for step {request.step_index} not found")
    
    next_step = request.step_index + 1 if request.step_index + 1 < len(stage["steps"]) else None
    
    sequence["stage_id"] = request.stage_id
    sequence["step"] = step
    sequence["next_step"] = next_step
    
    if 1:
        return create_streaming_response(sequence)
    else:
        return {
            "stage_id": request.stage_id,
            "step": step,
            "sequence": sequence,
            "next_step": next_step
        }

@router.post("/reflection", response_model=FeedbackResponse)
async def planner_feedback(request: FeedbackRequest):
    target_achieved = False
    if request.state:
        toDoList = request.state.get("toDoList", [])
        if toDoList == []:
            target_achieved = True

    return {
        "status": "received", 
        "message": "Feedback processed", 
        "targetAchieved": target_achieved,
        "state": request.state
    }

@router.post("/generate", response_model=GenerateResponse)
async def generate_response(request: GenerateRequest):
    return await general_response(request.issue, request.context, request.lang)