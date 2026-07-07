"""ORM 数据模型 — LearnFlow 全部表结构"""
import uuid
import json
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey,
    Index, UniqueConstraint, text
)
from sqlalchemy.orm import relationship

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(255), default="")
    bio = Column(Text, default="")
    preferences = Column(Text, default="{}")  # JSON
    total_points = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active_date = Column(String(10), default="")  # YYYY-MM-DD
    created_at = Column(DateTime, default=_now)

    plans = relationship("LearningPlan", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("LearningSession", back_populates="user", cascade="all, delete-orphan")
    knowledge_nodes = relationship("KnowledgeNode", back_populates="user", cascade="all, delete-orphan")
    rewards = relationship("Reward", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="user", cascade="all, delete-orphan")
    focus_sessions = relationship("FocusSession", back_populates="user", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="user", cascade="all, delete-orphan")
    reading_notes = relationship("ReadingNote", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("AgentConversation", back_populates="user", cascade="all, delete-orphan")

    def get_preferences(self) -> dict:
        return json.loads(self.preferences or "{}")

    def set_preferences(self, prefs: dict):
        self.preferences = json.dumps(prefs, ensure_ascii=False)


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    status = Column(String(20), default="active")  # active/completed/paused
    target_skills = Column(Text, default="[]")  # JSON
    deadline = Column(DateTime, nullable=True)
    engines = Column(Text, default="[]")  # JSON: 启用的引擎列表
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    user = relationship("User", back_populates="plans")
    milestones = relationship("PlanMilestone", back_populates="plan", cascade="all, delete-orphan",
                              order_by="PlanMilestone.order_index")
    sessions = relationship("LearningSession", back_populates="plan")


class PlanMilestone(Base):
    __tablename__ = "plan_milestones"

    id = Column(String(36), primary_key=True, default=_uuid)
    plan_id = Column(String(36), ForeignKey("learning_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    target_date = Column(DateTime, nullable=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    order_index = Column(Integer, default=0)

    plan = relationship("LearningPlan", back_populates="milestones")


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("learning_plans.id", ondelete="SET NULL"), nullable=True)
    engine_type = Column(String(50), nullable=False)  # deliberate_practice/sponge_reading/deep_work/knowledge_action/critical_thinking
    session_data = Column(Text, default="{}")  # JSON: 引擎特定数据
    difficulty_level = Column(Float, default=0.5)  # 0-1
    performance_score = Column(Float, default=0.0)  # 0-1
    duration_minutes = Column(Integer, default=0)
    started_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    plan = relationship("LearningPlan", back_populates="sessions")


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    concept = Column(String(200), nullable=False)
    description = Column(Text, default="")
    category = Column(String(100), default="general")
    mastery_level = Column(Float, default=0.0)  # 0-1
    source = Column(String(200), default="")  # 来源（书名/课程等）
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="knowledge_nodes")
    outgoing = relationship("KnowledgeRelation", back_populates="source_node",
                            foreign_keys="KnowledgeRelation.source_id", cascade="all, delete-orphan")
    incoming = relationship("KnowledgeRelation", back_populates="target_node",
                            foreign_keys="KnowledgeRelation.target_id", cascade="all, delete-orphan")


class KnowledgeRelation(Base):
    __tablename__ = "knowledge_relations"

    id = Column(String(36), primary_key=True, default=_uuid)
    source_id = Column(String(36), ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String(36), ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type = Column(String(50), default="related")  # prerequisite/related/extends/contradicts
    strength = Column(Float, default=0.5)  # 0-1

    source_node = relationship("KnowledgeNode", back_populates="outgoing", foreign_keys=[source_id])
    target_node = relationship("KnowledgeNode", back_populates="incoming", foreign_keys=[target_id])


class ReadingNote(Base):
    __tablename__ = "reading_notes"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_title = Column(String(300), nullable=False)
    author = Column(String(200), default="")
    layer = Column(String(20), nullable=False)  # fragments/chapter/book
    content = Column(Text, nullable=False)
    chapter_info = Column(String(200), default="")
    linked_node_id = Column(String(36), ForeignKey("knowledge_nodes.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="reading_notes")


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_type = Column(String(50), nullable=False)  # points/badge/streak/surprise
    points = Column(Integer, default=0)
    badge_name = Column(String(100), default="")
    description = Column(Text, default="")
    meta = Column("metadata", Text, default="{}")  # JSON
    earned_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="rewards")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_key = Column(String(50), nullable=False)
    earned_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="achievements")
    __table_args__ = (UniqueConstraint("user_id", "achievement_key", name="uq_user_achievement"),)


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_name = Column(String(200), default="")
    work_type = Column(String(20), default="deep")  # deep/shallow
    strategy = Column(String(30), default="rhythmic")  # monastic/bimodal/rhythmic/journalistic
    planned_minutes = Column(Integer, default=25)
    actual_minutes = Column(Integer, default=0)
    distraction_count = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    started_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="focus_sessions")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    knowledge_node_id = Column(String(36), ForeignKey("knowledge_nodes.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending/in_progress/completed
    due_date = Column(DateTime, nullable=True)
    review_dates = Column(Text, default="[]")  # JSON: 间隔复习日期
    created_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="action_items")


class AgentConversation(Base):
    __tablename__ = "agent_conversations"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user/assistant
    content = Column(Text, nullable=False)
    agent_type = Column(String(50), default="manager")  # manager/reading_tutor/practice_tutor/etc
    meta = Column("metadata", Text, default="{}")  # JSON
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="conversations")
