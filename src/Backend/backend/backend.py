import os
import uuid
import logging
import re
import sys
import base64
import mimetypes
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timedelta

from fastapi import FastAPI, Body, UploadFile, File, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, Field
from concurrent.futures import ThreadPoolExecutor

from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
from screenplay import generate_response
from kernel_manager import KernelExecutionManager

# ========================
# 配置日志
# ========================
class UTF8StreamHandler(logging.StreamHandler):
    def __init__(self):
        super().__init__(sys.stdout)
        self.encoding = 'utf-8'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log', encoding='utf-8'),
        UTF8StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ========================
# ORM: 使用 SQLAlchemy 建立 SQLite 数据库
# ========================
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = "sqlite:///./notebooks.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Notebook(Base):
    __tablename__ = "notebooks"
    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class RequestLog(Base):
    __tablename__ = "request_logs"
    id = Column(String, primary_key=True, index=True, default=lambda: uuid.uuid4().hex)
    notebook_id = Column(String, index=True, nullable=True)
    endpoint = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

# 依赖注入：数据库 session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========================
# 常量设置
# ========================
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
EXECUTION_TIMEOUT = 300  # 5分钟超时
HEARTBEAT_INTERVAL = 5  # 心跳检测间隔秒数
MAX_NOTEBOOK_AGE_HOURS = 24
ALLOWED_MIME_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/gif'],
    'document': [
        'application/pdf',
        'application/msword',
        'text/plain',
        'text/csv',
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg']
}

# ========================
# 初始化 FastAPI 应用
# ========================
app = FastAPI(title="Notebook API", version="1.0.0")

# 暂时注释掉安全过滤中间件，因为主要过滤逻辑已在各端点实现
# app.add_middleware(SecurityFilterMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化线程池
executor = ThreadPoolExecutor(max_workers=4)

# 全局 kernel 管理字典
kernel_managers: Dict[str, KernelExecutionManager] = {}

# ========================
# 请求和响应数据模型
# ========================
class CreateNotebookResponse(BaseModel):
    status: str
    notebook_id: str
    message: str

class RestartKernelResponse(BaseModel):
    status: str
    notebook_id: str
    message: str

class ExecuteRequest(BaseModel):
    code: str
    notebook_id: str

class ExecuteResponse(BaseModel):
    status: str
    outputs: List[Dict[str, Any]]
    error: Optional[str] = None
    timestamp: str
    elapsed_time: float = 0

class ShutdownRequest(BaseModel):
    notebook_id: str

class UploadFileRequest(BaseModel):
    notebook_id: str
    mode: str = Field(..., description="'unrestricted' or 'restricted'")
    allowed_types: List[str] = Field(default_factory=list)
    max_files: int = Field(None, ge=1)

class SendOperationRequest(BaseModel):
    notebook_id: str
    operation: Dict[str, Any]

class GetFileRequest(BaseModel):
    notebook_id: str
    filename: str

class GetFileInfoRequest(BaseModel):
    notebook_id: str
    filename: str

class CreateFileRequest(BaseModel):
    notebook_id: str
    filename: str  # relative path inside the notebook directory
    content: str = ""  # text content (UTF-8)
    overwrite: bool = True
    make_dirs: bool = True


class FileInfoResponse(BaseModel):
    name: str
    path: str
    size: int
    lastModified: str
    type: str

class FileContentResponse(BaseModel):
    content: str
    size: int
    lastModified: str
    dataUrl: Optional[str] = None
    error: Optional[str] = None

class GenerateHtmlRequest(BaseModel):
    """Request body for generating a simple HTML sandbox page."""
    subdir: Optional[str] = None
    title: Optional[str] = "Sandbox Page"
    body_html: Optional[str] = "<h1>Hello Sandbox</h1>"
    css: Optional[str] = ""
    js: Optional[str] = ""

class GenerateHtmlResponse(BaseModel):
    status: str
    notebook_id: str
    subdir: str
    url: str
    message: str = ""

# ========================
# 辅助函数：记录请求日志
# ========================
def log_request(db: Session, endpoint: str, notebook_id: Optional[str] = None):
    log_entry = RequestLog(notebook_id=notebook_id, endpoint=endpoint)
    db.add(log_entry)
    db.commit()

