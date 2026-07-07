/**
 * LearnFlow API 客户端
 * 封装所有后端接口调用，自动携带 JWT 令牌
 */
import type {
  User, LearningPlan, LearningSession, KnowledgeGraph, KnowledgeNode,
  Achievement, AgentMessage, DashboardData, RewardInfo, Milestone,
} from './types'

const TOKEN_KEY = 'learnflow_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
  reward?: RewardInfo
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })
  const json: ApiResult<T> = await res.json()

  if (!res.ok || !json.success) {
    throw new Error(json.error || `请求失败 (${res.status})`)
  }
  return json.data as T
}

/** 带奖励信息的请求 */
async function requestWithReward<T>(path: string, options: RequestInit = {}): Promise<{ data: T; reward?: RewardInfo }> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })
  const json: ApiResult<T> = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || `请求失败 (${res.status})`)
  }
  return { data: json.data as T, reward: json.reward }
}

// ============ 认证 API ============
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { account: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<User>('/auth/me'),

  updateProfile: (data: { avatar?: string; bio?: string; preferences?: Record<string, unknown> }) =>
    request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
}

// ============ 学习计划 API ============
export const plansApi = {
  list: () => request<LearningPlan[]>('/plans'),
  get: (id: string) => request<LearningPlan>(`/plans/${id}`),
  create: (data: { title: string; description?: string; category?: string; target_skills?: { name: string; level?: string }[]; engines?: string[]; deadline?: string }) =>
    request<LearningPlan>('/plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<LearningPlan>) =>
    request<LearningPlan>(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ id: string }>(`/plans/${id}`, { method: 'DELETE' }),
  toggleMilestone: (planId: string, milestoneId: string, status: string) =>
    request<LearningPlan>(`/plans/${planId}/milestones/${milestoneId}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  addMilestone: (planId: string, data: { title: string; description?: string }) =>
    request<Milestone>(`/plans/${planId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
}

// ============ 学习会话 API ============
export const sessionsApi = {
  list: (engineType?: string) => request<LearningSession[]>(`/sessions${engineType ? `?engine_type=${engineType}` : ''}`),
  create: (data: { engine_type: string; title?: string; plan_id?: string; duration_minutes?: number; focus_minutes?: number; difficulty?: number; performance_score?: number; notes?: string }) =>
    requestWithReward<LearningSession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  stats: (days = 7) => request<{ by_engine: { engine_type: string; count: number; focus: number; avg_perf: number }[]; daily: { date: string; focus: number; sessions: number }[]; totals: { total_sessions: number; total_focus: number; avg_perf: number } }>(`/sessions/stats?days=${days}`),
}

// ============ 知识图谱 API ============
export const knowledgeApi = {
  graph: () => request<KnowledgeGraph>('/knowledge/graph'),
  addNode: (data: { concept: string; description?: string; category?: string; mastery_level?: number; importance?: number }) =>
    request<KnowledgeNode>('/knowledge/nodes', { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (id: string, data: Partial<KnowledgeNode>) =>
    request<KnowledgeNode>(`/knowledge/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeNode: (id: string) => request<{ id: string }>(`/knowledge/nodes/${id}`, { method: 'DELETE' }),
  addRelation: (data: { source_id: string; target_id: string; relation_type?: string; strength?: number }) =>
    request<unknown>('/knowledge/relations', { method: 'POST', body: JSON.stringify(data) }),
  removeRelation: (id: string) => request<{ id: string }>(`/knowledge/relations/${id}`, { method: 'DELETE' }),
}

// ============ 奖励系统 API ============
export const rewardsApi = {
  balance: () => request<{ points: number; level: number; streak_days: number; total_focus_minutes: number }>('/rewards/balance'),
  ledger: (limit = 50) => request<{ id: string; type: string; amount: number; reason: string; created_at: string }[]>(`/rewards/ledger?limit=${limit}`),
  achievements: () => request<Achievement[]>('/rewards/achievements'),
  leaderboard: (limit = 20) => request<{ top: { id: string; username: string; avatar: string; points: number; level: number; streak_days: number; rank: number; is_me: boolean }[]; my_rank: number; my_points: number }>(`/rewards/leaderboard?limit=${limit}`),
  shop: () => request<{ id: string; name: string; description: string; cost: number; icon: string }[]>('/rewards/shop'),
  claim: (itemId: string) => request<{ item: { id: string; name: string }; remaining_points: number }>('/rewards/claim', { method: 'POST', body: JSON.stringify({ item_id: itemId }) }),
}

// ============ Agent API ============
export const agentApi = {
  messages: () => request<AgentMessage[]>('/agent/messages'),
  chat: (message: string) =>
    requestWithReward<AgentMessage>('/agent/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  engines: () => request<Record<string, { name: string; book: string; principles: string[]; methods: { name: string; detail: string }[] }>>('/agent/engines'),
}

// ============ 分析 API ============
export const analyticsApi = {
  dashboard: () => request<DashboardData>('/analytics/dashboard'),
}
