/**
 * 跨学科奖励引擎
 * 融合心理学(操作性强化/心流/SDT)、社会学(认同/竞争/社交资本)、
 * 金融学(代币经济/期货/ROI)三维度激励逻辑
 */
import { db, uuid } from '../db.js'

/**
 * 成就徽章定义（社会学维度：身份进阶 + 社交资本）
 */
export const BADGES: Record<string, { name: string; description: string; icon: string; tier: string }> = {
  first_session: { name: '初次启航', description: '完成第一次学习会话', icon: 'compass', tier: 'bronze' },
  streak_3: { name: '三日不辍', description: '连续学习3天', icon: 'flame', tier: 'bronze' },
  streak_7: { name: '一周战士', description: '连续学习7天', icon: 'flame', tier: 'silver' },
  streak_30: { name: '月度行者', description: '连续学习30天', icon: 'flame', tier: 'gold' },
  focus_60: { name: '专注一小时', description: '单次深度工作满60分钟', icon: 'target', tier: 'silver' },
  focus_500: { name: '深度行者', description: '累计专注500分钟', icon: 'target', tier: 'gold' },
  plan_complete: { name: '计划达成', description: '完成一个学习计划', icon: 'trophy', tier: 'gold' },
  knowledge_10: { name: '知识建构', description: '构建10个知识节点', icon: 'brain', tier: 'silver' },
  knowledge_50: { name: '知识网络', description: '构建50个知识节点', icon: 'brain', tier: 'gold' },
  agent_chat_10: { name: '善学者', description: '与Agent对话10次', icon: 'sparkles', tier: 'silver' },
  level_5: { name: '进阶学者', description: '达到5级', icon: 'star', tier: 'gold' },
}

/**
 * 奖励积分规则表
 * 融合操作性条件反射：基础奖励 + 随机惊喜奖励（多巴胺回路）
 */
const POINT_RULES: Record<string, number> = {
  session_complete: 10,
  focus_session: 15,
  milestone_complete: 25,
  plan_complete: 100,
  knowledge_node: 5,
  knowledge_relation: 3,
  reading_note: 8,
  agent_chat: 2,
  daily_login: 5,
}

/**
 * 变动比率惊喜奖励（多巴胺预测误差）—— 20% 概率触发额外奖励
 */
function surpriseBonus(baseAction: string): number {
  if (Math.random() < 0.2) {
    const bonus = Math.floor(Math.random() * 30) + 10
    return bonus
  }
  return 0
}

/**
 * 发放奖励积分并记录流水
 * @param userId 用户ID
 * @param action 触发动作
 * @param reason 描述
 * @returns 本次获得的总积分（含惊喜）
 */
export function awardPoints(userId: string, action: string, reason: string): { total: number; bonus: number; surprised: boolean } {
  const base = POINT_RULES[action] ?? 0
  const bonus = surpriseBonus(action)
  const total = base + bonus
  if (total <= 0) return { total: 0, bonus: 0, surprised: false }

  // 记录基础积分流水
  db.prepare(
    `INSERT INTO rewards_ledger (id, user_id, type, amount, reason, metadata) VALUES (?, ?, 'earn', ?, ?, '{}')`
  ).run(uuid(), userId, total, reason)

  // 更新用户总积分
  db.prepare(`UPDATE users SET points = points + ?, level = MAX(1, FLOOR(SQRT(points / 100)) + 1) WHERE id = ?`)
    .run(total, userId)

  return { total, bonus, surprised: bonus > 0 }
}

/**
 * 检查并解锁成就
 * @returns 新解锁的徽章ID列表
 */
export function checkAchievements(userId: string): string[] {
  const unlocked: string[] = []
  const user = db.prepare(`SELECT points, level, streak_days, total_focus_minutes, total_sessions FROM users WHERE id = ?`).get(userId) as
    | { points: number; level: number; streak_days: number; total_focus_minutes: number; total_sessions: number }
    | undefined
  if (!user) return unlocked

  const nodeCount = (db.prepare(`SELECT COUNT(*) as c FROM knowledge_nodes WHERE user_id = ?`).get(userId) as { c: number }).c
  const chatCount = (db.prepare(`SELECT COUNT(*) as c FROM agent_messages WHERE user_id = ? AND role = 'user'`).get(userId) as { c: number }).c
  const planDone = (db.prepare(`SELECT COUNT(*) as c FROM learning_plans WHERE user_id = ? AND status = 'completed'`).get(userId) as { c: number }).c

  const conditions: Record<string, boolean> = {
    first_session: user.total_sessions >= 1,
    streak_3: user.streak_days >= 3,
    streak_7: user.streak_days >= 7,
    streak_30: user.streak_days >= 30,
    focus_500: user.total_focus_minutes >= 500,
    plan_complete: planDone >= 1,
    knowledge_10: nodeCount >= 10,
    knowledge_50: nodeCount >= 50,
    agent_chat_10: chatCount >= 10,
    level_5: user.level >= 5,
  }

  const insertBadge = db.prepare(`INSERT OR IGNORE INTO achievements (id, user_id, badge_id) VALUES (?, ?, ?)`)
  for (const [badgeId, met] of Object.entries(conditions)) {
    if (!met) continue
    const result = insertBadge.run(uuid(), userId, badgeId)
    if (result.changes > 0) {
      unlocked.push(badgeId)
      // 成就解锁奖励积分
      awardPoints(userId, 'achievement', `解锁成就: ${BADGES[badgeId]?.name ?? badgeId}`)
    }
  }
  return unlocked
}

/**
 * 更新连续学习天数（每日登录调用）
 */
export function updateStreak(userId: string): number {
  const user = db.prepare(`SELECT last_active_date, streak_days FROM users WHERE id = ?`).get(userId) as
    | { last_active_date: string | null; streak_days: number }
    | undefined
  if (!user) return 0

  const today = new Date().toISOString().slice(0, 10)
  if (user.last_active_date === today) return user.streak_days

  let newStreak = 1
  if (user.last_active_date) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (user.last_active_date === yesterday) {
      newStreak = user.streak_days + 1
    }
  }

  db.prepare(`UPDATE users SET streak_days = ?, last_active_date = ? WHERE id = ?`).run(newStreak, today, userId)
  return newStreak
}
