"""分析路由 — 仪表盘数据"""
import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import User, LearningSession, FocusSession, KnowledgeNode, LearningPlan, PlanMilestone, ReadingNote, ActionItem
from ..auth import get_current_user, get_user_level
from ..engines import sponge_reading, deliberate_practice

router = APIRouter(prefix="/api/v1/analytics", tags=["数据分析"])


@router.get("/dashboard")
def get_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    level = get_user_level(user.total_points)

    # 统计数据
    total_sessions = db.query(LearningSession).filter(LearningSession.user_id == user.id).count()
    total_focus = db.query(FocusSession).filter(FocusSession.user_id == user.id, FocusSession.completed == True).all()
    total_focus_minutes = sum(s.actual_minutes for s in total_focus)
    total_nodes = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id).count()
    total_plans = db.query(LearningPlan).filter(LearningPlan.user_id == user.id).count()
    active_plans = db.query(LearningPlan).filter(LearningPlan.user_id == user.id, LearningPlan.status == "active").count()

    # 最近会话
    recent = db.query(LearningSession).filter(LearningSession.user_id == user.id).order_by(LearningSession.started_at.desc()).limit(10).all()
    recent_sessions = [{
        "id": s.id,
        "engine_type": s.engine_type,
        "performance_score": s.performance_score,
        "duration_minutes": s.duration_minutes,
        "started_at": s.started_at.isoformat() if s.started_at else "",
        "completed": s.completed_at is not None,
    } for s in recent]

    # 周数据（最近7天每天的学习时长）
    now = datetime.now(timezone.utc)
    weekly_data = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_sessions = db.query(LearningSession).filter(
            LearningSession.user_id == user.id,
            LearningSession.started_at >= day_start,
            LearningSession.started_at < day_end,
        ).all()
        day_focus = db.query(FocusSession).filter(
            FocusSession.user_id == user.id,
            FocusSession.started_at >= day_start,
            FocusSession.started_at < day_end,
            FocusSession.completed == True,
        ).all()
        minutes = sum(s.duration_minutes for s in day_sessions) + sum(s.actual_minutes for s in day_focus)
        weekly_data.append({
            "date": day_start.strftime("%m-%d"),
            "minutes": minutes,
            "sessions": len(day_sessions) + len(day_focus),
        })

    # 引擎分布
    engine_counts = defaultdict(int)
    for s in recent:
        engine_counts[s.engine_type] += 1
    all_sessions = db.query(LearningSession).filter(LearningSession.user_id == user.id).all()
    engine_counts = defaultdict(int)
    for s in all_sessions:
        engine_counts[s.engine_type] += 1
    engine_distribution = [{"name": k, "value": v} for k, v in engine_counts.items()]

    # 技能雷达（基于学习表现）
    skill_radar = _calculate_skill_radar(all_sessions, db, user)

    # 今日任务
    today_tasks = _get_today_tasks(user, db)

    return {
        "total_points": user.total_points,
        "level_name": level["name"],
        "level_icon": level["icon"],
        "streak_days": user.streak_days,
        "total_sessions": total_sessions,
        "total_focus_minutes": total_focus_minutes,
        "total_knowledge_nodes": total_nodes,
        "total_plans": total_plans,
        "active_plans": active_plans,
        "recent_sessions": recent_sessions,
        "weekly_data": weekly_data,
        "engine_distribution": engine_distribution,
        "skill_radar": skill_radar,
        "today_tasks": today_tasks,
    }


def _calculate_skill_radar(sessions, db, user):
    """计算技能雷达图数据"""
    # 基于五大引擎的表现计算
    engine_scores = defaultdict(list)
    for s in sessions:
        if s.performance_score > 0:
            engine_scores[s.engine_type].append(s.performance_score)

    radar = [
        {"skill": "刻意练习", "score": int(sum(engine_scores.get("deliberate_practice", [0.3])) / max(1, len(engine_scores.get("deliberate_practice", [1]))) * 100)},
        {"skill": "海绵阅读", "score": int(sum(engine_scores.get("sponge_reading", [0.3])) / max(1, len(engine_scores.get("sponge_reading", [1]))) * 100)},
        {"skill": "深度工作", "score": min(100, db.query(FocusSession).filter(FocusSession.user_id == user.id, FocusSession.completed == True).count() * 10)},
        {"skill": "知行转化", "score": min(100, db.query(ActionItem).filter(ActionItem.user_id == user.id, ActionItem.status == "completed").count() * 15)},
        {"skill": "批判思维", "score": int(sum(engine_scores.get("critical_thinking", [0.3])) / max(1, len(engine_scores.get("critical_thinking", [1]))) * 100)},
    ]
    return radar


def _get_today_tasks(user, db):
    """获取今日待办任务"""
    tasks = []

    # 未完成的行动项
    pending_actions = db.query(ActionItem).filter(
        ActionItem.user_id == user.id,
        ActionItem.status != "completed"
    ).limit(3).all()
    for a in pending_actions:
        tasks.append({
            "type": "action_item",
            "title": a.description[:50],
            "link": "/critical-thinking",
        })

    # 活跃计划的未完成里程碑
    active_plans = db.query(LearningPlan).filter(LearningPlan.user_id == user.id, LearningPlan.status == "active").all()
    for plan in active_plans[:2]:
        for m in plan.milestones:
            if not m.completed:
                tasks.append({
                    "type": "milestone",
                    "title": f"[{plan.title}] {m.title}",
                    "link": "/plans",
                })
                break

    # 建议任务
    if not tasks:
        tasks = [
            {"type": "suggestion", "title": "开始一次刻意练习", "link": "/practice"},
            {"type": "suggestion", "title": "记录阅读笔记", "link": "/reader"},
            {"type": "suggestion", "title": "启动深度工作", "link": "/deep-work"},
        ]

    return tasks[:5]


@router.get("/skills")
def get_skills(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """技能分析"""
    sessions = db.query(LearningSession).filter(LearningSession.user_id == user.id).all()
    return {"radar": _calculate_skill_radar(sessions, db, user)}
