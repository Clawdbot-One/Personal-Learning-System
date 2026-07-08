// TypeScript types mirroring the backend Pydantic schemas.
// Field names match the JSON contract exactly (e.g. `meta`, not `metadata`).

export interface UserOut {
  id: string
  username: string
  email: string
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  tier: string
  preferences: Record<string, unknown>
  token_balance: number
  reputation: number
  streak_days: number
  created_at: string
}

export interface TokenOut {
  access_token: string
  token_type: string
  user: UserOut
}

export interface MilestoneOut {
  id: string
  title: string
  description?: string | null
  order_index: number
  target_date?: string | null
  is_completed: boolean
  completed_at?: string | null
}

export interface PlanOut {
  id: string
  title: string
  description?: string | null
  domain?: string | null
  status: string
  target_skills: Record<string, unknown>[]
  enabled_engines: string[]
  deadline?: string | null
  progress: number
  milestones: MilestoneOut[]
  created_at: string
}

export interface FocusSessionOut {
  id: string
  mode: string
  strategy?: string | null
  plan_id?: string | null
  planned_minutes: number
  actual_minutes: number
  distraction_count: number
  task_summary?: string | null
  reflection?: string | null
  started_at: string
  ended_at?: string | null
  status: string
}

export interface SessionOut {
  id: string
  plan_id?: string | null
  engine: string
  started_at: string
  ended_at?: string | null
  duration_minutes: number
  difficulty: number
  performance: number
  focus_score: number
  session_data: Record<string, unknown>
  reward_granted: number
}

export interface KnowledgeNodeOut {
  id: string
  concept: string
  description?: string | null
  category?: string | null
  mastery: number
  is_weak: boolean
  meta: Record<string, unknown>
}

export interface KnowledgeRelationOut {
  id: string
  source_id: string
  target_id: string
  relation_type: string
  strength: number
}

export interface KnowledgeGraphOut {
  nodes: KnowledgeNodeOut[]
  edges: KnowledgeRelationOut[]
}

export interface BookOut {
  id: string
  title: string
  author?: string | null
  cover_url?: string | null
  total_pages?: number | null
  current_page: number
  status: string
  stage: number
}

export interface NoteOut {
  id: string
  book_id: string
  layer: number
  content: string
  page_ref?: string | null
  tags: string[]
  is_highlight: boolean
  created_at: string
}

export interface SkillNodeOut {
  id: string
  domain: string
  name: string
  parent_id?: string | null
  level: number
  is_bottleneck: boolean
  order_index: number
}

export interface PracticeItemOut {
  id: string
  skill_node_id?: string | null
  question: string
  answer: string
  item_type: string
  difficulty: number
  next_review_at: string
  review_interval_days: number
  ease_factor: number
  times_reviewed: number
  times_correct: number
}

export interface PracticeAttemptOut {
  id: string
  item_id: string
  is_correct: boolean
  quality: number
  feedback?: string | null
  next_review_at: string
  new_difficulty: number
  tokens_earned: number
}

export interface CriticalAnalysisOut {
  id: string
  source_text: string
  mode: string
  conclusion?: string | null
  reasons: unknown[]
  ambiguous_terms: unknown[]
  assumptions: unknown[]
  fallacies: unknown[]
  evidence_levels: unknown[]
  credibility_score: number
  created_at: string
}

export interface ActionPlanOut {
  id: string
  title: string
  source_concept?: string | null
  insight?: string | null
  status: string
  progress: number
  items: ActionItemOut[]
}

export interface ActionItemOut {
  id: string
  day: number
  content: string
  is_done: boolean
  done_at?: string | null
}

export interface RewardOut {
  id: string
  dimension: string
  reward_type: string
  points: number
  balance_after: number
  reason?: string | null
  meta: Record<string, unknown>
  earned_at: string
}

export interface AchievementOut {
  code: string
  name: string
  description: string
  dimension: string
  icon: string
  threshold: number
  criterion: string
}

export interface UserAchievementOut {
  achievement_code: string
  name: string
  icon: string
  dimension: string
  earned_at: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  token_balance: number
  reputation: number
  streak_days: number
  rank: number
}

export interface CommitmentOut {
  id: string
  plan_id?: string | null
  title: string
  stake: number
  reward: number
  deadline: string
  status: string
  settled_at?: string | null
}

export interface GroupOut {
  id: string
  name: string
  description?: string | null
  category?: string | null
  is_private: boolean
  invite_code?: string | null
  member_count: number
}

export interface ConversationOut {
  id: string
  title: string
  agent_role: string
  created_at: string
  messages: AgentMessageOut[]
}

export interface AgentMessageOut {
  id: string
  role: string
  content: string
  meta: Record<string, unknown>
  created_at: string
}

export interface AgentChatOut {
  conversation_id: string
  role: string
  content: string
  backend: string
  meta: Record<string, unknown>
}

export interface DashboardOut {
  user: UserOut
  today_focus_minutes: number
  today_practice_count: number
  active_plans: number
  total_focus_minutes: number
  total_practice_count: number
  knowledge_node_count: number
  streak_days: number
  token_balance: number
  weekly_focus: { date: string; minutes: number }[]
  engine_distribution: { engine: string; count: number }[]
  recent_sessions: SessionOut[]
  achievements: UserAchievementOut[]
  upcoming_reviews: PracticeItemOut[]
}
