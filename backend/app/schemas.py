"""Pydantic 请求/响应模型"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime


# ===== 认证 =====
class UserRegister(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    account: str  # 用户名或邮箱
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInfo"


class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    avatar: str = ""
    bio: str = ""
    total_points: int = 0
    streak_days: int = 0
    level_name: str = ""
    level_icon: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 学习计划 =====
class MilestoneCreate(BaseModel):
    title: str
    description: str = ""
    target_date: Optional[datetime] = None
    order_index: int = 0


class MilestoneOut(BaseModel):
    id: str
    title: str
    description: str = ""
    target_date: Optional[datetime] = None
    completed: bool = False
    completed_at: Optional[datetime] = None
    order_index: int = 0
    class Config:
        from_attributes = True


class PlanCreate(BaseModel):
    title: str
    description: str = ""
    target_skills: list[dict] = Field(default_factory=list)
    deadline: Optional[datetime] = None
    engines: list[str] = Field(default_factory=lambda: ["deliberate_practice", "deep_work"])
    milestones: list[MilestoneCreate] = Field(default_factory=list)


class PlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None


class PlanOut(BaseModel):
    id: str
    title: str
    description: str = ""
    status: str = "active"
    target_skills: list[dict] = Field(default_factory=list)
    deadline: Optional[datetime] = None
    engines: list[str] = Field(default_factory=list)
    milestones: list[MilestoneOut] = Field(default_factory=list)
    progress: float = 0.0
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ===== 学习会话 =====
class SessionStart(BaseModel):
    plan_id: Optional[str] = None
    engine_type: str  # deliberate_practice/sponge_reading/deep_work/knowledge_action/critical_thinking
    difficulty_level: float = 0.5


class SessionComplete(BaseModel):
    performance_score: float = Field(ge=0, le=1)
    duration_minutes: int = 0
    session_data: dict = Field(default_factory=dict)


class SessionOut(BaseModel):
    id: str
    engine_type: str
    difficulty_level: float
    performance_score: float
    duration_minutes: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ===== 刻意练习 =====
class PracticeRequest(BaseModel):
    domain: str = "general"
    difficulty: float = Field(ge=0, le=1, default=0.5)
    count: int = Field(default=5, ge=1, le=20)


class PracticeSubmit(BaseModel):
    answers: list[dict]  # [{question_id, answer, correct}]
    session_id: Optional[str] = None


# ===== 海绵阅读法 =====
class ReadingNoteCreate(BaseModel):
    book_title: str
    author: str = ""
    layer: str  # fragments/chapter/book
    content: str
    chapter_info: str = ""


class ReadingNoteOut(BaseModel):
    id: str
    book_title: str
    author: str = ""
    layer: str
    content: str
    chapter_info: str = ""
    created_at: datetime
    class Config:
        from_attributes = True


class ReadingReportRequest(BaseModel):
    book_title: str


# ===== 知识图谱 =====
class KnowledgeNodeCreate(BaseModel):
    concept: str
    description: str = ""
    category: str = "general"
    mastery_level: float = Field(ge=0, le=1, default=0.0)
    source: str = ""


class KnowledgeRelationCreate(BaseModel):
    source_id: str
    target_id: str
    relation_type: str = "related"
    strength: float = 0.5


class KnowledgeNodeOut(BaseModel):
    id: str
    concept: str
    description: str = ""
    category: str = "general"
    mastery_level: float = 0.0
    source: str = ""
    created_at: datetime
    class Config:
        from_attributes = True


class KnowledgeGraphOut(BaseModel):
    nodes: list[dict]
    edges: list[dict]


# ===== 深度工作 =====
class FocusStart(BaseModel):
    task_name: str = ""
    work_type: str = "deep"  # deep/shallow
    strategy: str = "rhythmic"  # monastic/bimodal/rhythmic/journalistic
    planned_minutes: int = 25


class FocusComplete(BaseModel):
    actual_minutes: int = 0
    distraction_count: int = 0


class FocusSessionOut(BaseModel):
    id: str
    task_name: str
    work_type: str
    strategy: str
    planned_minutes: int
    actual_minutes: int
    distraction_count: int
    completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ===== 知行转化 =====
class ActionItemCreate(BaseModel):
    description: str
    knowledge_node_id: Optional[str] = None
    due_date: Optional[datetime] = None


class ActionItemOut(BaseModel):
    id: str
    description: str
    status: str
    due_date: Optional[datetime] = None
    review_dates: list[str] = Field(default_factory=list)
    created_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True


class FeynmanRequest(BaseModel):
    topic: str
    explanation: str


# ===== 批判性思维 =====
class CriticalAnalysisRequest(BaseModel):
    text: str
    mode: str = "panning"  # sponging/panning


# ===== 奖励 =====
class RewardOut(BaseModel):
    id: str
    reward_type: str
    points: int
    badge_name: str = ""
    description: str = ""
    earned_at: datetime
    class Config:
        from_attributes = True


class AchievementOut(BaseModel):
    key: str
    name: str
    desc: str
    icon: str
    earned: bool = False
    earned_at: Optional[datetime] = None


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar: str = ""
    total_points: int
    level_name: str
    level_icon: str
    rank: int


# ===== Agent =====
class AgentChatRequest(BaseModel):
    message: str
    context: dict = Field(default_factory=dict)


class AgentMessageOut(BaseModel):
    id: str
    role: str
    content: str
    agent_type: str = "manager"
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    class Config:
        from_attributes = True


# ===== 分析 =====
class DashboardData(BaseModel):
    total_points: int
    level_name: str
    level_icon: str
    streak_days: int
    total_sessions: int
    total_focus_minutes: int
    total_knowledge_nodes: int
    total_plans: int
    active_plans: int
    recent_sessions: list[dict]
    weekly_data: list[dict]
    engine_distribution: list[dict]
    skill_radar: list[dict]
    today_tasks: list[dict]


# ===== 通用 =====
class MessageResponse(BaseModel):
    message: str
    data: Optional[Any] = None


TokenResponse.model_rebuild()
