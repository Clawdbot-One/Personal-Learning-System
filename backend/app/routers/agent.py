"""Agent路由 — 对话与历史"""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AgentConversation
from ..schemas import AgentChatRequest, AgentMessageOut
from ..auth import get_current_user, update_streak
from ..agent.manager import manager_agent

router = APIRouter(prefix="/api/v1/agent", tags=["AI Agent"])


@router.post("/chat")
def chat(data: AgentChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)

    # 保存用户消息
    user_msg = AgentConversation(
        user_id=user.id,
        role="user",
        content=data.message,
        agent_type="user",
        meta=json.dumps(data.context, ensure_ascii=False),
    )
    db.add(user_msg)

    # Manager Agent 处理
    response = manager_agent.handle_message(data.message, user, db, data.context)

    # 保存Agent回复
    agent_msg = AgentConversation(
        user_id=user.id,
        role="assistant",
        content=response.get("content", ""),
        agent_type=response.get("agent_type", "manager"),
        meta=json.dumps({
            "suggestions": response.get("suggestions", []),
            "intent": response.get("intent", ""),
        }, ensure_ascii=False),
    )
    db.add(agent_msg)
    db.commit()

    return {
        "id": agent_msg.id,
        "content": response.get("content", ""),
        "agent_type": response.get("agent_type", "manager"),
        "suggestions": response.get("suggestions", []),
        "intent": response.get("intent", ""),
        "created_at": agent_msg.created_at,
    }


@router.get("/history", response_model=list[AgentMessageOut])
def get_history(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convs = db.query(AgentConversation).filter(AgentConversation.user_id == user.id).order_by(AgentConversation.created_at.desc()).limit(limit).all()
    # 反转为时间正序
    convs.reverse()
    result = []
    for c in convs:
        meta = json.loads(c.meta or "{}")
        result.append(AgentMessageOut(
            id=c.id,
            role=c.role,
            content=c.content,
            agent_type=c.agent_type,
            metadata=meta,
            created_at=c.created_at,
        ))
    return result


@router.delete("/history")
def clear_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(AgentConversation).filter(AgentConversation.user_id == user.id).delete()
    db.commit()
    return {"message": "对话历史已清空"}
