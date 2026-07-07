"""知识图谱路由 — 节点与关系管理"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User, KnowledgeNode, KnowledgeRelation
from ..schemas import KnowledgeNodeCreate, KnowledgeNodeOut, KnowledgeRelationCreate, KnowledgeGraphOut
from ..auth import get_current_user, update_streak
from ..reward_service import award_reward

router = APIRouter(prefix="/api/v1/knowledge", tags=["知识图谱"])


@router.get("/graph")
def get_graph(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nodes = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id).all()
    node_ids = {n.id for n in nodes}
    relations = db.query(KnowledgeRelation).filter(
        KnowledgeRelation.source_id.in_(node_ids)
    ).all()

    return {
        "nodes": [{
            "id": n.id,
            "concept": n.concept,
            "description": n.description,
            "category": n.category,
            "mastery_level": n.mastery_level,
            "source": n.source,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in nodes],
        "edges": [{
            "id": r.id,
            "source_id": r.source_id,
            "target_id": r.target_id,
            "relation_type": r.relation_type,
            "strength": r.strength,
        } for r in relations],
    }


@router.post("/nodes", response_model=KnowledgeNodeOut)
def create_node(data: KnowledgeNodeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)
    node = KnowledgeNode(
        user_id=user.id,
        concept=data.concept,
        description=data.description,
        category=data.category,
        mastery_level=data.mastery_level,
        source=data.source,
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    award_reward(db, user, "knowledge_node", f"创建知识节点：{data.concept}")
    return KnowledgeNodeOut.model_validate(node)


@router.get("/nodes", response_model=list[KnowledgeNodeOut])
def list_nodes(category: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id)
    if category:
        query = query.filter(KnowledgeNode.category == category)
    nodes = query.order_by(KnowledgeNode.created_at.desc()).all()
    return [KnowledgeNodeOut.model_validate(n) for n in nodes]


@router.put("/nodes/{node_id}", response_model=KnowledgeNodeOut)
def update_node(node_id: str, data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id, KnowledgeNode.user_id == user.id).first()
    if not node:
        raise HTTPException(status_code=404, detail="节点不存在")
    if "concept" in data:
        node.concept = data["concept"]
    if "description" in data:
        node.description = data["description"]
    if "category" in data:
        node.category = data["category"]
    if "mastery_level" in data:
        node.mastery_level = data["mastery_level"]
    if "source" in data:
        node.source = data["source"]
    db.commit()
    db.refresh(node)
    return KnowledgeNodeOut.model_validate(node)


@router.delete("/nodes/{node_id}")
def delete_node(node_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id, KnowledgeNode.user_id == user.id).first()
    if not node:
        raise HTTPException(status_code=404, detail="节点不存在")
    db.delete(node)
    db.commit()
    return {"message": "节点已删除"}


@router.post("/relations")
def create_relation(data: KnowledgeRelationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 验证节点属于用户
    for nid in [data.source_id, data.target_id]:
        node = db.query(KnowledgeNode).filter(KnowledgeNode.id == nid, KnowledgeNode.user_id == user.id).first()
        if not node:
            raise HTTPException(status_code=404, detail=f"节点{nid}不存在")

    relation = KnowledgeRelation(
        source_id=data.source_id,
        target_id=data.target_id,
        relation_type=data.relation_type,
        strength=data.strength,
    )
    db.add(relation)
    db.commit()
    db.refresh(relation)
    return {"id": relation.id, "message": "关系已创建"}


@router.get("/categories")
def get_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nodes = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id).all()
    categories = list({n.category for n in nodes})
    return categories
