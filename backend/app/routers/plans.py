"""学习计划路由 — CRUD + 里程碑"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, LearningPlan, PlanMilestone
from ..schemas import PlanCreate, PlanUpdate, PlanOut, MilestoneOut
from ..auth import get_current_user, update_streak
from ..reward_service import award_reward

router = APIRouter(prefix="/api/v1/plans", tags=["学习计划"])


def _plan_to_out(plan: LearningPlan) -> PlanOut:
    total = len(plan.milestones)
    completed = sum(1 for m in plan.milestones if m.completed)
    progress = completed / total if total > 0 else 0.0
    return PlanOut(
        id=plan.id,
        title=plan.title,
        description=plan.description,
        status=plan.status,
        target_skills=json.loads(plan.target_skills or "[]"),
        deadline=plan.deadline,
        engines=json.loads(plan.engines or "[]"),
        milestones=[MilestoneOut.model_validate(m) for m in plan.milestones],
        progress=progress,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("", response_model=list[PlanOut])
def list_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(LearningPlan).filter(LearningPlan.user_id == user.id).order_by(LearningPlan.created_at.desc()).all()
    return [_plan_to_out(p) for p in plans]


@router.post("", response_model=PlanOut)
def create_plan(data: PlanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)
    plan = LearningPlan(
        user_id=user.id,
        title=data.title,
        description=data.description,
        target_skills=json.dumps(data.target_skills, ensure_ascii=False),
        deadline=data.deadline,
        engines=json.dumps(data.engines, ensure_ascii=False),
    )
    db.add(plan)
    db.flush()

    for ms in data.milestones:
        milestone = PlanMilestone(
            plan_id=plan.id,
            title=ms.title,
            description=ms.description,
            target_date=ms.target_date,
            order_index=ms.order_index,
        )
        db.add(milestone)

    db.commit()
    db.refresh(plan)

    # 首次创建计划奖励
    award_reward(db, user, "first_plan", f"创建学习计划：{data.title}")

    return _plan_to_out(plan)


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id, LearningPlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    return _plan_to_out(plan)


@router.put("/{plan_id}", response_model=PlanOut)
def update_plan(plan_id: str, data: PlanUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id, LearningPlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")

    if data.title is not None:
        plan.title = data.title
    if data.description is not None:
        plan.description = data.description
    if data.status is not None:
        plan.status = data.status
    if data.deadline is not None:
        plan.deadline = data.deadline

    db.commit()
    db.refresh(plan)

    # 完成计划奖励
    if data.status == "completed":
        award_reward(db, user, "plan_complete", f"完成学习计划：{plan.title}")

    return _plan_to_out(plan)


@router.delete("/{plan_id}")
def delete_plan(plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id, LearningPlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    db.delete(plan)
    db.commit()
    return {"message": "计划已删除"}


@router.post("/{plan_id}/milestones/{milestone_id}/complete", response_model=PlanOut)
def complete_milestone(plan_id: str, milestone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id, LearningPlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")

    milestone = db.query(PlanMilestone).filter(PlanMilestone.id == milestone_id, PlanMilestone.plan_id == plan_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="里程碑不存在")

    from datetime import datetime, timezone
    milestone.completed = True
    milestone.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(plan)

    award_reward(db, user, "milestone_complete", f"完成里程碑：{milestone.title}")

    # 检查是否所有里程碑都完成
    if all(m.completed for m in plan.milestones):
        plan.status = "completed"
        db.commit()
        db.refresh(plan)
        award_reward(db, user, "plan_complete", f"完成学习计划：{plan.title}")

    return _plan_to_out(plan)
