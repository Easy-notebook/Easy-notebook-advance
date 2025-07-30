"""
FastAPI workflow endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional

from app.core.workflow_manager import WorkflowManager
from app.utils.logger import ModernLogger

router = APIRouter()
logger = ModernLogger("workflow", level="info")

@router.get("/template")
async def get_workflow_template(
    type: Optional[str] = Query("data_analysis", description="Template type")
) -> Dict[str, Any]:
    """
    获取工作流模板配置
    
    GET /api/workflow/template?type=<template_type>
    """
    try:
        # Convert WorkflowManager chapters to template format
        template = {
            "id": "vds_agents_workflow",
            "name": "VDS Agents Workflow", 
            "description": "Existence First Principle driven data science workflow",
            "version": "2.0",
            "chapters": []
        }
        
        # Convert each chapter to template format
        for chapter_id, chapter_config in WorkflowManager.AVAILABLE_CHAPTERS.items():
            chapter_template = {
                "id": chapter_id,
                "name": chapter_config["name"],
                "description": chapter_config["description"],
                "sections": []
            }
            
            # Convert sections
            for section_id in chapter_config["sections"]:
                section_template = {
                    "id": section_id,
                    "name": section_id.replace("_", " ").title(),
                    "description": f"Execute {section_id} workflow step"
                }
                chapter_template["sections"].append(section_template)
            
            template["chapters"].append(chapter_template)
        
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
        chapter_id = request.get("chapter_id")
        section_id = request.get("section_id")
        section_results = request.get("section_results", {})
        
        # Simple validation logic - assume section is completed if it has results
        section_completed = bool(section_results)
        
        # Get chapter config to check if this is the last section
        chapter_config = WorkflowManager.AVAILABLE_CHAPTERS.get(chapter_id)
        if not chapter_config:
            return {"section_completed": section_completed, "chapter_completed": False}
            
        sections = chapter_config.get("sections", [])
        current_section_index = sections.index(section_id) if section_id in sections else -1
        
        # Chapter is completed if this is the last section and it's completed
        chapter_completed = section_completed and (current_section_index == len(sections) - 1)
        
        return {
            "section_completed": section_completed,
            "chapter_completed": chapter_completed,
            "confidence": 1.0 if section_completed else 0.0,
            "message": "Section validation completed" if section_completed else "Section needs completion"
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
        current_chapter = request.get("current_chapter")
        completed_sections = request.get("completed_sections", [])
        chapter_results = request.get("chapter_results", {})
        
        # Get all chapters from WorkflowManager
        chapter_ids = list(WorkflowManager.AVAILABLE_CHAPTERS.keys())
        
        # Find current chapter index
        try:
            current_chapter_index = chapter_ids.index(current_chapter)
        except ValueError:
            return {
                "should_proceed": False,
                "next_chapter": None,
                "message": f"Unknown current chapter: {current_chapter}"
            }
        
        # Check if there's a next chapter
        next_chapter_index = current_chapter_index + 1
        if next_chapter_index < len(chapter_ids):
            next_chapter_id = chapter_ids[next_chapter_index]
            next_chapter_config = WorkflowManager.AVAILABLE_CHAPTERS[next_chapter_id]
            
            return {
                "should_proceed": True,
                "next_chapter": next_chapter_id,
                "next_chapter_name": next_chapter_config["name"],
                "message": f"Ready to proceed to {next_chapter_config['name']}",
                "confidence": 0.9
            }
        else:
            return {
                "should_proceed": False,
                "next_chapter": None,
                "message": "All chapters completed",
                "workflow_completed": True
            }
        
    except Exception as e:
        logger.error(f"Error getting stage transition suggestion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stage transition suggestion: {str(e)}"
        )