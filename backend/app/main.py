"""LearnFlow FastAPI application entry point.

Wires up CORS, the v1 router tree and the startup lifecycle that:
  1. creates database tables (dev convenience — use Alembic in prod),
  2. seeds the achievement catalog from the reward engine.

Run locally with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine, SessionLocal
from .models import Achievement  # noqa: F401  (ensure model registry)
from .rewards.engine import ACHIEVEMENT_CATALOG
from .routers import (
    action,
    agent,
    analytics,
    auth,
    critical,
    focus,
    knowledge,
    plans,
    practice,
    reader,
    rewards,
    social,
)

logger = logging.getLogger("learnflow")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def _seed_achievements() -> None:
    """Idempotently seed the achievement catalog (sociology: identity badges)."""
    db = SessionLocal()
    try:
        existing = {row.code for row in db.query(Achievement).all()}
        added = 0
        for entry in ACHIEVEMENT_CATALOG:
            if entry["code"] in existing:
                continue
            db.add(Achievement(**entry))
            added += 1
        if added:
            db.commit()
            logger.info("Seeded %d new achievements (%d total).", added, len(ACHIEVEMENT_CATALOG))
        else:
            logger.info("Achievement catalog already complete (%d).", len(ACHIEVEMENT_CATALOG))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    logger.info("Starting %s v%s (%s)", settings.app_name, settings.app_version, settings.environment)
    Base.metadata.create_all(bind=engine)
    _seed_achievements()
    yield
    # --- shutdown ---
    logger.info("Shutting down %s.", settings.app_name)


app = FastAPI(
    title=f"{settings.app_name} API",
    description=(
        "AI驱动的个人学习辅助系统 —— 融合刻意练习、海绵阅读法、深度工作、知行转化与批判性思维 "
        "五大学习方法论，跨学科（心理学/社会学/金融学）奖励机制，多Agent协同。"
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# --- CORS ---
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- v1 routers ---
prefix = settings.api_v1_prefix
for r in (
    action.router, agent.router, analytics.router, auth.router, critical.router,
    focus.router, knowledge.router, plans.router, practice.router, reader.router,
    rewards.router, social.router,
):
    app.include_router(r, prefix=prefix)


# --- health & meta ---
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@app.get("/", tags=["meta"])
def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "api_prefix": settings.api_v1_prefix,
    }


@app.get("/openapi-versions", tags=["meta"])
def api_versions():
    return {"versions": ["v1"], "current": "v1", "prefix": settings.api_v1_prefix}
