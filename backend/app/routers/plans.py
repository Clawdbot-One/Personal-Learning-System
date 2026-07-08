"""Learning plans & milestones routes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import LearningPlan, PlanMilestone, User
from ..schemas import MilestoneCreate, MilestoneOut, PlanCreate, PlanOut, PlanUpdate

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(payload: PlanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = LearningPlan(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        domain=payload.domain,
        target_skills=payload.target_skills,
        enabled_engines=payload.enabled_engines or [
            "deliberate_practice", "sponge_reading", "deep_work", "knowledge_action", "critical_thinking"
        ],
        deadline=payload.deadline,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=list[PlanOut])
def list_plans(status_filter: Optional[str] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(LearningPlan).where(LearningPlan.user_id == user.id)
    if status_filter:
        stmt = stmt.where(LearningPlan.status == status_filter)
    stmt = stmt.order_by(LearningPlan.created_at.desc())
    return list(db.scalars(stmt).all())


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.get(LearningPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(404, "计划不存在")
    return plan


@router.put("/{plan_id}", response_model=PlanOut)
def update_plan(plan_id: str, payload: PlanUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.get(LearningPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(404, "计划不存在")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.get(LearningPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(404, "计划不存在")
    db.delete(plan)
    db.commit()


# --- milestones -------------------------------------------------------------
@router.post("/{plan_id}/milestones", response_model=MilestoneOut, status_code=status.HTTP_201_CREATED)
def add_milestone(plan_id: str, payload: MilestoneCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.get(LearningPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(404, "计划不存在")
    m = PlanMilestone(plan_id=plan_id, **payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/{plan_id}/milestones/{milestone_id}", response_model=MilestoneOut)
def toggle_milestone(plan_id: str, milestone_id: str, is_completed: bool = True, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(PlanMilestone, milestone_id)
    if not m or m.plan_id != plan_id:
        raise HTTPException(404, "里程碑不存在")
    m.is_completed = is_completed
    m.completed_at = datetime.now(timezone.utc) if is_completed else None
    db.commit()
    db.refresh(m)
    # update plan progress
    plan = db.get(LearningPlan, plan_id)
    if plan and plan.milestones:
        plan.progress = round(sum(1 for x in plan.milestones if x.is_completed) / len(plan.milestones), 3)
        db.commit()
    return m
