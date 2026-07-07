"""奖励路由 — 积分/成就/排行榜"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import User, Reward
from ..schemas import RewardOut, AchievementOut, LeaderboardEntry
from ..auth import get_current_user, get_user_level
from ..reward_service import get_user_achievements

router = APIRouter(prefix="/api/v1/rewards", tags=["奖励系统"])


@router.get("/balance")
def get_balance(user: User = Depends(get_current_user)):
    level = get_user_level(user.total_points)
    return {
        "total_points": user.total_points,
        "level_name": level["name"],
        "level_icon": level["icon"],
        "streak_days": user.streak_days,
    }


@router.get("/history", response_model=list[RewardOut])
def get_reward_history(limit: int = 20, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rewards = db.query(Reward).filter(Reward.user_id == user.id).order_by(Reward.earned_at.desc()).limit(limit).all()
    return [RewardOut.model_validate(r) for r in rewards]


@router.get("/achievements", response_model=list[AchievementOut])
def get_achievements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_achievements(db, user)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(period: str = "all", limit: int = 20, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(User).order_by(User.total_points.desc())
    users = query.limit(limit).all()

    # 找到当前用户的位置
    all_users = db.query(User).order_by(User.total_points.desc()).all()
    user_rank = next((i + 1 for i, u in enumerate(all_users) if u.id == user.id), len(all_users))

    result = []
    for i, u in enumerate(users):
        level = get_user_level(u.total_points)
        result.append(LeaderboardEntry(
            user_id=u.id,
            username=u.username,
            avatar=u.avatar,
            total_points=u.total_points,
            level_name=level["name"],
            level_icon=level["icon"],
            rank=i + 1,
        ))

    # 如果当前用户不在前N名，追加显示
    if user_rank > limit:
        level = get_user_level(user.total_points)
        result.append(LeaderboardEntry(
            user_id=user.id,
            username=user.username + " (你)",
            avatar=user.avatar,
            total_points=user.total_points,
            level_name=level["name"],
            level_icon=level["icon"],
            rank=user_rank,
        ))

    return result


@router.get("/levels")
def get_levels():
    from ..config import LEVELS
    return {"levels": LEVELS}
