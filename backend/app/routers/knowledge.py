"""Knowledge graph routes (nodes + relations)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import KnowledgeNode, KnowledgeRelation, User
from ..schemas import (
    KnowledgeGraphOut,
    KnowledgeNodeCreate,
    KnowledgeNodeOut,
    KnowledgeRelationCreate,
    KnowledgeRelationOut,
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("/graph", response_model=KnowledgeGraphOut)
def get_graph(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nodes = list(db.scalars(select(KnowledgeNode).where(KnowledgeNode.user_id == user.id)).all())
    node_ids = {n.id for n in nodes}
    edges = []
    if node_ids:
        edges = [
            e for e in db.scalars(
                select(KnowledgeRelation).where(
                    KnowledgeRelation.source_id.in_(node_ids)
                )
            ).all()
            if e.target_id in node_ids
        ]
    return KnowledgeGraphOut(nodes=nodes, edges=edges)


@router.post("/nodes", response_model=KnowledgeNodeOut, status_code=status.HTTP_201_CREATED)
def add_node(payload: KnowledgeNodeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    node = KnowledgeNode(user_id=user.id, **payload.model_dump())
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.put("/nodes/{node_id}", response_model=KnowledgeNodeOut)
def update_node(node_id: str, mastery: float | None = None, is_weak: bool | None = None,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.get(KnowledgeNode, node_id)
    if not node or node.user_id != user.id:
        raise HTTPException(404, "节点不存在")
    if mastery is not None:
        node.mastery = max(0.0, min(1.0, mastery))
    if is_weak is not None:
        node.is_weak = is_weak
    db.commit()
    db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(node_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.get(KnowledgeNode, node_id)
    if not node or node.user_id != user.id:
        raise HTTPException(404, "节点不存在")
    db.delete(node)
    db.commit()


@router.post("/relations", response_model=KnowledgeRelationOut, status_code=status.HTTP_201_CREATED)
def add_relation(payload: KnowledgeRelationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    src = db.get(KnowledgeNode, payload.source_id)
    tgt = db.get(KnowledgeNode, payload.target_id)
    if not src or not tgt or src.user_id != user.id or tgt.user_id != user.id:
        raise HTTPException(400, "节点不存在或不属于当前用户")
    rel = KnowledgeRelation(**payload.model_dump())
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return rel


@router.get("/weak", response_model=list[KnowledgeNodeOut])
def weak_nodes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(KnowledgeNode).where(KnowledgeNode.user_id == user.id, KnowledgeNode.is_weak.is_(True))
    ).all())
