"""LearnFlow 后端应用入口"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .database import init_db, Base, engine
from .routers import auth, plans, learning, knowledge, rewards, agent, analytics

logger = logging.getLogger("learnflow")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库"""
    logger.info("初始化数据库...")
    Base.metadata.create_all(bind=engine)
    init_db()
    logger.info("LearnFlow 后端已启动 → http://localhost:8000")
    yield
    logger.info("LearnFlow 后端已停止")


app = FastAPI(
    title="LearnFlow API",
    description="AI 驱动的个人学习辅助系统 - 融合刻意练习/海绵阅读/深度工作/知行转化/批判性思维",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由（路由自身已定义 /api/v1/* 前缀）
app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(learning.router)
app.include_router(knowledge.router)
app.include_router(rewards.router)
app.include_router(agent.router)
app.include_router(analytics.router)


@app.get("/", tags=["健康检查"])
async def root():
    return {
        "name": "LearnFlow API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "engines": [
            "deliberate_practice",
            "sponge_reading",
            "deep_work",
            "knowledge_action",
            "critical_thinking",
        ],
    }


@app.get("/health", tags=["健康检查"])
async def health():
    return {"status": "ok"}
