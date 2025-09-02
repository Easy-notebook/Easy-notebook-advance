"""
Sandbox API Endpoints - 提供 sandbox 相关的 REST API

主要功能：
1. 扫描可用项目
2. 准备项目文件用于 CodeSandbox
3. 管理 .sandbox 目录
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import os
from pathlib import Path

# Use absolute import so running `python backend.py` works
from utils.sandbox_manager import create_sandbox_manager, ProjectInfo


# 创建路由器
router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])

# 请求模型
class ScanProjectRequest(BaseModel):
    projectPath: str
    projectType: str


class PrepareProjectRequest(BaseModel):
    projectPath: str
    projectType: str


# 响应模型
class ProjectResponse(BaseModel):
    path: str
    name: str
    type: str
    projectType: str
    size: Optional[int] = None
    lastModified: Optional[float] = None


class ScanProjectResponse(BaseModel):
    files: Dict[str, str]
    dependencies: Dict[str, str]
    devDependencies: Dict[str, str]
    entry: List[str]
    projectType: str


class AvailableProjectsResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int


# 全局 sandbox 管理器
sandbox_manager = create_sandbox_manager()


@router.get("/scan-available-projects", response_model=AvailableProjectsResponse)
async def scan_available_projects(
    search_paths: Optional[str] = None
):
    """
    扫描可用的项目
    
    Args:
        search_paths: 搜索路径，多个路径用逗号分隔
        
    Returns:
        可用项目列表
    """
    try:
        # 解析搜索路径
        paths = None
        if search_paths:
            paths = [path.strip() for path in search_paths.split(',')]
        
        # 扫描项目
        projects_data = sandbox_manager.scan_available_projects(paths)
        
        # 转换为响应格式
        projects = []
        for project_data in projects_data:
            project = ProjectResponse(
                path=project_data['path'],
                name=project_data['name'],
                type=project_data['type'],
                projectType=project_data['projectType'],
                size=project_data.get('size'),
                lastModified=project_data.get('lastModified')
            )
            projects.append(project)
        
        return AvailableProjectsResponse(
            projects=projects,
            total=len(projects)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan projects: {str(e)}")


@router.post("/scan-project", response_model=ScanProjectResponse)
async def scan_project(request: ScanProjectRequest):
    """
    扫描特定项目的文件结构
    
    Args:
        request: 扫描请求，包含项目路径和类型
        
    Returns:
        项目文件结构和配置
    """
    try:
        # 验证路径
        project_path = Path(request.projectPath)
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project path not found: {request.projectPath}")
        
        # 准备项目信息
        project_info = sandbox_manager.prepare_sandbox_project(request.projectPath)
        
        return ScanProjectResponse(
            files=project_info.files,
            dependencies=project_info.dependencies,
            devDependencies=project_info.dev_dependencies,
            entry=project_info.entry,
            projectType=project_info.project_type
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project not found: {request.projectPath}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan project: {str(e)}")


@router.post("/prepare")
async def prepare_project(request: PrepareProjectRequest):
    """
    准备项目用于 CodeSandbox（兼容旧版 API）
    
    Args:
        request: 准备请求
        
    Returns:
        项目配置信息
    """
    try:
        # 准备项目信息
        project_info = sandbox_manager.prepare_sandbox_project(request.projectPath)
        
        return {
            "files": project_info.files,
            "dependencies": project_info.dependencies,
            "devDependencies": project_info.dev_dependencies,
            "entry": project_info.entry,
            "projectType": project_info.project_type,
            "name": project_info.name,
            "type": project_info.type
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project not found: {request.projectPath}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prepare project: {str(e)}")


@router.get("/project-info/{project_path:path}")
async def get_project_info(project_path: str):
    """
    获取项目信息
    
    Args:
        project_path: 项目路径
        
    Returns:
        项目详细信息
    """
    try:
        # 验证路径
        path = Path(project_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Project not found: {project_path}")
        
        # 检测项目类型
        project_type = sandbox_manager.detect_project_type(path)
        
        # 获取基本信息
        stat = path.stat()
        
        return {
            "path": str(path.absolute()),
            "name": path.name,
            "type": "project" if path.is_dir() else "file",
            "projectType": project_type,
            "size": stat.st_size if path.is_file() else None,
            "lastModified": stat.st_mtime,
            "exists": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project info: {str(e)}")


@router.post("/cleanup")
async def cleanup_sandbox(
    background_tasks: BackgroundTasks,
    project_path: Optional[str] = None
):
    """
    清理 sandbox 目录
    
    Args:
        background_tasks: 后台任务
        project_path: 特定项目路径，如果为空则清理所有
        
    Returns:
        清理状态
    """
    try:
        # 在后台执行清理任务
        background_tasks.add_task(sandbox_manager.cleanup_sandbox, project_path)
        
        return {
            "status": "success",
            "message": f"Cleanup task started for {project_path if project_path else 'all projects'}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start cleanup: {str(e)}")


@router.get("/workspace-info")
async def get_workspace_info():
    """
    获取工作空间信息
    
    Returns:
        工作空间基本信息
    """
    try:
        workspace_root = sandbox_manager.workspace_root
        
        # 统计项目数量
        projects = sandbox_manager.scan_available_projects()
        
        # 统计 sandbox 目录数量
        sandbox_dirs = list(workspace_root.rglob('.sandbox'))
        
        return {
            "workspaceRoot": str(workspace_root.absolute()),
            "totalProjects": len(projects),
            "totalSandboxDirs": len(sandbox_dirs),
            "supportedTypes": ["html", "react", "javascript", "typescript", "vue", "angular"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workspace info: {str(e)}")


@router.post("/validate-path")
async def validate_project_path(request: dict):
    """
    验证项目路径是否有效
    
    Args:
        request: 包含 projectPath 的请求
        
    Returns:
        验证结果
    """
    try:
        project_path = request.get('projectPath')
        if not project_path:
            raise HTTPException(status_code=400, detail="projectPath is required")
        
        path = Path(project_path)
        exists = path.exists()
        
        if exists:
            project_type = sandbox_manager.detect_project_type(path)
            is_supported = project_type in ["html", "react", "javascript", "typescript", "vue", "angular"]
        else:
            project_type = None
            is_supported = False
        
        return {
            "valid": exists and is_supported,
            "exists": exists,
            "projectType": project_type,
            "supported": is_supported,
            "isDirectory": path.is_dir() if exists else False,
            "isFile": path.is_file() if exists else False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate path: {str(e)}")


@router.post("/assemble-project")
async def assemble_project(request: ScanProjectRequest):
    """
    组装多文件项目为单个HTML文件
    
    Args:
        request: 项目路径和类型
        
    Returns:
        组装后的完整HTML内容
    """
    try:
        project_path = Path(request.projectPath)
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project not found: {request.projectPath}")
        
        # 组装项目
        assembled_html = sandbox_manager.assemble_html_project(project_path)
        
        return {
            "html": assembled_html,
            "projectPath": request.projectPath,
            "projectType": request.projectType,
            "assembledAt": str(project_path.stat().st_mtime)
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project not found: {request.projectPath}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assemble project: {str(e)}")


@router.post("/generate-preview")
async def generate_preview(request: ScanProjectRequest):
    """
    生成项目预览URL (data URL)
    
    Args:
        request: 项目路径和类型
        
    Returns:
        可直接使用的预览URL
    """
    try:
        project_path = Path(request.projectPath)
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project not found: {request.projectPath}")
        
        # 生成预览URL
        preview_url = sandbox_manager.generate_preview_url(project_path)
        
        return {
            "previewUrl": preview_url,
            "projectPath": request.projectPath,
            "projectType": request.projectType,
            "generatedAt": str(project_path.stat().st_mtime)
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project not found: {request.projectPath}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


@router.get("/preview/{notebook_id}/{project_name}")
async def serve_project_preview(notebook_id: str, project_name: str):
    """
    直接提供组装后的HTML项目预览
    
    Args:
        notebook_id: notebook ID
        project_name: 项目文件夹名称
        
    Returns:
        组装后的完整HTML内容
    """
    try:
        # 构建项目路径
        base_path = Path(f"./notebooks/{notebook_id}/.sandbox/{project_name}")
        
        if not base_path.exists():
            raise HTTPException(status_code=404, detail=f"Project not found: {project_name}")
        
        # 检测项目类型
        project_type = sandbox_manager.detect_project_type(base_path)
        
        if project_type == 'html':
            # 组装HTML项目
            assembled_html = sandbox_manager.assemble_html_project(base_path)
            
            # 直接返回HTML内容
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=assembled_html)
        else:
            # 对于其他类型项目，返回项目信息
            raise HTTPException(status_code=400, detail=f"Unsupported project type: {project_type}")
            
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve preview: {str(e)}")