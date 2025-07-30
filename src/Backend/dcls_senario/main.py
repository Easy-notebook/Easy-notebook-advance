from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.endpoints import planner_router
from app.utils.logger import ModernLogger

# 配置日志
logger = ModernLogger("dcls_senario", level="info")

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

@app.get("/v2/health")
async def health_check():
    return {"status": "ok", "message": "FastAPI 服务正常运行"}

if __name__ == "__main__":
    logger.banner("VDS", "VDS Agents Backend", "存在性第一性原理驱动的数据科学工作流系统")
    logger.info("启动 VDS Agents Backend 服务...")
    logger.info("服务地址: http://0.0.0.0:28600")
    uvicorn.run("main:app", host="0.0.0.0", port=28600, reload=True) 