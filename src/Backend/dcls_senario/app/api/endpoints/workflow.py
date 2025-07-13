"""
FastAPI workflow endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
import logging

from app.core.config import STAGES

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/template")
async def get_workflow_template(
    type: Optional[str] = Query("data_analysis", description="Template type")
) -> Dict[str, Any]:
    """
    获取工作流模板配置
    
    GET /api/workflow/template?type=<template_type>
    """
    try:
        # Convert STAGES config to template format
        template = {
            "id": "dcls_data_analysis_workflow",
            "name": "DCLS Data Analysis Workflow", 
            "description": "Complete data science lifecycle workflow",
            "version": "1.0",
            "stages": []
        }
        
        # Convert each stage to template format
        for stage_id, stage_config in STAGES.items():
            stage_template = {
                "id": stage_id,
                "name": stage_config["title"],
                "description": stage_config["description"],
                "steps": []
            }
            
            # Convert steps
            for step in stage_config["steps"]:
                step_template = {
                    "id": step["id"],
                    "name": step["title"],
                    "description": step.get("description", ""),
                    "step_id": step["stepId"]
                }
                stage_template["steps"].append(step_template)
            
            template["stages"].append(stage_template)
        
        return {
            "status": "success",
            "template": template,
            "template_type": type
        }
        
    except Exception as e:
        logger.error(f"Error getting workflow template: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow template: {str(e)}"
        )

@router.post("/validate_step")
async def validate_step_completion(
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """
    验证步骤完成度
    """
    try:
        stage_id = request.get("stage_id")
        step_id = request.get("step_id")
        step_results = request.get("step_results", {})
        
        # Simple validation logic - assume step is completed if it has results
        step_completed = bool(step_results)
        
        # Get stage config to check if this is the last step
        from app.core.config import STAGES
        stage_config = STAGES.get(stage_id)
        if not stage_config:
            return {"step_completed": step_completed, "stage_completed": False}
            
        steps = stage_config.get("steps", [])
        current_step_index = next((i for i, step in enumerate(steps) if step["id"] == step_id), -1)
        
        # Stage is completed if this is the last step and it's completed
        stage_completed = step_completed and (current_step_index == len(steps) - 1)
        
        return {
            "step_completed": step_completed,
            "stage_completed": stage_completed,
            "confidence": 1.0 if step_completed else 0.0,
            "message": "Step validation completed" if step_completed else "Step needs completion"
        }
        
    except Exception as e:
        logger.error(f"Error validating step completion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate step completion: {str(e)}"
        )

@router.post("/stage_transition")
async def get_stage_transition_suggestion(
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """
    获取阶段转换建议
    """
    try:
        current_stage = request.get("current_stage")
        completed_steps = request.get("completed_steps", [])
        stage_results = request.get("stage_results", {})
        
        # Get all stages from config
        from app.core.config import STAGES
        stage_ids = list(STAGES.keys())
        
        # Find current stage index
        try:
            current_stage_index = stage_ids.index(current_stage)
        except ValueError:
            return {
                "should_proceed": False,
                "next_stage": None,
                "message": f"Unknown current stage: {current_stage}"
            }
        
        # Check if there's a next stage
        next_stage_index = current_stage_index + 1
        if next_stage_index < len(stage_ids):
            next_stage_id = stage_ids[next_stage_index]
            next_stage_config = STAGES[next_stage_id]
            
            return {
                "should_proceed": True,
                "next_stage": next_stage_id,
                "next_stage_name": next_stage_config["title"],
                "message": f"Ready to proceed to {next_stage_config['title']}",
                "confidence": 0.9
            }
        else:
            return {
                "should_proceed": False,
                "next_stage": None,
                "message": "All stages completed",
                "workflow_completed": True
            }
        
    except Exception as e:
        logger.error(f"Error getting stage transition suggestion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stage transition suggestion: {str(e)}"
        )