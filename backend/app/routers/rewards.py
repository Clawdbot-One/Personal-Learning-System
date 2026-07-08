"""Rewards, achievements, leaderboard & commitment contract routes."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Achievement, CommitmentContract, Reward, User, UserAchievement
from ..rewards.engine import RewardService
from ..schemas import (
    AchievementOut,
    CommitmentCreate,
    CommitmentOut,
    LeaderboardEntry,
    RewardOut,
    UserAchievementOut,
)

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/balance")
def balance(user: User = Depends(get_current_user)):
    return {"token_balance": user.token_balance, "reputation": user.reputation, "streak_days": user.streak_days}


@router.get("/history", response_model=list[RewardOut])
def reward_history(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(Reward).where(Reward.user_id == user.id).order_by(desc(Reward.earned_at)).limit(limit)
    ).all())


@router.get("/achievements", response_model=list[AchievementOut])
def all_achievements(db: Session = Depends(get_db)):
    return list(db.scalars(select(Achievement)).all())


@router.get("/achievements/mine", response_model=list[UserAchievementOut])
def my_achievements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_code == Achievement.code)
        .where(UserAchievement.user_id == user.id)
        .order_by(desc(UserAchievement.earned_at))
    ).all()
    return [
        UserAchievementOut(
            achievement_code=ua.achievement_code,
            name=ach.name,
            icon=ach.icon,
            dimension=ach.dimension,
            earned_at=ua.earned_at,
        )
        for ua, ach in rows
    ]


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(metric: str = "token_balance", limit: int = 10, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Top-N + self, to avoid demotivating lower ranks (sociology design)."""
    col_map = {
        "token_balance": User.token_balance,
        "reputation": User.reputation,
        "streak_days": User.streak_days,
    }
    col = col_map.get(metric, User.token_balance)
    top_rows = db.scalars(select(User).order_by(desc(col)).limit(limit)).all()
    entries = []
    for i, u in enumerate(top_rows, 1):
        entries.append(LeaderboardEntry(
            user_id=u.id, username=u.username, display_name=u.display_name,
            avatar_url=u.avatar_url, token_balance=u.token_balance,
            reputation=u.reputation, streak_days=u.streak_days, rank=i,
        ))
    # ensure self is included (only top-N + self shown, per anti-demotivation design)
    if user.id not in {e.user_id for e in entries}:
        self_value = getattr(user, metric, user.token_balance)
        self_rank = db.scalar(select(func.count(User.id)).where(col > self_value)) or 0
        entries.append(LeaderboardEntry(
            user_id=user.id, username=user.username, display_name=user.display_name,
            avatar_url=user.avatar_url, token_balance=user.token_balance,
            reputation=user.reputation, streak_days=user.streak_days, rank=self_rank + 1,
        ))
    return entries


# --- learning futures / commitment contracts (finance) ---------------------
@router.get("/contracts", response_model=list[CommitmentOut])
def list_contracts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(CommitmentContract).where(CommitmentContract.user_id == user.id).order_by(desc(CommitmentContract.created_at))
    ).all())


@router.post("/contracts", response_model=CommitmentOut, status_code=status.HTTP_201_CREATED)
def create_contract(payload: CommitmentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        contract = RewardService.create_contract(
            db, user, plan_id=payload.plan_id, title=payload.title,
            stake=payload.stake, reward=payload.reward, deadline=payload.deadline,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    db.commit()
    db.refresh(contract)
    return contract


@router.post("/contracts/{contract_id}/settle", response_model=CommitmentOut)
def settle_contract(contract_id: str, success: bool, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contract = db.get(CommitmentContract, contract_id)
    if not contract or contract.user_id != user.id:
        raise HTTPException(404, "学习期货不存在")
    RewardService.settle_contract(db, contract, user, success=success)
    RewardService.check_achievements(db, user)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/roi")
def learning_roi(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return RewardService.learning_roi(db, user)
