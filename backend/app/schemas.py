"""Pydantic v2 schemas (request/response models) for the LearnFlow API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


def _orm() -> ConfigDict:
    return ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Auth & user
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str  # accepts username or email
    password: str


class UserOut(BaseModel):
    model_config = _orm()
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    tier: str
    preferences: dict[str, Any] = {}
    token_balance: int
    reputation: int
    streak_days: int
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Learning plans
# ---------------------------------------------------------------------------
class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0
    target_date: Optional[datetime] = None


class MilestoneOut(BaseModel):
    model_config = _orm()
    id: str
    title: str
    description: Optional[str] = None
    order_index: int
    target_date: Optional[datetime] = None
    is_completed: bool
    completed_at: Optional[datetime] = None


class PlanCreate(BaseModel):
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    target_skills: list[dict[str, Any]] = []
    enabled_engines: list[str] = []
    deadline: Optional[datetime] = None


class PlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    target_skills: Optional[list[dict[str, Any]]] = None
    enabled_engines: Optional[list[str]] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    progress: Optional[float] = None


class PlanOut(BaseModel):
    model_config = _orm()
    id: str
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    status: str
    target_skills: list[dict[str, Any]] = []
    enabled_engines: list[str] = []
    deadline: Optional[datetime] = None
    progress: float
    milestones: list[MilestoneOut] = []
    created_at: datetime


# ---------------------------------------------------------------------------
# Learning sessions
# ---------------------------------------------------------------------------
class SessionCreate(BaseModel):
    plan_id: Optional[str] = None
    engine: str
    difficulty: float = 0.5


class SessionComplete(BaseModel):
    duration_minutes: int
    performance: float = 0.0
    focus_score: float = 0.0
    difficulty: Optional[float] = None
    session_data: dict[str, Any] = {}


class SessionOut(BaseModel):
    model_config = _orm()
    id: str
    plan_id: Optional[str] = None
    engine: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: int
    difficulty: float
    performance: float
    focus_score: float
    session_data: dict[str, Any] = {}
    reward_granted: int


# ---------------------------------------------------------------------------
# Knowledge graph
# ---------------------------------------------------------------------------
class KnowledgeNodeCreate(BaseModel):
    concept: str
    description: Optional[str] = None
    category: Optional[str] = None
    mastery: float = 0.0
    is_weak: bool = False
    meta: dict[str, Any] = {}


class KnowledgeRelationCreate(BaseModel):
    source_id: str
    target_id: str
    relation_type: str = "related"
    strength: float = 1.0


class KnowledgeNodeOut(BaseModel):
    model_config = _orm()
    id: str
    concept: str
    description: Optional[str] = None
    category: Optional[str] = None
    mastery: float
    is_weak: bool
    meta: dict[str, Any] = {}


class KnowledgeRelationOut(BaseModel):
    model_config = _orm()
    id: str
    source_id: str
    target_id: str
    relation_type: str
    strength: float


class KnowledgeGraphOut(BaseModel):
    nodes: list[KnowledgeNodeOut]
    edges: list[KnowledgeRelationOut]


# ---------------------------------------------------------------------------
# Sponge reading
# ---------------------------------------------------------------------------
class BookCreate(BaseModel):
    title: str
    author: Optional[str] = None
    total_pages: Optional[int] = None


class BookOut(BaseModel):
    model_config = _orm()
    id: str
    title: str
    author: Optional[str] = None
    cover_url: Optional[str] = None
    total_pages: Optional[int] = None
    current_page: int
    status: str
    stage: int


class NoteCreate(BaseModel):
    book_id: str
    layer: int = Field(1, ge=1, le=3)
    content: str
    page_ref: Optional[str] = None
    tags: list[str] = []
    is_highlight: bool = False


class NoteOut(BaseModel):
    model_config = _orm()
    id: str
    book_id: str
    layer: int
    content: str
    page_ref: Optional[str] = None
    tags: list[str] = []
    is_highlight: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Deep work / focus
# ---------------------------------------------------------------------------
class FocusStart(BaseModel):
    mode: str = "pomodoro"  # pomodoro|deep_block
    strategy: Optional[str] = None  # monastic|bimodal|rhythmic|journalistic
    plan_id: Optional[str] = None
    planned_minutes: int = 25
    task_summary: Optional[str] = None


class FocusComplete(BaseModel):
    actual_minutes: int
    distraction_count: int = 0
    reflection: Optional[str] = None


class FocusSessionOut(BaseModel):
    model_config = _orm()
    id: str
    mode: str
    strategy: Optional[str] = None
    plan_id: Optional[str] = None
    planned_minutes: int
    actual_minutes: int
    distraction_count: int
    task_summary: Optional[str] = None
    reflection: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str


# ---------------------------------------------------------------------------
# Deliberate practice
# ---------------------------------------------------------------------------
class SkillNodeCreate(BaseModel):
    domain: str
    name: str
    parent_id: Optional[str] = None
    level: float = 0.0
    order_index: int = 0


class SkillNodeOut(BaseModel):
    model_config = _orm()
    id: str
    domain: str
    name: str
    parent_id: Optional[str] = None
    level: float
    is_bottleneck: bool
    order_index: int


class PracticeItemCreate(BaseModel):
    skill_node_id: Optional[str] = None
    question: str
    answer: str
    item_type: str = "recall"
    difficulty: float = 0.5


class PracticeItemOut(BaseModel):
    model_config = _orm()
    id: str
    skill_node_id: Optional[str] = None
    question: str
    answer: str
    item_type: str
    difficulty: float
    next_review_at: datetime
    review_interval_days: int
    ease_factor: float
    times_reviewed: int
    times_correct: int


class PracticeAttemptIn(BaseModel):
    item_id: str
    user_answer: str
    self_rating: int = Field(3, ge=0, le=5)  # SM-2 quality


class PracticeAttemptOut(BaseModel):
    id: str
    item_id: str
    is_correct: bool
    quality: int
    feedback: Optional[str] = None
    next_review_at: datetime
    new_difficulty: float
    tokens_earned: int


# ---------------------------------------------------------------------------
# Critical thinking
# ---------------------------------------------------------------------------
class CriticalAnalyzeIn(BaseModel):
    source_text: str
    mode: str = "panning"  # sponge|panning


class CriticalAnalysisOut(BaseModel):
    model_config = _orm()
    id: str
    source_text: str
    mode: str
    conclusion: Optional[str] = None
    reasons: list[Any] = []
    ambiguous_terms: list[Any] = []
    assumptions: list[Any] = []
    fallacies: list[Any] = []
    evidence_levels: list[Any] = []
    credibility_score: float
    created_at: datetime


# ---------------------------------------------------------------------------
# Knowledge-action
# ---------------------------------------------------------------------------
class ActionPlanCreate(BaseModel):
    title: str
    source_concept: Optional[str] = None
    insight: Optional[str] = None


class ActionItemOut(BaseModel):
    model_config = _orm()
    id: str
    day: int
    content: str
    is_done: bool
    done_at: Optional[datetime] = None


class ActionPlanOut(BaseModel):
    model_config = _orm()
    id: str
    title: str
    source_concept: Optional[str] = None
    insight: Optional[str] = None
    status: str
    progress: float
    items: list[ActionItemOut] = []


class ActionItemToggle(BaseModel):
    is_done: bool


# ---------------------------------------------------------------------------
# Rewards & achievements
# ---------------------------------------------------------------------------
class RewardOut(BaseModel):
    model_config = _orm()
    id: str
    dimension: str
    reward_type: str
    points: int
    balance_after: int
    reason: Optional[str] = None
    meta: dict[str, Any] = {}
    earned_at: datetime


class AchievementOut(BaseModel):
    model_config = _orm()
    code: str
    name: str
    description: str
    dimension: str
    icon: str
    threshold: int
    criterion: str


class UserAchievementOut(BaseModel):
    model_config = _orm()
    achievement_code: str
    name: str
    icon: str
    dimension: str
    earned_at: datetime


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    token_balance: int
    reputation: int
    streak_days: int
    rank: int


class CommitmentCreate(BaseModel):
    plan_id: Optional[str] = None
    title: str
    stake: int = Field(gt=0)
    reward: int = Field(gt=0)
    deadline: datetime


class CommitmentOut(BaseModel):
    model_config = _orm()
    id: str
    plan_id: Optional[str] = None
    title: str
    stake: int
    reward: int
    deadline: datetime
    status: str
    settled_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Social
# ---------------------------------------------------------------------------
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_private: bool = False


class GroupOut(BaseModel):
    model_config = _orm()
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_private: bool
    invite_code: Optional[str] = None
    member_count: int = 0


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------
class AgentChatIn(BaseModel):
    message: str
    role: str = "planner"  # planner|reading|practice|focus|thinking|action
    conversation_id: Optional[str] = None
    context: dict[str, Any] = {}


class AgentChatOut(BaseModel):
    conversation_id: str
    role: str
    content: str
    backend: str  # rule|llm|hermes|openclaw|hiclaw
    meta: dict[str, Any] = {}


class AgentMessageOut(BaseModel):
    model_config = _orm()
    id: str
    role: str
    content: str
    meta: dict[str, Any] = {}
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = _orm()
    id: str
    title: str
    agent_role: str
    created_at: datetime
    messages: list[AgentMessageOut] = []


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
class DashboardOut(BaseModel):
    user: UserOut
    today_focus_minutes: int
    today_practice_count: int
    active_plans: int
    total_focus_minutes: int
    total_practice_count: int
    knowledge_node_count: int
    streak_days: int
    token_balance: int
    weekly_focus: list[dict[str, Any]]
    engine_distribution: list[dict[str, Any]]
    recent_sessions: list[SessionOut]
    achievements: list[UserAchievementOut]
    upcoming_reviews: list[PracticeItemOut]
