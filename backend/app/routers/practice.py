"""Deliberate practice routes (skill tree + items + attempts)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..engines.deliberate_practice import DeliberatePracticeEngine
from ..models import PracticeAttempt, PracticeItem, SkillNode, User
from ..rewards.engine import RewardService
from ..schemas import (
    PracticeAttemptIn,
    PracticeAttemptOut,
    PracticeItemCreate,
    PracticeItemOut,
    SkillNodeCreate,
    SkillNodeOut,
)

router = APIRouter(prefix="/practice", tags=["practice"])


# --- skill tree -------------------------------------------------------------
@router.get("/skills", response_model=list[SkillNodeOut])
def list_skills(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(SkillNode).where(SkillNode.user_id == user.id).order_by(SkillNode.order_index)).all())


@router.post("/skills", response_model=SkillNodeOut, status_code=status.HTTP_201_CREATED)
def add_skill(payload: SkillNodeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    skill = SkillNode(user_id=user.id, **payload.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.get("/bottlenecks", response_model=list[SkillNodeOut])
def bottlenecks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DeliberatePracticeEngine.detect_bottlenecks(db, user.id)


# --- practice items ---------------------------------------------------------
@router.post("/items", response_model=PracticeItemOut, status_code=status.HTTP_201_CREATED)
def add_item(payload: PracticeItemCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = PracticeItem(user_id=user.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/due", response_model=list[PracticeItemOut])
def due_items(limit: int = 10, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DeliberatePracticeEngine.next_review_queue(db, user.id, limit=limit)


@router.get("/items", response_model=list[PracticeItemOut])
def list_items(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(PracticeItem).where(PracticeItem.user_id == user.id).order_by(PracticeItem.created_at.desc()).limit(limit)
    ).all())


# --- attempt + SM-2 grading -------------------------------------------------
@router.post("/attempts", response_model=PracticeAttemptOut)
def submit_attempt(payload: PracticeAttemptIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(PracticeItem, payload.item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "练习项不存在")

    theta = DeliberatePracticeEngine.estimate_user_theta(db, user.id)
    quality = max(0, min(5, payload.self_rating))
    is_correct = quality >= 3

    attempt = PracticeAttempt(
        item_id=item.id,
        user_id=user.id,
        user_answer=payload.user_answer,
        is_correct=is_correct,
        quality=quality,
        feedback=DeliberatePracticeEngine.coach_feedback(item, type("A", (), {"is_correct": is_correct, "quality": quality})()),
    )
    db.add(attempt)

    DeliberatePracticeEngine.schedule_review(item, quality)
    new_difficulty = DeliberatePracticeEngine.adapt_difficulty(item, theta)
    db.flush()

    # reward
    tokens = int(settings_token_per_correct()) if is_correct else 0
    if tokens:
        RewardService.grant(db, user, "psychology", "practice_correct", tokens, reason="答对练习")
        RewardService.maybe_surprise(db, user, tokens)
    RewardService.check_achievements(db, user)
    db.commit()
    db.refresh(item)

    return PracticeAttemptOut(
        id=attempt.id,
        item_id=item.id,
        is_correct=is_correct,
        quality=quality,
        feedback=attempt.feedback,
        next_review_at=item.next_review_at,
        new_difficulty=new_difficulty,
        tokens_earned=tokens,
    )


def settings_token_per_correct() -> float:
    from ..config import settings
    return settings.token_per_practice_correct