def is_valid_notebook_id(notebook_id: str) -> bool:
    """验证 notebook_id 格式"""
    pattern = r'^[\w\-]+$'
    return bool(re.match(pattern, notebook_id))

def sanitize_response_content(content: any, notebook_id: str, is_file_tree: bool = False) -> any:
    """
    简单过滤：如果字符串包含notebook_id，返回空字符串
    但对于文件树结构，不进行过滤以保持完整性
    """
    if not notebook_id or not content:
        return content

    # 对于文件树，不进行过滤
    if is_file_tree:
        return content

    if isinstance(content, str):
        if notebook_id in content:
            return ""
        return content
    elif isinstance(content, dict):
        result = {}
        for key, value in content.items():
            if isinstance(value, str) and notebook_id in value:
                result[key] = ""
            else:
                result[key] = value
        return result
    elif isinstance(content, list):
        result = []
        for item in content:
            if isinstance(item, str) and notebook_id in item:
                continue  # 跳过包含notebook_id的项
            result.append(item)
        return result
    else:
        return content

class SecurityFilterMiddleware(BaseHTTPMiddleware):
    """
    安全过滤中间件，自动过滤所有响应中的notebook ID
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # 尝试从URL路径中提取notebook_id
        notebook_id = None
        path_parts = request.url.path.split('/')

        # 查找可能的notebook_id (32位十六进制字符串)
        for part in path_parts:
            if len(part) == 32 and all(c in '0123456789abcdef' for c in part.lower()):
                notebook_id = part
                break

        # 如果找到notebook_id且响应是JSON，则过滤内容
        if notebook_id and hasattr(response, 'body'):
            try:
                # 这里主要是为了日志记录，实际的过滤已经在各个端点中实现
                logger.debug(f"Security filter applied for notebook {notebook_id}")
            except Exception as e:
                logger.error(f"Error in security filter: {str(e)}")

        return response

# ========================
# API 路由
# ========================

# POST /initialize：创建新 notebook，同时记录数据库信息
@app.post("/initialize", response_model=CreateNotebookResponse)
async def create_notebook(db: Session = Depends(get_db)):
    request_id = str(uuid.uuid4())
    logger.info(f"Request {request_id}: Creating new notebook")
    log_request(db, endpoint="/initialize")
    try:
        notebook_id = uuid.uuid4().hex
        work_dir = f"./notebooks/{notebook_id}"
        os.makedirs(work_dir, exist_ok=True)  # 创建工作目录

        # 初始化 kernel_manager，并记录到全局字典中
        kernel_managers[notebook_id] = KernelExecutionManager(work_dir=work_dir)
        await kernel_managers[notebook_id].initialize_kernel()

        # 在数据库中记录 Notebook 信息
        new_notebook = Notebook(id=notebook_id, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        db.add(new_notebook)
        db.commit()

        logger.info(f"Request {request_id}: Successfully created notebook {notebook_id}")
        return CreateNotebookResponse(
            status="ok",
            notebook_id=notebook_id,
            message="Notebook created successfully"
        )
    except Exception as e:
        logger.error(f"Request {request_id}: Error creating notebook: {str(e)}")
        return CreateNotebookResponse(
            status="error",
            notebook_id="",
            message=str(e)
        )

# GET /check_notebook_id：检查 notebook_id 是否存在（数据库中记录）
@app.get("/check_notebook_id/{notebook_id}")
async def check_notebook_id(notebook_id: str, db: Session = Depends(get_db)):
    logger.info(f"Checking existence of notebook {notebook_id}")
    log_request(db, endpoint="/check_notebook_id", notebook_id=notebook_id)
    notebook = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    return {"exists": True if notebook else False}

@app.post("/restart_kernel", response_model=RestartKernelResponse)
async def restart_kernel(notebook_id: str, db: Session = Depends(get_db)):
    request_id = str(uuid.uuid4())
    logger.info(f"Request {request_id}: Restarting kernel for notebook {notebook_id}")
    log_request(db, endpoint="/restart_kernel", notebook_id=notebook_id)
    try:
        if notebook_id not in kernel_managers:
            raise HTTPException(status_code=404, detail="Notebook not found")
        await kernel_managers[notebook_id].restartKernel()
        return RestartKernelResponse(
            status="ok",
            notebook_id=notebook_id,
            message="Kernel restarted successfully"
        )
    except Exception as e:
        logger.error(f"Request {request_id}: Error restarting kernel: {str(e)}")
        return RestartKernelResponse(
            status="error",
            notebook_id=notebook_id,
            message=str(e)
        )

@app.post("/execute", response_model=ExecuteResponse)
async def execute_code_endpoint(execute_request: ExecuteRequest, db: Session = Depends(get_db)):
    request_id = str(uuid.uuid4())
    logger.info(f"Request {request_id}: Executing code in notebook {execute_request.notebook_id}")
    log_request(db, endpoint="/execute", notebook_id=execute_request.notebook_id)
    try:
        if execute_request.notebook_id not in kernel_managers:
            work_dir = f"./notebooks/{execute_request.notebook_id}"
            kernel_managers[execute_request.notebook_id] = KernelExecutionManager(work_dir=work_dir)
        kem = kernel_managers[execute_request.notebook_id]
        result = await kem.execute_code_with_progress(execute_request.code)

        # 过滤结果中的敏感信息
        sanitized_result = sanitize_response_content(result, execute_request.notebook_id)
        return ExecuteResponse(**sanitized_result)
    except Exception as e:
        error_msg = sanitize_response_content(str(e), execute_request.notebook_id)
        logger.error(f"Request {request_id}: Code execution failed: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg or "Code execution failed")

@app.post("/cancel_execution/{notebook_id}")
async def cancel_execution(notebook_id: str, db: Session = Depends(get_db)):
    log_request(db, endpoint="/cancel_execution", notebook_id=notebook_id)
    if notebook_id not in kernel_managers:
        raise HTTPException(status_code=404, detail="Notebook not found")
    kem = kernel_managers[notebook_id]
    return await kem.cancel_execution()

@app.get("/execution_status/{notebook_id}")
async def get_execution_status(notebook_id: str, db: Session = Depends(get_db)):
    """获取 notebook 的执行状态"""
    log_request(db, endpoint="/execution_status", notebook_id=notebook_id)
    if notebook_id not in kernel_managers:
        raise HTTPException(status_code=404, detail="Notebook not found")
    kem = kernel_managers[notebook_id]
    return await kem.get_execution_status()

@app.post("/shutdown")
async def shutdown_endpoint(shutdown_request: ShutdownRequest, db: Session = Depends(get_db)):
    request_id = str(uuid.uuid4())
    logger.info(f"Request {request_id}: Shutting down notebook {shutdown_request.notebook_id}")
    log_request(db, endpoint="/shutdown", notebook_id=shutdown_request.notebook_id)
    try:
        if shutdown_request.notebook_id in kernel_managers:
            kem = kernel_managers[shutdown_request.notebook_id]
            kem.shutdown_kernel()
            del kernel_managers[shutdown_request.notebook_id]
            return {'status': 'ok', 'message': 'Kernel shutdown successfully'}
        return {'status': 'error', 'message': 'Notebook not found'}
    except Exception as e:
        logger.error(f"Request {request_id}: Shutdown failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_file")
async def upload_file_endpoint(
    notebook_id: str = Body(...),
    files: List[UploadFile] = File(...),
    mode: str = Body(...),
    allowed_types: List[str] = Body(default_factory=list),
    max_files: int = Body(default=None),
    target_dir: str = Body(default=""),
    db: Session = Depends(get_db)
):
    request_id = str(uuid.uuid4())
    logger.info(f"Request {request_id}: Uploading files to notebook {notebook_id}")
    log_request(db, endpoint="/upload_file", notebook_id=notebook_id)
    if not is_valid_notebook_id(notebook_id):
        raise HTTPException(status_code=400, detail=f"Invalid notebook_id: {notebook_id}")
    try:
        work_dir = Path(f"./notebooks/{notebook_id}")
        if not work_dir.exists():
            os.makedirs(work_dir, exist_ok=True)

        # Only allow writing to notebook root or .assets
        if target_dir not in ("", ".assets"):
            raise HTTPException(status_code=400, detail="Invalid target directory")

        base_dir = work_dir / target_dir if target_dir else work_dir
        if not base_dir.exists():
            os.makedirs(base_dir, exist_ok=True)

        saved_files = []
        for file in files:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE/1024/1024}MB"
                )
            filename = file.filename
            # Normalize filename to avoid path traversal
            filename = os.path.basename(filename)
            file_path = base_dir / filename
            with open(file_path, "wb") as f:
                f.write(content)
            saved_files.append(filename)
        return {
            'status': 'ok',
            'message': f"{len(saved_files)} files uploaded successfully",
            'files': saved_files,
            'target_dir': target_dir
        }
    except Exception as e:
        logger.error(f"Request {request_id}: Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def build_file_tree(directory: Path, base_dir: Path) -> List[Dict]:
    """Build a hierarchical file tree structure"""
    tree = []

    # Get all items in the directory
    items = []
    try:
        for item in directory.iterdir():
            # Skip hidden files and directories, but allow .sandbox and .assets
            if item.name.startswith('.') and item.name not in ['.sandbox', '.assets']:
                continue
            items.append(item)
    except PermissionError:
        return tree

    # Sort items: directories first, then files
    items.sort(key=lambda x: (x.is_file(), x.name.lower()))

    for item in items:
        # Calculate relative path from the base directory (notebook folder)
        relative_path = str(item.relative_to(base_dir))

        if item.is_dir():
            # Recursively build subtree for directories
            subtree = build_file_tree(item, base_dir)
            stat = item.stat()
            tree.append({
                'name': item.name,
                'type': 'directory',
                'path': relative_path,
                'children': subtree,
                'size': 0,
                'lastModified': datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        elif item.is_file():
            # Add file info
            stat = item.stat()
            tree.append({
                'name': item.name,
                'type': 'file',
                'path': relative_path,
                'size': stat.st_size,
                'lastModified': datetime.fromtimestamp(stat.st_mtime).isoformat()
            })

    return tree

@app.get("/list_files/{notebook_id}")
async def list_files_endpoint(notebook_id: str, db: Session = Depends(get_db)):
    log_request(db, endpoint="/list_files", notebook_id=notebook_id)
    try:
        work_dir = Path(f"./notebooks/{notebook_id}")
        if not work_dir.exists():
            return {'status': 'error', 'message': 'Notebook directory not found'}

        # Build hierarchical file tree
        file_tree = build_file_tree(work_dir, work_dir)

        # 对于文件树，不进行过滤以保持完整性
        sanitized_tree = sanitize_response_content(file_tree, notebook_id, is_file_tree=True)

        logger.info(f"Built file tree for notebook {notebook_id}")
        return {'status': 'ok', 'files': sanitized_tree}

    except Exception as e:
        error_msg = sanitize_response_content(str(e), notebook_id)
        logger.error(f"Error listing files: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/create_file")
async def create_file_endpoint(request: CreateFileRequest, db: Session = Depends(get_db)):
    """
    Create or overwrite a text file under notebooks/{notebook_id}/{filename}.
    - Prevent path traversal; only allow writing within the notebook directory.
    - Optionally create parent directories.
    """
    log_request(db, endpoint="/create_file", notebook_id=request.notebook_id)
    try:
        if not is_valid_notebook_id(request.notebook_id):
            raise HTTPException(status_code=400, detail=f"Invalid notebook_id: {request.notebook_id}")

        work_dir = Path(f"./notebooks/{request.notebook_id}")
        work_dir.mkdir(parents=True, exist_ok=True)

        # Normalize and validate path (no traversal)
        filename = os.path.normpath(request.filename).lstrip("/\\")
        target_path = work_dir / filename
        try:
            target_path.resolve().relative_to(work_dir.resolve())
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid filename path")

        # Ensure parent dirs
        if request.make_dirs:
            target_path.parent.mkdir(parents=True, exist_ok=True)

        if target_path.exists() and not request.overwrite:
            raise HTTPException(status_code=409, detail="File already exists")

        # Write content as UTF-8 text
        target_path.write_text(request.content or "", encoding="utf-8")

        stat = target_path.stat()
        return {
            'status': 'ok',
            'message': 'File created',
            'file': {
                'name': target_path.name,
                'path': str(target_path.relative_to(work_dir)),
                'size': stat.st_size,
                'lastModified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'type': 'file',
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download_file/{notebook_id}/{filename}")
async def download_file_endpoint(notebook_id: str, filename: str, db: Session = Depends(get_db)):
    log_request(db, endpoint="/download_file", notebook_id=notebook_id)
    try:
        work_dir = Path(f"./notebooks/{notebook_id}")
        file_path = work_dir / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File {filename} not found")
        return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream')
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send_operation")
async def send_operation_endpoint(send_operation_request: SendOperationRequest, db: Session = Depends(get_db)):
    log_request(db, endpoint="/send_operation", notebook_id=send_operation_request.notebook_id)
    notebook_id = send_operation_request.notebook_id
    operation = send_operation_request.operation

    # 确保 notebook_id 也写回到 operation.payload，便于后续 Agent 使用
    try:
        if not isinstance(operation, dict):
            operation = dict(operation)
        if "payload" not in operation or not isinstance(operation.get("payload"), dict):
            operation["payload"] = {}
        # 不覆盖前端已携带的 notebook_id
        operation["payload"].setdefault("notebook_id", notebook_id)
    except Exception as e:
        logger.warning(f"Failed to inject notebook_id into operation payload: {e}")

    # 过滤操作请求中的敏感信息（仅用于日志显示，不影响传递给引擎的原始operation）
    sanitized_operation = sanitize_response_content(operation, notebook_id)
    logger.info(f"Received operation for notebook {notebook_id}: {sanitized_operation}")

    # 对流式响应进行包装以过滤输出
    async def filtered_generate_response():
        async for chunk in generate_response(operation):
            if isinstance(chunk, str):
                sanitized_chunk = sanitize_response_content(chunk, notebook_id)
                if sanitized_chunk:  # 只有非空的chunk才返回
                    yield sanitized_chunk
            else:
                yield chunk

    return StreamingResponse(
        filtered_generate_response(),
        media_type="application/json",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.post("/get_file_info", response_model=FileInfoResponse)
async def get_file_info_endpoint(request: GetFileInfoRequest, db: Session = Depends(get_db)):
    log_request(db, endpoint="/get_file_info", notebook_id=request.notebook_id)
    try:
        work_dir = Path(f"./notebooks/{request.notebook_id}")
        file_path = work_dir / request.filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File {request.filename} not found")

        stat = file_path.stat()
        file_type = "directory" if file_path.is_dir() else "file"

        # 过滤文件信息中的敏感内容
        response_data = {
            "name": file_path.name,
            "path": str(file_path.relative_to(work_dir)),
            "size": stat.st_size,
            "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "type": file_type
        }

        sanitized_data = sanitize_response_content(response_data, request.notebook_id)
        return FileInfoResponse(**sanitized_data)

    except Exception as e:
        error_msg = sanitize_response_content(str(e), request.notebook_id)
        logger.error(f"Error getting file info: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/get_file", response_model=FileContentResponse)
async def get_file_endpoint(request: GetFileRequest, db: Session = Depends(get_db)):
    log_request(db, endpoint="/get_file", notebook_id=request.notebook_id)
    try:
        work_dir = Path(f"./notebooks/{request.notebook_id}")
        file_path = work_dir / request.filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File {request.filename} not found")

        stat = file_path.stat()
        last_modified = datetime.fromtimestamp(stat.st_mtime).isoformat()

        # Detect file type
        file_type, _ = mimetypes.guess_type(file_path)

        # Handle different file types
        if file_type and file_type.startswith('image/'):
            # For image files, return base64 encoded content
            with open(file_path, 'rb') as f:
                file_content = base64.b64encode(f.read()).decode('utf-8')

            data_url = f"data:{file_type};base64,{file_content}"

            response = FileContentResponse(
                content=file_content,
                size=stat.st_size,
                lastModified=last_modified,
                dataUrl=data_url
            )
        else:
            # For text files (including CSV) and other non-image types
            is_binary = False
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            except UnicodeDecodeError:
                # If not a text file, return base64 encoded binary
                with open(file_path, 'rb') as f:
                    file_content = base64.b64encode(f.read()).decode('utf-8')
                is_binary = True

            # 仅对可读文本做脱敏，二进制（如 PDF、Office 等）不要改动 base64 防止损坏
            sanitized_content = file_content if is_binary else sanitize_response_content(file_content, request.notebook_id)

            response = FileContentResponse(
                content=sanitized_content,
                size=stat.st_size,
                lastModified=last_modified
            )

        return response

    except Exception as e:
        error_msg = sanitize_response_content(str(e), request.notebook_id)
        logger.error(f"Error reading file: {error_msg}")
        return FileContentResponse(
            content="",
            size=0,
            lastModified=datetime.utcnow().isoformat(),
            error=error_msg
        )

@app.post("/sandbox/{notebook_id}/generate_html", response_model=GenerateHtmlResponse)
async def generate_html_sandbox(
    notebook_id: str,
    payload: GenerateHtmlRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Generate a simple HTML sandbox under notebooks/{id}/.sandbox/{subdir}/ and
    return a URL that can be opened directly or embedded in an iframe.
    """
    log_request(db, endpoint="/sandbox/generate_html", notebook_id=notebook_id)

    if not is_valid_notebook_id(notebook_id):
        raise HTTPException(status_code=400, detail=f"Invalid notebook_id: {notebook_id}")

    try:
        # Prepare directories
        work_dir = Path(f"./notebooks/{notebook_id}")
        sandbox_root = work_dir / ".sandbox"
        sandbox_root.mkdir(parents=True, exist_ok=True)

        subdir = payload.subdir.strip("/") if payload.subdir else "default"
        target_dir = sandbox_root / subdir

        # Security check: ensure target_dir is within sandbox_root (no traversal)
        try:
            target_dir.resolve().relative_to(sandbox_root.resolve())
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid subdir path")

        target_dir.mkdir(parents=True, exist_ok=True)

        # Write optional assets
        css_href = ""
        js_src = ""

        if payload.css:
            css_path = target_dir / "style.css"
            css_path.write_text(payload.css, encoding="utf-8")
            css_href = "<link rel=\"stylesheet\" href=\"./style.css\" />"

        if payload.js:
            js_path = target_dir / "main.js"
            js_path.write_text(payload.js, encoding="utf-8")
            js_src = "<script defer src=\"./main.js\"></script>"

        # Compose index.html
        html = (
            "<!doctype html>\n"
            "<html lang=\"en\">\n"
            "  <head>\n"
            "    <meta charset=\"UTF-8\" />\n"
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
            f"    <title>{payload.title or 'Sandbox Page'}</title>\n"
            f"    {css_href}\n"
            "  </head>\n"
            "  <body style=\"margin:0;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto\">\n"
            f"    {payload.body_html or ''}\n"
            f"    {js_src}\n"
            "  </body>\n"
            "</html>\n"
        )
        (target_dir / "index.html").write_text(html, encoding="utf-8")

        url = f"/sandbox/{notebook_id}/{subdir}/"
        return GenerateHtmlResponse(status="ok", notebook_id=notebook_id, subdir=subdir, url=url, message="HTML sandbox generated")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating HTML sandbox for notebook {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate HTML sandbox")


@app.get("/sandbox/{notebook_id}/{path:path}")
async def serve_sandbox(notebook_id: str, path: str, request: Request, db: Session = Depends(get_db)):
    """
    Serve files from notebooks/{id}/.sandbox with SPA fallback.
    - If path is a directory (ends with /) serve index.html inside it.
    - If file doesn't exist and Accept includes text/html, fall back to the nearest subdir index.html.
    """
    log_request(db, endpoint="/sandbox", notebook_id=notebook_id)

    if not is_valid_notebook_id(notebook_id):
        raise HTTPException(status_code=400, detail=f"Invalid notebook_id: {notebook_id}")

    try:
        base_dir = Path(f"./notebooks/{notebook_id}/.sandbox")
        if not base_dir.exists():
            raise HTTPException(status_code=404, detail="Sandbox directory not found")

        # Normalize path
        normalized = path or ""
        # If ends with slash or empty, default to index.html in that directory
        if normalized == "" or normalized.endswith("/"):
            normalized = normalized + "index.html"

        file_path = (base_dir / normalized)

        # Path traversal protection
        try:
            file_path.resolve().relative_to(base_dir.resolve())
        except Exception:
            raise HTTPException(status_code=403, detail="Access denied: path traversal detected")

        if file_path.exists() and file_path.is_file():
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = "application/octet-stream"
            headers = {
                "Cache-Control": "public, max-age=60",
                "Last-Modified": datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%a, %d %b %Y %H:%M:%S GMT')
            }
            return FileResponse(path=str(file_path), media_type=mime_type, headers=headers)

        # SPA fallback: try first segment's index.html
        accept = request.headers.get("accept", "")
        wants_html = "text/html" in accept.lower()
        if wants_html:
            first_segment = normalized.split("/")[0] if "/" in normalized else normalized
            if first_segment:
                fallback = base_dir / first_segment / "index.html"
                try:
                    fallback.resolve().relative_to(base_dir.resolve())
                except Exception:
                    fallback = None
                if fallback and fallback.exists() and fallback.is_file():
                    return FileResponse(path=str(fallback), media_type="text/html")

        raise HTTPException(status_code=404, detail="Sandbox file not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving sandbox '{path}' for notebook {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/assets/{notebook_id}/{filename}")
async def serve_asset(notebook_id: str, filename: str, db: Session = Depends(get_db)):
    """
    Serve assets (images, videos, etc.) from notebook's .assets folder
    """
    log_request(db, endpoint="/assets", notebook_id=notebook_id)

    # Validate notebook_id format
    if not is_valid_notebook_id(notebook_id):
        raise HTTPException(status_code=400, detail=f"Invalid notebook_id: {notebook_id}")

    try:
        # Construct paths
        work_dir = Path(f"./notebooks/{notebook_id}")
        assets_dir = work_dir / ".assets"
        file_path = assets_dir / filename

        # Security check: ensure file is within assets directory
        try:
            file_path.resolve().relative_to(assets_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied: path traversal detected")

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Asset {filename} not found")

        # Check if it's actually a file
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail=f"{filename} is not a file")

        # Detect MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        # Set appropriate cache headers for assets
        headers = {
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            "Last-Modified": datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%a, %d %b %Y %H:%M:%S GMT')
        }

        return FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=filename,
            headers=headers
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving asset {filename} for notebook {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/assets/{notebook_id}")
async def cleanup_assets(notebook_id: str, db: Session = Depends(get_db)):
    """
    Clean up old assets for a notebook (optional maintenance endpoint)
    """
    log_request(db, endpoint="/cleanup_assets", notebook_id=notebook_id)

    # Validate notebook_id format
    if not is_valid_notebook_id(notebook_id):
        raise HTTPException(status_code=400, detail=f"Invalid notebook_id: {notebook_id}")

    try:
        assets_dir = Path(f"./notebooks/{notebook_id}/.assets")

        if not assets_dir.exists():
            return {"status": "ok", "message": "No assets directory found", "deleted_files": 0}

        # Get all files older than 7 days
        cutoff_time = datetime.now().timestamp() - (7 * 24 * 60 * 60)  # 7 days ago
        deleted_files = 0

        for file_path in assets_dir.iterdir():
            if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
                try:
                    file_path.unlink()
                    deleted_files += 1
                except Exception as e:
                    logger.warning(f"Failed to delete asset {file_path}: {str(e)}")

        return {
            "status": "ok",
            "message": f"Cleaned up {deleted_files} old assets",
            "deleted_files": deleted_files
        }

    except Exception as e:
        logger.error(f"Error cleaning assets for notebook {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Asset cleanup failed")


# ========================
# 应用启动与关闭事件
# ========================
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up application")
    Path("./notebooks").mkdir(exist_ok=True)
    # 创建数据库表
    Base.metadata.create_all(bind=engine)
    # 初始化调度器，定时清理过期 notebook
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_old_notebooks, 'interval', hours=1)
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")
    executor.shutdown(wait=True)
    for notebook_id, kem in kernel_managers.items():
        try:
            kem.shutdown_kernel()
        except Exception as e:
            logger.error(f"Error shutting down kernel {notebook_id}: {str(e)}")

# ========================
# 辅助函数：清理过期的 notebook
# ========================
def cleanup_old_notebooks():
    current_time = datetime.now()
    for notebook_id, kem in list(kernel_managers.items()):
        try:
            if (current_time - kem.last_activity) > timedelta(hours=MAX_NOTEBOOK_AGE_HOURS):
                logger.info(f"Cleaning up inactive notebook: {notebook_id}")
                kem.shutdown_kernel()
                del kernel_managers[notebook_id]
        except Exception as e:
            logger.error(f"Error during cleanup of notebook {notebook_id}: {str(e)}")

# ========================
# 主入口
# ========================
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=18600,
        log_level="info",
        access_log=True
    )
