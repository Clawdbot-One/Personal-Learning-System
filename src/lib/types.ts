/**
 * LearnFlow 共享类型定义
 */

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  bio: string
  preferences: Record<string, unknown>
  points: number
  level: number
  streak_days: number
  last_active_date: string | null
  total_focus_minutes: number
  total_sessions: number
  role: string
  created_at: string
}

export interface Milestone {
  id: string
  plan_id: string
  title: string
  description: string
  sort_order: number
  status: 'pending' | 'completed'
  completed_at: string | null
  created_at: string
}

export interface LearningPlan {
  id: string
  user_id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'archived'
  category: string
  target_skills: { name: string; level?: string }[]
  engines: string[]
  deadline: string | null
  progress: number
  milestones: Milestone[]
  milestone_total: number
  milestone_done: number
  created_at: string
  updated_at: string
}

export interface LearningSession {
  id: string
  user_id: string
  plan_id: string | null
  engine_type: string
  title: string
  duration_minutes: number
  focus_minutes: number
  difficulty: number
  performance_score: number
  session_data: Record<string, unknown>
  notes: string
  started_at: string
  completed_at: string | null
}

export interface KnowledgeNode {
  id: string
  user_id: string
  concept: string
  description: string
  category: string
  mastery_level: number
  importance: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface KnowledgeLink {
  id: string
  source: string
  target: string
  relation_type: string
  strength: number
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  links: KnowledgeLink[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold'
  unlocked: boolean
  earned_at: string | null
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  engine_type: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface DashboardData {
  user: { points: number; level: number; streak_days: number; total_focus_minutes: number; total_sessions: number }
  today: { sessions: number; focus_minutes: number }
  active_plans: { id: string; title: string; progress: number; deadline: string | null }[]
  weekly_focus: { date: string; focus: number; sessions: number }[]
  engine_distribution: { engine_type: string; count: number; focus: number }[]
  knowledge: { nodes: number; links: number }
  achievements: number
  rank: number
}

export interface RewardInfo {
  total: number
  bonus: number
  surprised: boolean
}

export const ENGINE_LABELS: Record<string, string> = {
  deliberate_practice: '刻意练习',
  sponge_reading: '海绵阅读',
  deep_work: '深度工作',
  knowledge_action: '知行转化',
  critical_thinking: '批判思维',
}

export const ENGINE_COLORS: Record<string, string> = {
  deliberate_practice: '#7c3aed',
  sponge_reading: '#db2777',
  deep_work: '#059669',
  knowledge_action: '#d97706',
  critical_thinking: '#0891b2',
}
