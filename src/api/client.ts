// LearnFlow API 客户端
import type {
  TokenResponse, UserRegister, UserLogin, UserInfo,
  Plan, PlanCreate,
  LearningSession, PracticeResult, PracticeQuestion,
  ReadingNote,
  KnowledgeNode, KnowledgeGraph,
  FocusSession,
  ActionItem,
  Reward, Achievement, LeaderboardEntry,
  AgentMessage, AgentChatResponse,
  DashboardData, MessageResponse,
} from "@/types";

const BASE_URL = "/api/v1";

class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function getToken(): string | null {
  return localStorage.getItem("lf_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `请求失败 (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {
      // 非 JSON 错误
    }
    if (res.status === 401) {
      localStorage.removeItem("lf_token");
      localStorage.removeItem("lf_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ===== 认证 =====
export const authApi = {
  register: (data: UserRegister) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: UserLogin) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<UserInfo>("/auth/me"),
};

// ===== 学习计划 =====
export const plansApi = {
  list: () => request<Plan[]>("/plans"),
  get: (id: string) => request<Plan>(`/plans/${id}`),
  create: (data: PlanCreate) =>
    request<Plan>("/plans", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PlanCreate> & { status?: string }) =>
    request<Plan>(`/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<MessageResponse>(`/plans/${id}`, { method: "DELETE" }),
  completeMilestone: (planId: string, milestoneId: string) =>
    request<MessageResponse>(`/plans/${planId}/milestones/${milestoneId}/complete`, { method: "POST" }),
};

// ===== 学习引擎 =====
export const learningApi = {
  // 学习会话
  startSession: (data: { plan_id?: string; engine_type: string; difficulty_level?: number }) =>
    request<LearningSession>("/learning/sessions", { method: "POST", body: JSON.stringify(data) }),
  completeSession: (id: string, data: { performance_score: number; duration_minutes: number; session_data?: Record<string, unknown> }) =>
    request<MessageResponse>(`/learning/sessions/${id}/complete`, { method: "POST", body: JSON.stringify(data) }),

  // 刻意练习
  practice: (data: { domain?: string; difficulty?: number; count?: number }) =>
    request<PracticeResult>("/learning/practice", { method: "POST", body: JSON.stringify(data) }),
  submitPractice: (data: { answers: { question_id: string; answer: number; correct: boolean }[]; session_id?: string }) =>
    request<MessageResponse & { score?: number; adjusted_difficulty?: number }>("/learning/practice/submit", { method: "POST", body: JSON.stringify(data) }),
  skillTree: (domain: string) =>
    request<Record<string, unknown>>(`/learning/skill-tree/${domain}`),
  learningZone: () =>
    request<Record<string, unknown>>("/learning/learning-zone"),

  // 海绵阅读法
  createNote: (data: { book_title: string; author?: string; layer: string; content: string; chapter_info?: string }) =>
    request<ReadingNote>("/reading/notes", { method: "POST", body: JSON.stringify(data) }),
  listNotes: (book_title?: string) =>
    request<ReadingNote[]>(`/reading/notes${book_title ? `?book_title=${encodeURIComponent(book_title)}` : ""}`),
  readingReport: (book_title: string) =>
    request<Record<string, unknown>>("/reading/report", { method: "POST", body: JSON.stringify({ book_title }) }),
  readingAbilities: () =>
    request<Record<string, unknown>>("/reading/abilities"),
  noteGuide: (layer: string) =>
    request<Record<string, unknown>>(`/reading/note-guide/${layer}`),

  // 深度工作
  startFocus: (data: { task_name?: string; work_type?: string; strategy?: string; planned_minutes?: number }) =>
    request<FocusSession>("/focus/start", { method: "POST", body: JSON.stringify(data) }),
  completeFocus: (id: string, data: { actual_minutes?: number; distraction_count?: number }) =>
    request<MessageResponse>(`/focus/${id}/complete`, { method: "POST", body: JSON.stringify(data) }),
  focusStats: () => request<Record<string, unknown>>("/focus/stats"),
  focusStrategies: () => request<Record<string, unknown>>("/focus/strategies"),
  strategyRecommendation: () => request<Record<string, unknown>>("/focus/strategy-recommendation"),
  focusRitual: () => request<Record<string, unknown>>("/focus/ritual"),
  focusSessions: () => request<FocusSession[]>("/focus/sessions"),

  // 知行转化
  createAction: (data: { description: string; knowledge_node_id?: string; due_date?: string | null }) =>
    request<ActionItem>("/action/items", { method: "POST", body: JSON.stringify(data) }),
  listActions: () => request<ActionItem[]>("/action/items"),
  completeAction: (id: string) =>
    request<MessageResponse>(`/action/items/${id}/complete`, { method: "POST" }),
  feynman: (data: { topic: string; explanation: string }) =>
    request<Record<string, unknown>>("/action/feynman", { method: "POST", body: JSON.stringify(data) }),
  greenLight: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/action/green-light", { method: "POST", body: JSON.stringify(data) }),
  actionPlan: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/action/plan", { method: "POST", body: JSON.stringify(data) }),
  diagnose: () => request<Record<string, unknown>>("/action/diagnose"),

  // 批判性思维
  criticalAnalyze: (data: { text: string; mode?: string }) =>
    request<Record<string, unknown>>("/critical/analyze", { method: "POST", body: JSON.stringify(data) }),
  fallacies: () => request<Record<string, unknown>>("/critical/fallacies"),
  criticalQuestions: () => request<Record<string, unknown>>("/critical/questions"),
  criticalSteps: () => request<Record<string, unknown>>("/critical/steps"),
};

// ===== 知识图谱 =====
export const knowledgeApi = {
  nodes: () => request<KnowledgeNode[]>("/knowledge/nodes"),
  createNode: (data: { concept: string; description?: string; category?: string; mastery_level?: number; source?: string }) =>
    request<KnowledgeNode>("/knowledge/nodes", { method: "POST", body: JSON.stringify(data) }),
  updateNode: (id: string, data: Partial<{ concept: string; description: string; category: string; mastery_level: number; source: string }>) =>
    request<KnowledgeNode>(`/knowledge/nodes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteNode: (id: string) =>
    request<MessageResponse>(`/knowledge/nodes/${id}`, { method: "DELETE" }),
  graph: () => request<KnowledgeGraph>("/knowledge/graph"),
  createRelation: (data: { source_id: string; target_id: string; relation_type?: string; strength?: number }) =>
    request<MessageResponse>("/knowledge/relations", { method: "POST", body: JSON.stringify(data) }),
  categories: () => request<string[]>("/knowledge/categories"),
};

// ===== 奖励 =====
export const rewardsApi = {
  balance: () => request<{ total_points: number; level_name: string; level_icon: string; streak_days: number }>("/rewards/balance"),
  history: (limit = 20) => request<Reward[]>(`/rewards/history?limit=${limit}`),
  achievements: () => request<Achievement[]>("/rewards/achievements"),
  leaderboard: () => request<LeaderboardEntry[]>("/rewards/leaderboard"),
};

// ===== Agent =====
export const agentApi = {
  chat: (message: string, context: Record<string, unknown> = {}) =>
    request<AgentChatResponse>("/agent/chat", { method: "POST", body: JSON.stringify({ message, context }) }),
  history: (limit = 50) => request<AgentMessage[]>(`/agent/history?limit=${limit}`),
  clear: () => request<MessageResponse>("/agent/history", { method: "DELETE" }),
};

// ===== 分析 =====
export const analyticsApi = {
  dashboard: () => request<DashboardData>("/analytics/dashboard"),
};

export { ApiError };
