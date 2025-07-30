"""
FastAPI workflow endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.core.workflow_manager import WorkflowManager
from app.actions.general.section_1_design_workflow import generate_workflow
from app.utils.logger import ModernLogger

router = APIRouter()
logger = ModernLogger("workflow", level="info")

class PlanningRequest(BaseModel):
    problem_name: str
    user_goal: str
    problem_description: str
    context_description: Optional[str] = None

@router.post("/planning")
async def generate_planning(request: PlanningRequest) -> Dict[str, Any]:
    """
    Generate customized workflow based on user goals using existence first principles
    
    POST /api/planning
    """
    try:
        # Prepare step data for workflow generation
        step_data = {
            "event": "start",
            "variables": {
                "problem_name": request.problem_name,
                "user_goal": request.user_goal,
                "problem_description": request.problem_description,
                "context_description": request.context_description or ""
            }
        }
        
        # Generate initial step response
        step_result = await generate_workflow(step_data)
        
        # Continue with workflow generation
        if step_result and step_result.get("event") == "generate_workflow":
            step_data["event"] = "generate_workflow"
            step_data["variables"].update(step_result.get("variables", {}))
            final_result = await generate_workflow(step_data)
            
            if final_result:
                dynamic_workflow = final_result.get("variables", {}).get("dynamic_workflow", {})
                workflow_analysis = final_result.get("variables", {}).get("workflow_analysis", {})
                
                # Convert selected chapters to frontend-compatible format
                selected_chapters = dynamic_workflow.get("selected_chapters", [])
                stages = []
                
                for chapter_id in selected_chapters:
                    if chapter_id in WorkflowManager.AVAILABLE_CHAPTERS:
                        chapter_config = WorkflowManager.AVAILABLE_CHAPTERS[chapter_id]
                        stage_template = {
                            "id": chapter_id,
                            "name": chapter_config["name"],
                            "description": chapter_config["description"],
                            "steps": []
                        }
                        
                        # 包含初始的sections作为steps，后续执行过程中可能会动态添加
                        for section_id in chapter_config["sections"]:
                            step_template = {
                                "id": section_id,
                                "step_id": section_id,
                                "name": section_id.replace("_", " ").title(),
                                "description": f"Execute {section_id} workflow step"
                            }
                            stage_template["steps"].append(step_template)
                        
                        stages.append(stage_template)
                
                # Build response with customized workflow
                planning_result = {
                    "id": "vds_agents_planning",
                    "name": f"{request.problem_name}: Customized Workflow",
                    "description": workflow_analysis.get("promise", "Customized data science workflow"),
                    "version": "2.0",
                    "stages": stages,
                    "analysis": workflow_analysis,
                    "execution_strategy": dynamic_workflow.get("execution_strategy", "sequential"),
                    "customization_reason": dynamic_workflow.get("customization_reason", "")
                }
                
                return {
                    "status": "success",
                    "planning": planning_result,
                    "workflow_analysis": workflow_analysis
                }
        
        # Fallback to basic planning if workflow generation fails
        return await get_fallback_planning()
        
    except Exception as e:
        logger.error(f"Error generating planning: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate planning: {str(e)}"
        )

async def get_fallback_planning() -> Dict[str, Any]:
    """Fallback planning when workflow generation fails"""
    # Use core chapters as fallback
    core_chapters = [
        "chapter_1_data_existence_establishment",
        "chapter_3_data_insight_acquisition", 
        "chapter_5_model_implementation_execution"
    ]
    
    stages = []
    for chapter_id in core_chapters:
        if chapter_id in WorkflowManager.AVAILABLE_CHAPTERS:
            chapter_config = WorkflowManager.AVAILABLE_CHAPTERS[chapter_id]
            stage_template = {
                "id": chapter_id,
                "name": chapter_config["name"],
                "description": chapter_config["description"],
                "steps": []
            }
            
            # 包含初始的sections作为steps，后续执行过程中可能会动态添加
            for section_id in chapter_config["sections"]:
                step_template = {
                    "id": section_id,
                    "step_id": section_id,
                    "name": section_id.replace("_", " ").title(),
                    "description": f"Execute {section_id} workflow step"
                }
                stage_template["steps"].append(step_template)
            
            stages.append(stage_template)
    
    planning = {
        "id": "vds_agents_fallback_planning",
        "name": "VDS Agents Fallback Workflow",
        "description": "Fallback data science workflow with core stages",
        "version": "2.0",
        "stages": stages,
        "analysis": {
            "promise": "Core data science workflow execution with essential stages",
            "minimal_workflow": ["Data Existence Establishment", "Data Insight Acquisition", "Model Implementation Execution"]
        },
        "execution_strategy": "sequential",
        "customization_reason": "Fallback workflow due to planning service unavailability"
    }
    
    return {
        "status": "success",
        "planning": planning,
        "workflow_analysis": planning["analysis"]
    }

@router.post("/validate_step")
async def validate_step_completion(
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """
    验证步骤完成度（适配前端stage_id/step_id参数）
    """
    try:
        # 适配前端参数格式
        stage_id = request.get("stage_id") or request.get("chapter_id")
        step_id = request.get("step_id") or request.get("section_id") 
        step_results = request.get("step_results", {}) or request.get("section_results", {})
        
        # Simple validation logic - assume step is completed if it has results
        step_completed = bool(step_results)
        
        # Get stage config to check if this is the last step
        stage_config = WorkflowManager.AVAILABLE_CHAPTERS.get(stage_id)
        if not stage_config:
            return {"step_completed": step_completed, "stage_completed": False}
            
        steps = stage_config.get("sections", [])  # 内部仍使用sections
        current_step_index = steps.index(step_id) if step_id in steps else -1
        
        # Stage is completed if this is the last step and it's completed
        stage_completed = step_completed and (current_step_index == len(steps) - 1)
        
        return {
            "step_completed": step_completed,
            "stage_completed": stage_completed,
            # 保持向后兼容
            "section_completed": step_completed,
            "chapter_completed": stage_completed,
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
    获取阶段转换建议（适配前端stage/step术语）
    """
    try:
        # 适配前端参数格式
        current_stage = request.get("current_stage") or request.get("current_chapter")
        completed_steps = request.get("completed_steps", []) or request.get("completed_sections", [])
        stage_results = request.get("stage_results", {}) or request.get("chapter_results", {})
        
        # Get all stages from WorkflowManager
        stage_ids = list(WorkflowManager.AVAILABLE_CHAPTERS.keys())
        
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
            next_stage_config = WorkflowManager.AVAILABLE_CHAPTERS[next_stage_id]
            
            return {
                "should_proceed": True,
                "next_stage": next_stage_id,
                "next_stage_name": next_stage_config["name"],
                # 保持向后兼容
                "next_chapter": next_stage_id,
                "next_chapter_name": next_stage_config["name"],
                "message": f"Ready to proceed to {next_stage_config['name']}",
                "confidence": 0.9
            }
        else:
            return {
                "should_proceed": False,
                "next_stage": None,
                "next_chapter": None,
                "message": "All stages completed",
                "workflow_completed": True
            }
        
    except Exception as e:
        logger.error(f"Error getting stage transition suggestion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stage transition suggestion: {str(e)}"
        )