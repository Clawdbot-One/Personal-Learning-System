"""ORM models for LearnFlow.

The schema implements the data layer described in the PRD: users, learning
plans/sessions, the five methodology engines (deliberate practice, sponge
reading, deep work, knowledge-action, critical thinking), the cross-discipline
reward economy (psychology / sociology / finance), social learning and the
agent conversation store.

A self-referential knowledge graph (nodes + typed relations) is modeled in the
relational DB so the platform runs without an external Neo4j dependency while
remaining graph-queryable via recursive CTEs.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .database import Base


# JSON type that works on both SQLite and PostgreSQL.
JSONType = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return uuid.uuid4().hex


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)


# ---------------------------------------------------------------------------
# Users & profile
# ---------------------------------------------------------------------------
class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(64))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    tier: Mapped[str] = mapped_column(String(16), default="free", nullable=False)  # free|pro|team|enterprise
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    preferences: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    # reward economy
    token_balance: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    reputation: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_active_date: Mapped[Optional[str]] = mapped_column(String(10))  # YYYY-MM-DD

    plans: Mapped[list["LearningPlan"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["LearningSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    knowledge_nodes: Mapped[list["KnowledgeNode"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    rewards: Mapped[list["Reward"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    achievements: Mapped[list["UserAchievement"]] = relationship(back_populates="user", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Learning plans & milestones (engine-agnostic planning layer)
# ---------------------------------------------------------------------------
class LearningPlan(TimestampMixin, Base):
    __tablename__ = "learning_plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    domain: Mapped[Optional[str]] = mapped_column(String(64))  # e.g. "Python", "英语"
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)  # active|paused|done|archived
    target_skills: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    enabled_engines: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="plans")
    milestones: Mapped[list["PlanMilestone"]] = relationship(back_populates="plan", cascade="all, delete-orphan", order_by="PlanMilestone.order_index")
    sessions: Mapped[list["LearningSession"]] = relationship(back_populates="plan")


class PlanMilestone(TimestampMixin, Base):
    __tablename__ = "plan_milestones"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    plan_id: Mapped[str] = mapped_column(ForeignKey("learning_plans.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    plan: Mapped["LearningPlan"] = relationship(back_populates="milestones")


# ---------------------------------------------------------------------------
# Learning sessions (unified log for all five engines)
# ---------------------------------------------------------------------------
class LearningSession(TimestampMixin, Base):
    __tablename__ = "learning_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_id: Mapped[Optional[str]] = mapped_column(ForeignKey("learning_plans.id", ondelete="SET NULL"), index=True)
    engine: Mapped[str] = mapped_column(String(32), nullable=False)  # deliberate_practice|sponge_reading|deep_work|knowledge_action|critical_thinking
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)  # 0..1, IRT-like
    performance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0..1
    focus_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0..1
    session_data: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    reward_granted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")
    plan: Mapped[Optional["LearningPlan"]] = relationship(back_populates="sessions")


# ---------------------------------------------------------------------------
# Knowledge graph (self-referential, graph-queryable)
# ---------------------------------------------------------------------------
class KnowledgeNode(TimestampMixin, Base):
    __tablename__ = "knowledge_nodes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    concept: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(64))
    mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0..1
    is_weak: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meta: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    source_note_id: Mapped[Optional[str]] = mapped_column(ForeignKey("reading_notes.id", ondelete="SET NULL"))

    user: Mapped["User"] = relationship(back_populates="knowledge_nodes")
    outgoing: Mapped[list["KnowledgeRelation"]] = relationship(
        foreign_keys="KnowledgeRelation.source_id", back_populates="source", cascade="all, delete-orphan"
    )
    incoming: Mapped[list["KnowledgeRelation"]] = relationship(
        foreign_keys="KnowledgeRelation.target_id", back_populates="target", cascade="all, delete-orphan"
    )


class KnowledgeRelation(Base):
    __tablename__ = "knowledge_relations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    source_id: Mapped[str] = mapped_column(ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True, nullable=False)
    target_id: Mapped[str] = mapped_column(ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True, nullable=False)
    relation_type: Mapped[str] = mapped_column(String(32), default="related", nullable=False)  # prerequisite|contains|related|applied_to
    strength: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    source: Mapped["KnowledgeNode"] = relationship(foreign_keys=[source_id], back_populates="outgoing")
    target: Mapped["KnowledgeNode"] = relationship(foreign_keys=[target_id], back_populates="incoming")


# ---------------------------------------------------------------------------
# Engine 2: Sponge reading (3-layer notes)
# ---------------------------------------------------------------------------
class ReadingBook(TimestampMixin, Base):
    __tablename__ = "reading_books"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(255))
    cover_url: Mapped[Optional[str]] = mapped_column(String(512))
    total_pages: Mapped[Optional[int]] = mapped_column(Integer)
    current_page: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="reading", nullable=False)  # reading|done|abandoned
    stage: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1..4 sponge reading stage
    notes: Mapped[list["ReadingNote"]] = relationship(back_populates="book", cascade="all, delete-orphan")


class ReadingNote(TimestampMixin, Base):
    __tablename__ = "reading_notes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    book_id: Mapped[str] = mapped_column(ForeignKey("reading_books.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    layer: Mapped[int] = mapped_column(Integer, nullable=False)  # 1=fragment, 2=chapter, 3=whole-book
    content: Mapped[str] = mapped_column(Text, nullable=False)
    page_ref: Mapped[Optional[str]] = mapped_column(String(64))
    tags: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    is_highlight: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    book: Mapped["ReadingBook"] = relationship(back_populates="notes")


# ---------------------------------------------------------------------------
# Engine 3: Deep work / focus (pomodoro + deep work strategy)
# ---------------------------------------------------------------------------
class FocusSession(TimestampMixin, Base):
    __tablename__ = "focus_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), default="pomodoro", nullable=False)  # pomodoro|deep_block
    strategy: Mapped[Optional[str]] = mapped_column(String(32))  # monastic|bimodal|rhythmic|journalistic
    plan_id: Mapped[Optional[str]] = mapped_column(ForeignKey("learning_plans.id", ondelete="SET NULL"))
    planned_minutes: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    actual_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    distraction_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    task_summary: Mapped[Optional[str]] = mapped_column(Text)
    reflection: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)  # active|completed|abandoned


# ---------------------------------------------------------------------------
# Engine 1: Deliberate practice (skill tree + items + attempts)
# ---------------------------------------------------------------------------
class SkillNode(TimestampMixin, Base):
    __tablename__ = "skill_nodes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    domain: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("skill_nodes.id", ondelete="CASCADE"))
    level: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0..1 mastery
    is_bottleneck: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    children: Mapped[list["SkillNode"]] = relationship(back_populates="parent", cascade="all, delete-orphan")
    parent: Mapped[Optional["SkillNode"]] = relationship(back_populates="children", remote_side=[id])


class PracticeItem(TimestampMixin, Base):
    __tablename__ = "practice_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    skill_node_id: Mapped[Optional[str]] = mapped_column(ForeignKey("skill_nodes.id", ondelete="SET NULL"))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    item_type: Mapped[str] = mapped_column(String(16), default="recall", nullable=False)  # recall|apply|analyze
    difficulty: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)  # 0..1
    next_review_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    review_interval_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    times_reviewed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    times_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    item_id: Mapped[str] = mapped_column(ForeignKey("practice_items.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    user_answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    quality: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # SM-2 quality 0..5
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


# ---------------------------------------------------------------------------
# Engine 5: Critical thinking (argument analysis)
# ---------------------------------------------------------------------------
class CriticalAnalysis(TimestampMixin, Base):
    __tablename__ = "critical_analyses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), default="panning", nullable=False)  # sponge|panning (淘金)
    conclusion: Mapped[Optional[str]] = mapped_column(Text)
    reasons: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    ambiguous_terms: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    assumptions: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    fallacies: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    evidence_levels: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)
    credibility_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)


# ---------------------------------------------------------------------------
# Engine 4: Knowledge-action (action plans + commitments)
# ---------------------------------------------------------------------------
class ActionPlan(TimestampMixin, Base):
    __tablename__ = "action_plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_concept: Mapped[Optional[str]] = mapped_column(String(255))
    insight: Mapped[Optional[str]] = mapped_column(Text)  # the "few & essential" distilled idea
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)  # active|done|abandoned
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    items: Mapped[list["ActionItem"]] = relationship(back_populates="plan", cascade="all, delete-orphan", order_by="ActionItem.day")


class ActionItem(TimestampMixin, Base):
    __tablename__ = "action_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    plan_id: Mapped[str] = mapped_column(ForeignKey("action_plans.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)  # day 1..7
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    done_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    plan: Mapped["ActionPlan"] = relationship(back_populates="items")


# ---------------------------------------------------------------------------
# Reward economy: psychology + sociology + finance
# ---------------------------------------------------------------------------
class Reward(Base):
    """Immutable reward ledger entry (token economy / finance dimension)."""
    __tablename__ = "rewards"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    dimension: Mapped[str] = mapped_column(String(16), nullable=False)  # psychology|social|finance
    reward_type: Mapped[str] = mapped_column(String(32), nullable=False)  # token|badge|surprise|streak|social|...
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # signed delta
    balance_after: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255))
    meta: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="rewards")


class Achievement(Base):
    """Catalog of achievable badges (sociology: identity & status)."""
    __tablename__ = "achievements"

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    dimension: Mapped[str] = mapped_column(String(16), nullable=False)
    icon: Mapped[str] = mapped_column(String(64), default="🏆")
    threshold: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    criterion: Mapped[str] = mapped_column(String(64), nullable=False)  # streak_days|focus_minutes|practice_correct|...


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (UniqueConstraint("user_id", "achievement_code", name="uq_user_achievement"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    achievement_code: Mapped[str] = mapped_column(ForeignKey("achievements.code", ondelete="CASCADE"), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="achievements")


class CommitmentContract(TimestampMixin, Base):
    """Learning futures/options: stake tokens on a goal (finance dimension)."""
    __tablename__ = "commitment_contracts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_id: Mapped[Optional[str]] = mapped_column(ForeignKey("learning_plans.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    stake: Mapped[int] = mapped_column(Integer, nullable=False)  # tokens locked
    reward: Mapped[int] = mapped_column(Integer, nullable=False)  # bonus if success
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)  # active|succeeded|failed|cancelled
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


# ---------------------------------------------------------------------------
# Social learning
# ---------------------------------------------------------------------------
class SocialGroup(TimestampMixin, Base):
    __tablename__ = "social_groups"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    leader_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(64))
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invite_code: Mapped[Optional[str]] = mapped_column(String(32), unique=True)
    members: Mapped[list["GroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_member"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    group_id: Mapped[str] = mapped_column(ForeignKey("social_groups.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), default="member", nullable=False)  # leader|member|mentor
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    group: Mapped["SocialGroup"] = relationship(back_populates="members")


class SocialConnection(Base):
    """Mentor/mentee/friend ties (sociology: belonging & social capital)."""
    __tablename__ = "social_connections"
    __table_args__ = (UniqueConstraint("user_id", "connected_user_id", "connection_type", name="uq_social_connection"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    connected_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    connection_type: Mapped[str] = mapped_column(String(16), default="friend", nullable=False)  # friend|mentor|mentee
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


# ---------------------------------------------------------------------------
# Agent conversation store
# ---------------------------------------------------------------------------
class AgentConversation(TimestampMixin, Base):
    __tablename__ = "agent_conversations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="新对话", nullable=False)
    agent_role: Mapped[str] = mapped_column(String(32), default="planner", nullable=False)  # planner|reading|practice|focus|thinking|action
    messages: Mapped[list["AgentMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan", order_by="AgentMessage.created_at")


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("agent_conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user|assistant|system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    meta: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    conversation: Mapped["AgentConversation"] = relationship(back_populates="messages")
