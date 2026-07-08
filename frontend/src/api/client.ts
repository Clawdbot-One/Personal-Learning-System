// Lightweight typed API client built on fetch.
// Injects the JWT bearer token from the auth store and unwraps errors.

import type {
  ActionPlanOut,
  AgentChatOut,
  AchievementOut,
  BookOut,
  CommitmentOut,
  ConversationOut,
  CriticalAnalysisOut,
  DashboardOut,
  FocusSessionOut,
  GroupOut,
  KnowledgeGraphOut,
  KnowledgeNodeOut,
  LeaderboardEntry,
  NoteOut,
  PlanOut,
  PracticeAttemptOut,
  PracticeItemOut,
  RewardOut,
  SessionOut,
  SkillNodeOut,
  TokenOut,
  UserAchievementOut,
  UserOut,
} from './types'
import { useAuthStore } from '../store/authStore'

const BASE = '/api/v1'

class ApiError extends Error {
  status: number
  detail: unknown
  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `API error ${status}`)
    this.status = status
    this.detail = detail
  }
}

function getToken(): string | null {
  return useAuthStore.getState().token
}

async function request<T>(
  method: string,
  path: string,
  opts: { params?: Record<string, unknown>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  const token = getToken()
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    if (res.status === 401) {
      // token expired / invalid → clear session
      useAuthStore.getState().logout()
    }
    throw new ApiError(res.status, data?.detail ?? data)
  }
  return data as T
}

