"""Deep work / focus session routes."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..engines.deep_work import DeepWorkEngine
from ..models import FocusSession, User
from ..rewards.engine import RewardService
from ..schemas import FocusComplete, FocusSessionOut, FocusStart

router = APIRouter(prefix="/focus", tags=["focus"])


@router.post("/start", response_model=FocusSessionOut)
def start_focus(payload: FocusStart, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = FocusSession(
        user_id=user.id,
        mode=payload.mode,
        strategy=payload.strategy,
        plan_id=payload.plan_id,
        planned_minutes=payload.planned_minutes,
        task_summary=payload.task_summary,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/complete", response_model=FocusSessionOut)
def complete_focus(session_id: str, payload: FocusComplete, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(FocusSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "专注会话不存在")
    session.actual_minutes = payload.actual_minutes
    session.distraction_count = payload.distraction_count
    session.reflection = payload.reflection
    session.ended_at = datetime.now(timezone.utc)
    session.status = "completed"
    db.flush()

    # reward: tokens per focus minute (finance) + streak (psychology)
    RewardService.update_streak(db, user)
    base = int(payload.actual_minutes * 2)
    RewardService.grant(db, user, "finance", "focus_minutes", base, reason=f"深度专注 {payload.actual_minutes} 分钟")
    RewardService.maybe_surprise(db, user, base)
    RewardService.check_achievements(db, user)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/abandon", response_model=FocusSessionOut)
def abandon_focus(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(FocusSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "专注会话不存在")
    session.status = "abandoned"
    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


@router.get("/history", response_model=list[FocusSessionOut])
def focus_history(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(FocusSession).where(FocusSession.user_id == user.id).order_by(FocusSession.started_at.desc()).limit(limit)
    ).all())


@router.get("/rituals")
def focus_rituals(strategy: str = "rhythmic", task: str | None = None, user: User = Depends(get_current_user)):
    return {
        "startup": DeepWorkEngine.startup_ritual(strategy, task),
        "shutdown": DeepWorkEngine.shutdown_ritual(),
        "suggested_blocks": [{"label": "晨间深度块", "start": "09:00", "end": "11:00", "energy": 0.95},
                             {"label": "晚间深度块", "start": "20:00", "end": "22:00", "energy": 0.85}],
        "strategy_advice": DeepWorkEngine.recommend_strategy(user.preferences.get("vocation")),
    }


@router.get("/weekly-summary")
def weekly_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DeepWorkEngine.weekly_deep_summary(db, user.id)
