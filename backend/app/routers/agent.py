"""AI Agent chat routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..agent.manager import AgentManager
from ..agent.rule_engine import ROLE_PROFILES
from ..database import get_db
from ..deps import get_current_user
from ..models import AgentConversation, User
from ..schemas import AgentChatIn, AgentChatOut, ConversationOut

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/roles")
def list_roles():
    return [{"role": k, **v} for k, v in ROLE_PROFILES.items()]


@router.post("/chat", response_model=AgentChatOut)
async def chat(payload: AgentChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = await AgentManager.chat(
        db, user, payload.message,
        role=payload.role,
        conversation_id=payload.conversation_id,
        extra_context=payload.context,
    )
    db.commit()
    return AgentChatOut(**result)


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convs = db.scalars(
        select(AgentConversation).where(AgentConversation.user_id == user.id).order_by(AgentConversation.updated_at.desc())
    ).all()
    out = []
    for c in convs:
        out.append(ConversationOut(
            id=c.id, title=c.title, agent_role=c.agent_role,
            created_at=c.created_at, messages=c.messages,
        ))
    return out


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.get(AgentConversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(404, "对话不存在")
    return ConversationOut(
        id=conv.id, title=conv.title, agent_role=conv.agent_role,
        created_at=conv.created_at, messages=conv.messages,
    )