export const api = {
  // --- auth ---
  register: (b: { username: string; email: string; password: string; display_name?: string }) =>
    request<TokenOut>('POST', '/auth/register', { body: b }),
  login: (b: { username: string; password: string }) =>
    request<TokenOut>('POST', '/auth/login', { body: b }),
  me: () => request<UserOut>('GET', '/auth/me'),
  updateMe: (b: Partial<Pick<UserOut, 'display_name' | 'avatar_url' | 'bio' | 'preferences'>>) =>
    request<UserOut>('PUT', '/auth/me', { body: b }),

  // --- analytics ---
  dashboard: () => request<DashboardOut>('GET', '/analytics/dashboard'),
  weekly: () => request<{ days: { date: string; weekday: string; focus_minutes: number; practice_count: number }[] }>('GET', '/analytics/weekly'),
  engines: () => request<{ breakdown: { engine: string; minutes: number }[] }>('GET', '/analytics/engines'),
  metrics: () => request<Record<string, number>>('GET', '/analytics/metrics'),

  // --- plans ---
  listPlans: () => request<PlanOut[]>('GET', '/plans'),
  createPlan: (b: { title: string; description?: string; domain?: string; enabled_engines?: string[]; deadline?: string }) =>
    request<PlanOut>('POST', '/plans', { body: b }),
  getPlan: (id: string) => request<PlanOut>('GET', `/plans/${id}`),
  updatePlan: (id: string, b: Record<string, unknown>) => request<PlanOut>('PUT', `/plans/${id}`, { body: b }),
  deletePlan: (id: string) => request<void>('DELETE', `/plans/${id}`),

  // --- focus ---
  startFocus: (b: { mode?: string; strategy?: string; plan_id?: string; planned_minutes?: number; task_summary?: string }) =>
    request<FocusSessionOut>('POST', '/focus/start', { body: b }),
  completeFocus: (id: string, b: { actual_minutes: number; distraction_count?: number; reflection?: string }) =>
    request<FocusSessionOut>('POST', `/focus/${id}/complete`, { body: b }),
  abandonFocus: (id: string) => request<FocusSessionOut>('POST', `/focus/${id}/abandon`),
  focusHistory: (limit = 50) => request<FocusSessionOut[]>('GET', '/focus/history', { params: { limit } }),
  focusRituals: (strategy = 'rhythmic') => request<unknown>('GET', '/focus/rituals', { params: { strategy } }),

  // --- practice ---
  listSkills: () => request<SkillNodeOut[]>('GET', '/practice/skills'),
  addSkill: (b: { domain: string; name: string; parent_id?: string; level?: number }) =>
    request<SkillNodeOut>('POST', '/practice/skills', { body: b }),
  listItems: (limit = 50) => request<PracticeItemOut[]>('GET', '/practice/items', { params: { limit } }),
  dueItems: (limit = 10) => request<PracticeItemOut[]>('GET', '/practice/items/due', { params: { limit } }),
  addItem: (b: { skill_node_id?: string; question: string; answer: string; item_type?: string; difficulty?: number }) =>
    request<PracticeItemOut>('POST', '/practice/items', { body: b }),
  submitAttempt: (b: { item_id: string; user_answer: string; self_rating: number }) =>
    request<PracticeAttemptOut>('POST', '/practice/attempts', { body: b }),

  // --- knowledge ---
  knowledgeGraph: () => request<KnowledgeGraphOut>('GET', '/knowledge/graph'),
  addNode: (b: { concept: string; description?: string; category?: string; mastery?: number; is_weak?: boolean }) =>
    request<KnowledgeNodeOut>('POST', '/knowledge/nodes', { body: b }),
  addEdge: (b: { source_id: string; target_id: string; relation_type?: string; strength?: number }) =>
    request<unknown>('POST', '/knowledge/edges', { body: b }),
  deleteNode: (id: string) => request<void>('DELETE', `/knowledge/nodes/${id}`),

  // --- reading ---
  listBooks: () => request<BookOut[]>('GET', '/reader/books'),
  addBook: (b: { title: string; author?: string; total_pages?: number }) => request<BookOut>('POST', '/reader/books', { body: b }),
  listNotes: (bookId: string) => request<NoteOut[]>('GET', `/reader/books/${bookId}/notes`),
  addNote: (b: { book_id: string; layer?: number; content: string; page_ref?: string; tags?: string[]; is_highlight?: boolean }) =>
    request<NoteOut>('POST', '/reader/notes', { body: b }),

  // --- critical ---
  listAnalyses: (limit = 30) => request<CriticalAnalysisOut[]>('GET', '/critical', { params: { limit } }),
  analyze: (b: { source_text: string; mode?: string }) => request<CriticalAnalysisOut>('POST', '/critical/analyze', { body: b }),

  // --- action plans ---
  listActionPlans: () => request<ActionPlanOut[]>('GET', '/action/plans'),
  createActionPlan: (b: { title: string; source_concept?: string; insight?: string }) =>
    request<ActionPlanOut>('POST', '/action/plans', { body: b }),
  toggleActionItem: (planId: string, itemId: string, is_done: boolean) =>
    request<unknown>('PUT', `/action/plans/${planId}/items/${itemId}`, { body: { is_done } }),

  // --- rewards ---
  balance: () => request<{ token_balance: number; reputation: number; streak_days: number }>('GET', '/rewards/balance'),
  rewardHistory: (limit = 50) => request<RewardOut[]>('GET', '/rewards/history', { params: { limit } }),
  allAchievements: () => request<AchievementOut[]>('GET', '/rewards/achievements'),
  myAchievements: () => request<UserAchievementOut[]>('GET', '/rewards/achievements/mine'),
  leaderboard: (metric = 'token_balance', limit = 10) =>
    request<LeaderboardEntry[]>('GET', '/rewards/leaderboard', { params: { metric, limit } }),
  listContracts: () => request<CommitmentOut[]>('GET', '/rewards/contracts'),
  createContract: (b: { plan_id?: string; title: string; stake: number; reward: number; deadline: string }) =>
    request<CommitmentOut>('POST', '/rewards/contracts', { body: b }),
  settleContract: (id: string, success: boolean) =>
    request<CommitmentOut>('POST', `/rewards/contracts/${id}/settle`, { params: { success } }),
  roi: () => request<{ invested_minutes: number; output_score: number; roi_per_minute: number; verdict: string }>('GET', '/rewards/roi'),

  // --- agent ---
  agentRoles: () => request<unknown[]>('GET', '/agent/roles'),
  agentChat: (b: { message: string; role?: string; conversation_id?: string; context?: Record<string, unknown> }) =>
    request<AgentChatOut>('POST', '/agent/chat', { body: b }),
  listConversations: () => request<ConversationOut[]>('GET', '/agent/conversations'),
  getConversation: (id: string) => request<ConversationOut>('GET', `/agent/conversations/${id}`),

  // --- social ---
  listGroups: () => request<GroupOut[]>('GET', '/social/groups'),
  createGroup: (b: { name: string; description?: string; category?: string; is_private?: boolean }) =>
    request<GroupOut>('POST', '/social/groups', { body: b }),
  joinGroup: (inviteCode: string) => request<unknown>('POST', '/social/groups/join', { body: { invite_code: inviteCode } }),

  // --- sessions (generic) ---
  listSessions: (limit = 50) => request<SessionOut[]>('GET', '/plans/sessions', { params: { limit } }),
}

export { ApiError }
