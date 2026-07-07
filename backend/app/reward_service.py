"""奖励服务 —— 跨学科奖励发放与成就解锁"""
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .models import User, Reward, Achievement, LearningSession, FocusSession, KnowledgeNode, LearningPlan, ReadingNote, ActionItem
from .config import REWARD_CONFIG, ACHIEVEMENTS
from .agent.workers import RewardOfficer


def award_reward(db: Session, user: User, action: str, description: str = "", metadata: dict = None) -> dict:
    """发放奖励 —— 跨学科融合（心理学+社会学+金融学）"""
    metadata = metadata or {}
    reward_info = RewardOfficer.calculate_reward(action, {"streak_days": user.streak_days})

    # 记录奖励
    reward = Reward(
        user_id=user.id,
        reward_type=action,
        points=reward_info["total_points"],
        description=description or f"完成{action}",
        meta=json.dumps({**metadata, **{k: v for k, v in reward_info.items() if k != "action"}}, ensure_ascii=False),
    )
    db.add(reward)

    # 更新用户积分
    user.total_points += reward_info["total_points"]
    db.commit()

    # 检查成就解锁
    unlocked = check_achievements(db, user)

    return {
        **reward_info,
        "description": description,
        "unlocked_achievements": unlocked,
    }


def check_achievements(db: Session, user: User) -> list[dict]:
    """检查并解锁成就"""
    unlocked = []

    # 统计数据
    session_count = db.query(LearningSession).filter(LearningSession.user_id == user.id).count()
    focus_count = db.query(FocusSession).filter(FocusSession.user_id == user.id, FocusSession.completed == True).count()
    node_count = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id).count()
    plan_count = db.query(LearningPlan).filter(LearningPlan.user_id == user.id).count()
    completed_plans = db.query(LearningPlan).filter(LearningPlan.user_id == user.id, LearningPlan.status == "completed").count()
    book_count = db.query(ReadingNote.book_title).filter(ReadingNote.user_id == user.id).distinct().count()
    action_count = db.query(ActionItem).filter(ActionItem.user_id == user.id, ActionItem.status == "completed").count()
    streak = user.streak_days

    # 成就检查规则
    checks = {
        "first_session": session_count >= 1,
        "streak_7": streak >= 7,
        "streak_30": streak >= 30,
        "first_plan": plan_count >= 1,
        "plan_complete": completed_plans >= 1,
        "knowledge_10": node_count >= 10,
        "knowledge_50": node_count >= 50,
        "focus_10": focus_count >= 10,
        "reading_5": book_count >= 5,
        "action_10": action_count >= 10,
    }

    for key, condition in checks.items():
        if not condition:
            continue
        existing = db.query(Achievement).filter(
            Achievement.user_id == user.id,
            Achievement.achievement_key == key
        ).first()
        if not existing:
            achievement = Achievement(user_id=user.id, achievement_key=key)
            db.add(achievement)
            db.commit()
            info = ACHIEVEMENTS.get(key, {})
            unlocked.append({
                "key": key,
                "name": info.get("name", key),
                "desc": info.get("desc", ""),
                "icon": info.get("icon", "🏆"),
            })

    return unlocked


def get_user_achievements(db: Session, user: User) -> list[dict]:
    """获取用户成就列表（含未解锁）"""
    earned = db.query(Achievement).filter(Achievement.user_id == user.id).all()
    earned_map = {a.achievement_key: a for a in earned}

    result = []
    for key, info in ACHIEVEMENTS.items():
        a = earned_map.get(key)
        result.append({
            "key": key,
            "name": info["name"],
            "desc": info["desc"],
            "icon": info["icon"],
            "earned": a is not None,
            "earned_at": a.earned_at if a else None,
        })
    return result
