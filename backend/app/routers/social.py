"""Social learning routes (groups + connections)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import GroupMember, SocialConnection, SocialGroup, User
from ..rewards.engine import RewardService
from ..schemas import GroupCreate, GroupOut

router = APIRouter(prefix="/social", tags=["social"])


@router.get("/groups", response_model=list[GroupOut])
def list_groups(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(SocialGroup, func.count(GroupMember.id))
        .outerjoin(GroupMember, GroupMember.group_id == SocialGroup.id)
        .group_by(SocialGroup.id)
        .order_by(SocialGroup.created_at.desc())
    ).all()
    out = []
    for g, count in rows:
        out.append(GroupOut(
            id=g.id, name=g.name, description=g.description, category=g.category,
            is_private=g.is_private, invite_code=g.invite_code, member_count=count,
        ))
    return out


@router.post("/groups", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = SocialGroup(
        name=payload.name, description=payload.description, category=payload.category,
        is_private=payload.is_private, leader_id=user.id,
        invite_code=uuid.uuid4().hex[:8].upper() if payload.is_private else None,
    )
    db.add(group)
    db.flush()
    db.add(GroupMember(group_id=group.id, user_id=user.id, role="leader"))
    db.commit()
    db.refresh(group)
    return GroupOut(
        id=group.id, name=group.name, description=group.description, category=group.category,
        is_private=group.is_private, invite_code=group.invite_code, member_count=1,
    )


@router.post("/groups/{group_id}/join", response_model=GroupOut)
def join_group(group_id: str, invite_code: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.get(SocialGroup, group_id)
    if not group:
        raise HTTPException(404, "小组不存在")
    if group.is_private and group.invite_code != invite_code:
        raise HTTPException(403, "邀请码无效")
    existing = db.scalar(select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user.id))
    if not existing:
        db.add(GroupMember(group_id=group_id, user_id=user.id, role="member"))
        db.flush()
        # social dimension achievement: groups_joined
        metrics = RewardService.user_metrics(db, user)
        metrics["groups_joined"] = db.scalar(
            select(func.count(GroupMember.id)).where(GroupMember.user_id == user.id)
        ) or 0
        RewardService.check_achievements(db, user, metrics=metrics)
        db.commit()
    count = db.scalar(select(func.count(GroupMember.id)).where(GroupMember.group_id == group_id)) or 1
    return GroupOut(
        id=group.id, name=group.name, description=group.description, category=group.category,
        is_private=group.is_private, invite_code=group.invite_code, member_count=count,
    )


@router.get("/search-users")
def search_users(q: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not q or len(q) < 1:
        return []
    rows = db.scalars(
        select(User).where(User.username.ilike(f"%{q}%"), User.id != user.id).limit(10)
    ).all()
    return [{"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url} for u in rows]


@router.post("/connect/{target_id}")
def connect(target_id: str, connection_type: str = "friend", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if target_id == user.id:
        raise HTTPException(400, "不能与自己建立连接")
    target = db.get(User, target_id)
    if not target:
        raise HTTPException(404, "用户不存在")
    existing = db.scalar(
        select(SocialConnection).where(
            SocialConnection.user_id == user.id,
            SocialConnection.connected_user_id == target_id,
            SocialConnection.connection_type == connection_type,
        )
    )
    if existing:
        return {"status": "already_connected"}
    db.add(SocialConnection(user_id=user.id, connected_user_id=target_id, connection_type=connection_type))
    db.commit()
    return {"status": "connected"}


@router.get("/connections")
def my_connections(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(SocialConnection).where(SocialConnection.user_id == user.id)).all()
    result = []
    for c in rows:
        u = db.get(User, c.connected_user_id)
        result.append({"connection_type": c.connection_type, "user": {
            "id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url,
        }})
    return result
