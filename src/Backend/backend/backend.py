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

from fastapi import FastAPI, Body, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from concurrent.futures import ThreadPoolExecutor

from werkzeug.utils import secure_filename
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
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

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
    lang: str = Field(default="en")

class GetFileRequest(BaseModel):
    notebook_id: str
    filename: str

class GetFileInfoRequest(BaseModel):
    notebook_id: str
    filename: str

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
        return ExecuteResponse(**result)
    except Exception as e:
        logger.error(f"Request {request_id}: Code execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        saved_files = []
        for file in files:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE/1024/1024}MB"
                )
            # filename = secure_filename(file.filename)
            filename = file.filename
            unique_filename = f"{filename}"
            file_path = work_dir / unique_filename
            with open(file_path, "wb") as f:
                f.write(content)
            saved_files.append(unique_filename)
        return {
            'status': 'ok',
            'message': f"{len(saved_files)} files uploaded successfully",
            'files': saved_files
        }
    except Exception as e:
        logger.error(f"Request {request_id}: Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list_files/{notebook_id}")
async def list_files_endpoint(notebook_id: str, db: Session = Depends(get_db)):
    log_request(db, endpoint="/list_files", notebook_id=notebook_id)
    try:
        work_dir = Path(f"./notebooks/{notebook_id}")
        if not work_dir.exists():
            return {'status': 'error', 'message': 'Notebook directory not found'}
        files = [f.name for f in work_dir.iterdir() if f.is_file()]
        return {'status': 'ok', 'files': files}
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
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
    lang = send_operation_request.lang
    logger.info(f"Received operation for notebook {notebook_id}: {operation}")
    return StreamingResponse(
        generate_response(operation, lang=lang),
        media_type="application/json",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用nginx缓冲
            "X-Content-Type-Options": "nosniff",
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
        
        return FileInfoResponse(
            name=file_path.name,
            path=str(file_path.relative_to(work_dir)),
            size=stat.st_size,
            lastModified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
            type=file_type
        )
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
            
            return FileContentResponse(
                content=file_content,
                size=stat.st_size,
                lastModified=last_modified,
                dataUrl=data_url
            )
        else:
            # For text files (including CSV)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            except UnicodeDecodeError:
                # If not a text file, return base64 encoded binary
                with open(file_path, 'rb') as f:
                    file_content = base64.b64encode(f.read()).decode('utf-8')
            
            return FileContentResponse(
                content=file_content,
                size=stat.st_size,
                lastModified=last_modified
            )
            
    except Exception as e:
        logger.error(f"Error reading file: {str(e)}")
        return FileContentResponse(
            content="",
            size=0,
            lastModified=datetime.utcnow().isoformat(),
            error=str(e)
        )

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
    # 设置环境变量以禁用输出缓冲
    os.environ["PYTHONUNBUFFERED"] = "1"
    
    # 流式输出优化的启动配置
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=18600,
        log_level="info",
        access_log=True,
        reload=False,  # 生产环境关闭热重载
        use_colors=False,
        # 流式输出优化配置
        timeout_keep_alive=30,
        timeout_graceful_shutdown=5,
        limit_concurrency=100,
        limit_max_requests=1000,
        # 禁用缓冲以提高流式输出性能
        http="httptools",  # 使用高性能HTTP解析器
        loop="uvloop" if os.name != 'nt' else "asyncio",  # Windows使用asyncio，Linux/macOS使用uvloop
    )
