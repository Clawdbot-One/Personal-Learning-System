"""Agent manager — routes messages, selects backend, persists conversations.

Implements the Manager-Workers pattern from the PRD: the manager builds a
learner context, dispatches to the right specialist role, and chooses the best
available backend (LLM when configured, deterministic rule engine otherwise).
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..engines.deliberate_practice import DeliberatePracticeEngine
from ..engines.knowledge_action import KnowledgeActionEngine
from ..engines.sponge_reading import SpongeReadingEngine
from ..models import (
    ActionItem,
    AgentConversation,
    AgentMessage,
    FocusSession,
    KnowledgeNode,
    LearningPlan,
    PracticeItem,
    ReadingNote,
    User,
)
from .llm_adapter import LLMAdapter
from .rule_engine import ROLE_PROFILES, RuleAgent

logger = logging.getLogger(__name__)


class AgentManager:
    @staticmethod
    def build_context(db: Session, user: User) -> dict[str, Any]:
        """Assemble a learner profile snapshot for personalised responses."""
        active_plans = db.scalar(
            select(func.count(LearningPlan.id)).where(LearningPlan.user_id == user.id, LearningPlan.status == "active")
        ) or 0
        theta = DeliberatePracticeEngine.estimate_user_theta(db, user.id)
        stage_info = SpongeReadingEngine.diagnose_stage(db, user.id)
        gap = KnowledgeActionEngine.knowing_doing_gap(db, user.id)
        return {
            "active_plans": active_plans,
            "streak_days": user.streak_days,
            "user_theta": round(theta, 2),
            "reading_stage": stage_info.get("stage_name", "入门"),
            "gap_ratio": gap.get("gap_ratio", 0.0),
            "vocation": user.preferences.get("vocation"),
            "token_balance": user.token_balance,
        }

    @staticmethod
    def _context_to_text(ctx: dict[str, Any]) -> str:
        lines = [
            f"- 进行中计划：{ctx.get('active_plans', 0)} 个",
            f"- 连续学习：{ctx.get('streak_days', 0)} 天",
            f"- 能力估计 θ：{ctx.get('user_theta', 0)}",
            f"- 阅读阶段：{ctx.get('reading_stage', '入门')}",
            f"- 知行断裂度：{ctx.get('gap_ratio', 0):.0%}",
            f"- 积分余额：{ctx.get('token_balance', 0)}",
        ]
        if ctx.get("vocation"):
            lines.append(f"- 职业/方向：{ctx['vocation']}")
        return "\n".join(lines)

    @staticmethod
    def select_backend() -> str:
        """Resolve the effective backend given configuration."""
        cfg = settings.agent_backend
        if cfg in ("hermes", "openclaw", "hiclaw", "llm"):
            return cfg if LLMAdapter.is_available() else "rule"
        # auto
        return "llm" if LLMAdapter.is_available() else "rule"

    @staticmethod
    async def chat(
        db: Session,
        user: User,
        message: str,
        role: str = "planner",
        conversation_id: Optional[str] = None,
        extra_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Run one turn. Returns dict with conversation_id, role, content, backend, metadata."""
        role = role if role in ROLE_PROFILES else "planner"

        # load or create conversation
        conv: Optional[AgentConversation] = None
        if conversation_id:
            conv = db.get(AgentConversation, conversation_id)
            if conv and conv.user_id != user.id:
                conv = None
        if conv is None:
            conv = AgentConversation(
                user_id=user.id,
                title=message[:40] or "新对话",
                agent_role=role,
            )
            db.add(conv)
            db.flush()

        # persist user message
        db.add(AgentMessage(conversation_id=conv.id, role="user", content=message))

        ctx = AgentManager.build_context(db, user)
        if extra_context:
            ctx.update(extra_context)

        backend = AgentManager.select_backend()
        content = ""
        msg_meta: dict[str, Any] = {"role_profile": ROLE_PROFILES[role]}

        if backend != "rule":
            try:
                history = [
                    {"role": m.role, "content": m.content}
                    for m in conv.messages[-10:]
                ]
                content, llm_meta = await LLMAdapter.chat(
                    role, message, history=history, context=AgentManager._context_to_text(ctx)
                )
                msg_meta.update(llm_meta)
            except Exception as exc:  # graceful degradation
                logger.warning("LLM backend failed (%s); falling back to rule engine.", exc)
                backend = "rule"
                content = RuleAgent.respond(role, message, ctx)
                msg_meta["fallback_reason"] = str(exc)
        else:
            content = RuleAgent.respond(role, message, ctx)

        # persist assistant message
        db.add(AgentMessage(conversation_id=conv.id, role="assistant", content=content, meta=msg_meta))
        db.flush()

        return {
            "conversation_id": conv.id,
            "role": role,
            "content": content,
            "backend": backend,
            "meta": msg_meta,
        }
