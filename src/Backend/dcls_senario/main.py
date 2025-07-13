import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.endpoints import planner_router, workflow_router
from app.core.config import log_config

# 配置日志
logging.config.dictConfig(log_config)
logger = logging.getLogger("app")

app = FastAPI(title="数据分析学习平台API", description="提供数据分析学习和指导的API接口")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(planner_router, prefix="/v1", tags=["planner"])
app.include_router(workflow_router, prefix="/api/workflow", tags=["workflow"])

@app.get("/v2/health")
async def health_check():
    return {"status": "ok", "message": "FastAPI 服务正常运行"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=28600, reload=True) 