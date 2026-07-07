// LearnFlow 类型定义 — 与后端 schemas.py 对应

// ===== 认证 =====
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  total_points: number;
  streak_days: number;
  level_name: string;
  level_icon: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export interface UserRegister {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  account: string;
  password: string;
}

// ===== 学习计划 =====
export interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  order_index: number;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  status: string;
  target_skills: Record<string, unknown>[];
  deadline: string | null;
  engines: string[];
  milestones: Milestone[];
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface PlanCreate {
  title: string;
  description: string;
  target_skills?: Record<string, unknown>[];
  deadline?: string | null;
  engines?: string[];
  milestones?: { title: string; description?: string; target_date?: string | null; order_index?: number }[];
}

// ===== 学习会话 =====
export interface LearningSession {
  id: string;
  engine_type: string;
  difficulty_level: number;
  performance_score: number;
  duration_minutes: number;
  started_at: string;
  completed_at: string | null;
}

// ===== 刻意练习 =====
export interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: number;
  domain: string;
}

export interface PracticeResult {
  questions: PracticeQuestion[];
  session_id?: string;
}

// ===== 海绵阅读法 =====
export interface ReadingNote {
  id: string;
  book_title: string;
  author: string;
  layer: string;
  content: string;
  chapter_info: string;
  created_at: string;
}

// ===== 知识图谱 =====
export interface KnowledgeNode {
  id: string;
  concept: string;
  description: string;
  category: string;
  mastery_level: number;
  source: string;
  created_at: string;
}

export interface KnowledgeEdge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  strength: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// ===== 深度工作 =====
export interface FocusSession {
  id: string;
  task_name: string;
  work_type: string;
  strategy: string;
  planned_minutes: number;
  actual_minutes: number;
  distraction_count: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

// ===== 知行转化 =====
export interface ActionItem {
  id: string;
  description: string;
  status: string;
  due_date: string | null;
  review_dates: string[];
  created_at: string;
  completed_at: string | null;
}

// ===== 奖励 =====
export interface Reward {
  id: string;
  reward_type: string;
  points: number;
  badge_name: string;
  description: string;
  earned_at: string;
}

export interface Achievement {
  key: string;
  name: string;
  desc: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar: string;
  total_points: number;
  level_name: string;
  level_icon: string;
  rank: number;
}

// ===== Agent =====
export interface AgentMessage {
  id: string;
  role: string;
  content: string;
  agent_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentChatResponse {
  id: string;
  content: string;
  agent_type: string;
  suggestions: string[];
  intent: string;
  created_at: string;
}

// ===== 仪表盘 =====
export interface DashboardData {
  total_points: number;
  level_name: string;
  level_icon: string;
  streak_days: number;
  total_sessions: number;
  total_focus_minutes: number;
  total_knowledge_nodes: number;
  total_plans: number;
  active_plans: number;
  recent_sessions: Record<string, unknown>[];
  weekly_data: { date: string; minutes: number; sessions: number }[];
  engine_distribution: Record<string, unknown>[];
  skill_radar: Record<string, unknown>[];
  today_tasks: Record<string, unknown>[];
}

// ===== 通用 =====
export interface MessageResponse<T = unknown> {
  message: string;
  data?: T;
}

// 引擎类型
export type EngineType =
  | "deliberate_practice"
  | "sponge_reading"
  | "deep_work"
  | "knowledge_action"
  | "critical_thinking";

// 阅读笔记层级
export type ReadingLayer = "fragments" | "chapter" | "book";
