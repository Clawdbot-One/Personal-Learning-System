/**
 * 分析统计路由 —— 仪表盘数据聚合
 * 学习ROI量化（金融学维度）+ 能力雷达（海绵阅读法七大能力）
 */
import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'
import { authRequired } from '../utils/auth.js'

const router = Router()

/**
 * GET /api/analytics/dashboard —— 仪表盘综合数据
 */
router.get('/dashboard', authRequired, (req: Request, res: Response): void => {
  const userId = req.userId!

  // 用户概览
  const user = db.prepare(`SELECT points, level, streak_days, total_focus_minutes, total_sessions FROM users WHERE id = ?`).get(userId) as
    | { points: number; level: number; streak_days: number; total_focus_minutes: number; total_sessions: number }

  // 今日学习会话
  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = db.prepare(
    `SELECT COUNT(*) as count, SUM(focus_minutes) as focus FROM learning_sessions WHERE user_id = ? AND date(started_at) = ?`
  ).get(userId, today) as { count: number; focus: number }

  // 活跃计划
  const activePlans = db.prepare(`SELECT id, title, progress, deadline FROM learning_plans WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 5`).all(userId)

  // 近7天专注趋势
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const weeklyFocus = db.prepare(
    `SELECT date(started_at) as date, SUM(focus_minutes) as focus, COUNT(*) as sessions
     FROM learning_sessions WHERE user_id = ? AND started_at >= ? GROUP BY date(started_at) ORDER BY date ASC`
  ).all(userId, since7) as { date: string; focus: number; sessions: number }[]

  // 引擎使用分布
  const engineDist = db.prepare(
    `SELECT engine_type, COUNT(*) as count, SUM(focus_minutes) as focus
     FROM learning_sessions WHERE user_id = ? GROUP BY engine_type`
  ).all(userId) as { engine_type: string; count: number; focus: number }[]

  // 知识图谱规模
  const knowledgeStats = db.prepare(
    `SELECT (SELECT COUNT(*) FROM knowledge_nodes WHERE user_id = ?) as nodes,
            (SELECT COUNT(*) FROM knowledge_relations WHERE user_id = ?) as links`
  ).get(userId, userId) as { nodes: number; links: number }

  // 成就数量
  const achievementCount = (db.prepare(`SELECT COUNT(*) as c FROM achievements WHERE user_id = ?`).get(userId) as { c: number }).c

  // 排名
  const rank = (db.prepare(`SELECT COUNT(*) + 1 as rank FROM users WHERE points > ?`).get(user.points) as { rank: number }).rank

  res.json({
    success: true,
    data: {
      user,
      today: { sessions: todaySessions.count ?? 0, focus_minutes: todaySessions.focus ?? 0 },
      active_plans: activePlans,
      weekly_focus: weeklyFocus,
      engine_distribution: engineDist,
      knowledge: knowledgeStats,
      achievements: achievementCount,
      rank,
    },
  })
})

export default router
