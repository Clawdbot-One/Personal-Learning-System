"""Knowledge-action routes (7-day action plans + knowing-doing gap)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..engines.knowledge_action import KnowledgeActionEngine
from ..models import ActionItem, ActionPlan, User
from ..rewards.engine import RewardService
from ..schemas import ActionItemToggle, ActionPlanCreate, ActionPlanOut

router = APIRouter(prefix="/action", tags=["action"])


@router.post("/plans", response_model=ActionPlanOut, status_code=status.HTTP_201_CREATED)
def create_action_plan(payload: ActionPlanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = KnowledgeActionEngine.generate_action_plan(
        user.id, payload.title, payload.source_concept, payload.insight
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/plans", response_model=list[ActionPlanOut])
def list_action_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(ActionPlan).where(ActionPlan.user_id == user.id).order_by(ActionPlan.created_at.desc())
    ).all())


@router.get("/plans/{plan_id}", response_model=ActionPlanOut)
def get_action_plan(plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.get(ActionPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(404, "行动计划不存在")
    return plan


@router.put("/plans/{plan_id}/items/{item_id}", response_model=ActionPlanOut)
def toggle_action_item(plan_id: str, item_id: str, payload: ActionItemToggle,
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.get(ActionPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(404, "行动计划不存在")
    item = db.get(ActionItem, item_id)
    if not item or item.plan_id != plan_id:
        raise HTTPException(404, "行动项不存在")
    item.is_done = payload.is_done
    item.done_at = datetime.now(timezone.utc) if payload.is_done else None
    KnowledgeActionEngine.recompute_progress(plan)
    db.flush()
    # if plan fully done, reward + settle any related commitment contracts
    if plan.status == "done":
        RewardService.grant(db, user, "finance", "action_plan_done", 30, reason=f"完成 7 天行动计划：{plan.title}")
        RewardService.check_achievements(db, user)
        # settle linked learning futures
        from ..models import CommitmentContract
        contracts = db.scalars(
            select(CommitmentContract).where(CommitmentContract.plan_id == plan_id, CommitmentContract.status == "active")
        ).all()
        for c in contracts:
            RewardService.settle_contract(db, c, user, success=True)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/gap")
def knowing_doing_gap(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return KnowledgeActionEngine.knowing_doing_gap(db, user.id)


@router.post("/green-light")
def green_light_eval(idea: str, user: User = Depends(get_current_user)):
    return KnowledgeActionEngine.green_light_eval(idea)
