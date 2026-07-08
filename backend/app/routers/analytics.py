"""Analytics & dashboard aggregation routes.

Provides the unified dashboard payload described in PRD §10 (`/analytics/dashboard`)
together with lightweight trend / distribution helpers consumed by the frontend.
All aggregation runs against the relational store so the endpoint works with
both SQLite (default) and PostgreSQL.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    Achievement,
    FocusSession,
    KnowledgeNode,
    LearningPlan,
    LearningSession,
    PracticeAttempt,
    PracticeItem,
    User,
    UserAchievement,
)
from ..rewards.engine import RewardService
from ..schemas import DashboardOut, UserAchievementOut, UserOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _utc_day_range(days_ago: int = 0) -> tuple[datetime, datetime]:
    """Return the [start, end) UTC range for a given calendar day offset."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=days_ago)
    return start, start + timedelta(days=1)


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Aggregate the user's headline metrics, weekly trend and engine mix.

    Combines focus / practice / plan / knowledge / reward signals so the
    frontend can render the whole dashboard from a single call.
    """
    uid = user.id
    now = datetime.now(timezone.utc)

    # --- today ---
    day_start, day_end = _utc_day_range(0)
    today_focus_minutes = db.scalar(
        select(func.coalesce(func.sum(FocusSession.actual_minutes), 0))
        .where(FocusSession.user_id == uid, FocusSession.ended_at >= day_start, FocusSession.ended_at < day_end)
    ) or 0
    today_practice_count = db.scalar(
        select(func.count(PracticeAttempt.id))
        .where(PracticeAttempt.user_id == uid, PracticeAttempt.created_at >= day_start, PracticeAttempt.created_at < day_end)
    ) or 0

    # --- totals ---
    total_focus_minutes = db.scalar(
        select(func.coalesce(func.sum(FocusSession.actual_minutes), 0)).where(FocusSession.user_id == uid)
    ) or 0
    total_practice_count = db.scalar(
        select(func.count(PracticeAttempt.id)).where(PracticeAttempt.user_id == uid)
    ) or 0
    active_plans = db.scalar(
        select(func.count(LearningPlan.id)).where(LearningPlan.user_id == uid, LearningPlan.status == "active")
    ) or 0
    knowledge_node_count = db.scalar(
        select(func.count(KnowledgeNode.id)).where(KnowledgeNode.user_id == uid)
    ) or 0

    # --- weekly focus trend (last 7 days) ---
    weekly_focus: list[dict] = []
    for offset in range(6, -1, -1):
        ds, de = _utc_day_range(offset)
        minutes = db.scalar(
            select(func.coalesce(func.sum(FocusSession.actual_minutes), 0))
            .where(FocusSession.user_id == uid, FocusSession.ended_at >= ds, FocusSession.ended_at < de)
        ) or 0
        weekly_focus.append({"date": ds.strftime("%Y-%m-%d"), "minutes": int(minutes)})

    # --- engine distribution (session counts by engine) ---
    engine_rows = db.execute(
        select(LearningSession.engine, func.count(LearningSession.id))
        .where(LearningSession.user_id == uid)
        .group_by(LearningSession.engine)
    ).all()
    engine_distribution = [{"engine": eng, "count": cnt} for eng, cnt in engine_rows]
    # include focus sessions under deep_work if not already tracked via LearningSession
    if not any(e["engine"] == "deep_work" for e in engine_distribution):
        focus_count = db.scalar(select(func.count(FocusSession.id)).where(FocusSession.user_id == uid)) or 0
        if focus_count:
            engine_distribution.append({"engine": "deep_work", "count": focus_count})

    # --- recent sessions (focus history, newest first) ---
    recent = list(db.scalars(
        select(FocusSession)
        .where(FocusSession.user_id == uid, FocusSession.status == "completed")
        .order_by(FocusSession.ended_at.desc())
        .limit(5)
    ).all())
    recent_sessions = [
        {
            "id": s.id,
            "plan_id": s.plan_id,
            "engine": "deep_work",
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "duration_minutes": s.actual_minutes,
            "difficulty": 0.5,
            "performance": 0.0,
            "focus_score": max(0.0, 1.0 - (s.distraction_count / max(1, s.planned_minutes))),
            "session_data": {"mode": s.mode, "strategy": s.strategy, "task_summary": s.task_summary},
            "reward_granted": 0,
        }
        for s in recent
    ]

    # --- achievements (mine) ---
    ach_rows = db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_code == Achievement.code)
        .where(UserAchievement.user_id == uid)
        .order_by(UserAchievement.earned_at.desc())
    ).all()
    achievements = [
        UserAchievementOut(
            achievement_code=ua.achievement_code,
            name=ach.name,
            icon=ach.icon,
            dimension=ach.dimension,
            earned_at=ua.earned_at,
        )
        for ua, ach in ach_rows
    ]

    # --- upcoming reviews (SM-2 due items) ---
    upcoming = list(db.scalars(
        select(PracticeItem)
        .where(PracticeItem.user_id == uid, PracticeItem.next_review_at <= now)
        .order_by(PracticeItem.next_review_at.asc())
        .limit(10)
    ).all())

    return DashboardOut(
        user=UserOut.model_validate(user),
        today_focus_minutes=int(today_focus_minutes),
        today_practice_count=int(today_practice_count),
        active_plans=int(active_plans),
        total_focus_minutes=int(total_focus_minutes),
        total_practice_count=int(total_practice_count),
        knowledge_node_count=int(knowledge_node_count),
        streak_days=user.streak_days,
        token_balance=user.token_balance,
        weekly_focus=weekly_focus,
        engine_distribution=engine_distribution,
        recent_sessions=recent_sessions,
        achievements=achievements,
        upcoming_reviews=upcoming,
    )


@router.get("/weekly")
def weekly_trend(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """7-day rolling focus + practice counts for trend charts."""
    uid = user.id
    days: list[dict] = []
    for offset in range(6, -1, -1):
        ds, de = _utc_day_range(offset)
        focus_min = db.scalar(
            select(func.coalesce(func.sum(FocusSession.actual_minutes), 0))
            .where(FocusSession.user_id == uid, FocusSession.ended_at >= ds, FocusSession.ended_at < de)
        ) or 0
        practice_n = db.scalar(
            select(func.count(PracticeAttempt.id))
            .where(PracticeAttempt.user_id == uid, PracticeAttempt.created_at >= ds, PracticeAttempt.created_at < de)
        ) or 0
        days.append({
            "date": ds.strftime("%Y-%m-%d"),
            "weekday": ds.strftime("%a"),
            "focus_minutes": int(focus_min),
            "practice_count": int(practice_n),
        })
    return {"days": days}


@router.get("/engines")
def engine_breakdown(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Time spent per learning engine (for the methodology-mix chart)."""
    uid = user.id
    rows = db.execute(
        select(LearningSession.engine, func.coalesce(func.sum(LearningSession.duration_minutes), 0))
        .where(LearningSession.user_id == uid)
        .group_by(LearningSession.engine)
    ).all()
    breakdown = [{"engine": eng, "minutes": int(m)} for eng, m in rows]
    # merge deep work focus sessions
    deep_min = db.scalar(
        select(func.coalesce(func.sum(FocusSession.actual_minutes), 0)).where(FocusSession.user_id == uid)
    ) or 0
    if deep_min:
        found = next((b for b in breakdown if b["engine"] == "deep_work"), None)
        if found:
            found["minutes"] += int(deep_min)
        else:
            breakdown.append({"engine": "deep_work", "minutes": int(deep_min)})
    return {"breakdown": breakdown}


@router.get("/metrics")
def full_metrics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """All computed metrics used by the achievement + reward engine."""
    return RewardService.user_metrics(db, user)
