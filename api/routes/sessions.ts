/**
 * 学习会话路由 —— 深度工作 / 刻意练习 / 阅读等学习会话记录
 * 融合深度工作引擎（专注保护、时间块）与刻意练习引擎（即时反馈、自适应难度）
 */
import { Router, type Request, type Response } from 'express'
import { db, uuid, parseJSON } from '../db.js'
import { authRequired } from '../utils/auth.js'
import { awardPoints, checkAchievements } from '../utils/rewards.js'

const router = Router()

/**
 * GET /api/sessions —— 获取学习会话列表（支持按引擎类型过滤）
 */
router.get('/', authRequired, (req: Request, res: Response): void => {
  const { engine_type, limit } = req.query
  const lim = Math.min(Number(limit) || 50, 200)
  let rows: Record<string, unknown>[]
  if (engine_type) {
    rows = db.prepare(`SELECT * FROM learning_sessions WHERE user_id = ? AND engine_type = ? ORDER BY started_at DESC LIMIT ?`)
      .all(req.userId, engine_type, lim) as Record<string, unknown>[]
  } else {
    rows = db.prepare(`SELECT * FROM learning_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`)
      .all(req.userId, lim) as Record<string, unknown>[]
  }
  res.json({
    success: true,
    data: rows.map((r) => ({ ...r, session_data: parseJSON(r.session_data, {}) })),
  })
})

/**
 * POST /api/sessions —— 完成一次学习会话
 * 深度工作引擎：记录专注时长；刻意练习引擎：记录难度与表现
 */
router.post('/', authRequired, (req: Request, res: Response): void => {
  const { engine_type, title, plan_id, duration_minutes, focus_minutes, difficulty, performance_score, notes, session_data } = req.body ?? {}
  if (!engine_type) {
    res.status(400).json({ success: false, error: 'engine_type 为必填项' })
    return
  }

  const id = uuid()
  const duration = Math.max(0, Math.floor(duration_minutes ?? 0))
  const focus = Math.max(0, Math.floor(focus_minutes ?? duration))
  const diff = Math.min(1, Math.max(0, difficulty ?? 0.5))
  const perf = Math.min(1, Math.max(0, performance_score ?? 0))

  db.prepare(
    `INSERT INTO learning_sessions (id, user_id, plan_id, engine_type, title, duration_minutes, focus_minutes, difficulty, performance_score, notes, session_data, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, req.userId, plan_id ?? null, engine_type, title ?? '', duration, focus, diff, perf, notes ?? '', JSON.stringify(session_data ?? {}))

  // 更新用户累计统计
  db.prepare(`UPDATE users SET total_focus_minutes = total_focus_minutes + ?, total_sessions = total_sessions + 1 WHERE id = ?`)
    .run(focus, req.userId)

  // 奖励：深度工作会话额外加分
  const action = engine_type === 'deep_work' ? 'focus_session' : 'session_complete'
  const reward = awardPoints(req.userId!, action, `完成${engineTypeLabel(engine_type)}会话 ${focus}分钟`)
  checkAchievements(req.userId!)

  // 单次专注满60分钟特殊成就
  if (focus >= 60) {
    db.prepare(`INSERT OR IGNORE INTO achievements (id, user_id, badge_id) VALUES (?, ?, 'focus_60')`).run(uuid(), req.userId)
    checkAchievements(req.userId!)
  }

  const row = db.prepare(`SELECT * FROM learning_sessions WHERE id = ?`).get(id) as Record<string, unknown>
  res.json({
    success: true,
    data: { ...row, session_data: parseJSON(row.session_data, {}) },
    reward,
  })
})

/**
 * GET /api/sessions/stats —— 学习会话统计（深度工作引擎分析）
 */
router.get('/stats', authRequired, (req: Request, res: Response): void => {
  const days = Math.min(Number(req.query.days) || 7, 90)
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const byEngine = db.prepare(
    `SELECT engine_type, COUNT(*) as count, SUM(focus_minutes) as focus, AVG(performance_score) as avg_perf
     FROM learning_sessions WHERE user_id = ? AND started_at >= ? GROUP BY engine_type`
  ).all(req.userId, since) as { engine_type: string; count: number; focus: number; avg_perf: number }[]

  const daily = db.prepare(
    `SELECT date(started_at) as date, SUM(focus_minutes) as focus, COUNT(*) as sessions
     FROM learning_sessions WHERE user_id = ? AND started_at >= ? GROUP BY date(started_at) ORDER BY date ASC`
  ).all(req.userId, since) as { date: string; focus: number; sessions: number }[]

  const totals = db.prepare(
    `SELECT COUNT(*) as total_sessions, SUM(focus_minutes) as total_focus, AVG(performance_score) as avg_perf
     FROM learning_sessions WHERE user_id = ?`
  ).get(req.userId) as { total_sessions: number; total_focus: number; avg_perf: number }

  res.json({ success: true, data: { by_engine: byEngine, daily, totals } })
})

function engineTypeLabel(t: string): string {
  const map: Record<string, string> = {
    deep_work: '深度工作',
    deliberate_practice: '刻意练习',
    reading: '海绵阅读',
    critical_thinking: '批判思维',
    knowledge_action: '知行转化',
  }
  return map[t] ?? t
}

export default router
