/**
 * 奖励系统路由 —— 积分余额 / 流水 / 成就 / 排行榜 / 兑换
 * 跨学科奖励机制：心理学(成就动机) + 社会学(排行榜竞争) + 金融学(代币兑换)
 */
import { Router, type Request, type Response } from 'express'
import { db, uuid } from '../db.js'
import { authRequired } from '../utils/auth.js'
import { BADGES, checkAchievements } from '../utils/rewards.js'

const router = Router()

/**
 * 兑换商品定义（金融学维度：代币消耗）
 */
const SHOP_ITEMS: Record<string, { name: string; description: string; cost: number; icon: string }> = {
  theme_dark: { name: '暗夜主题', description: '解锁优雅深色界面主题', cost: 50, icon: 'moon' },
  theme_forest: { name: '森林主题', description: '清新自然的绿色主题', cost: 80, icon: 'leaf' },
  double_points_24h: { name: '双倍积分卡(24h)', description: '24小时内学习积分翻倍', cost: 200, icon: 'zap' },
  streak_protect: { name: '连续打卡护盾', description: '保护一次断签不重置连续天数', cost: 150, icon: 'shield' },
  custom_avatar: { name: '自定义头像框', description: '解锁专属头像边框样式', cost: 120, icon: 'crown' },
  learning_report: { name: '深度学习报告', description: '生成专属月度学习分析报告', cost: 300, icon: 'chart' },
}

/**
 * GET /api/rewards/balance —— 查询积分余额
 */
router.get('/balance', authRequired, (req: Request, res: Response): void => {
  const user = db.prepare(`SELECT points, level, streak_days, total_focus_minutes FROM users WHERE id = ?`).get(req.userId) as
    | { points: number; level: number; streak_days: number; total_focus_minutes: number }
    | undefined
  res.json({ success: true, data: user })
})

/**
 * GET /api/rewards/ledger —— 积分流水
 */
router.get('/ledger', authRequired, (req: Request, res: Response): void => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const rows = db.prepare(`SELECT * FROM rewards_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).all(req.userId, limit)
  res.json({ success: true, data: rows })
})

/**
 * GET /api/rewards/achievements —— 已解锁成就
 */
router.get('/achievements', authRequired, (req: Request, res: Response): void => {
  checkAchievements(req.userId!)
  const earned = db.prepare(`SELECT badge_id, earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at DESC`).all(req.userId) as
    | { badge_id: string; earned_at: string }[]
  const all = Object.entries(BADGES).map(([id, def]) => {
    const e = earned.find((x) => x.badge_id === id)
    return { id, ...def, unlocked: !!e, earned_at: e?.earned_at ?? null }
  })
  res.json({ success: true, data: all })
})

/**
 * GET /api/rewards/leaderboard —— 排行榜（社会学维度：正向竞争）
 * 只显示前N名和自身位置，避免底部挫败感
 */
router.get('/leaderboard', authRequired, (req: Request, res: Response): void => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const top = db.prepare(
    `SELECT id, username, avatar, points, level, streak_days, total_focus_minutes
     FROM users ORDER BY points DESC LIMIT ?`
  ).all(limit) as { id: string; username: string; avatar: string; points: number; level: number; streak_days: number; total_focus_minutes: number }[]

  const myRank = (db.prepare(
    `SELECT COUNT(*) + 1 as rank FROM users WHERE points > (SELECT points FROM users WHERE id = ?)`
  ).get(req.userId) as { rank: number }).rank

  const me = top.find((u) => u.id === req.userId)
  res.json({
    success: true,
    data: {
      top: top.map((u, i) => ({ ...u, rank: i + 1, is_me: u.id === req.userId })),
      my_rank: myRank,
      my_points: me?.points ?? 0,
    },
  })
})

/**
 * GET /api/rewards/shop —— 获取商城商品
 */
router.get('/shop', (_req: Request, res: Response): void => {
  res.json({ success: true, data: Object.entries(SHOP_ITEMS).map(([id, item]) => ({ id, ...item })) })
})

/**
 * POST /api/rewards/claim —— 兑换奖励（金融学维度：代币消耗）
 */
router.post('/claim', authRequired, (req: Request, res: Response): void => {
  const { item_id } = req.body ?? {}
  const item = SHOP_ITEMS[item_id]
  if (!item) {
    res.status(400).json({ success: false, error: '商品不存在' })
    return
  }

  const user = db.prepare(`SELECT points FROM users WHERE id = ?`).get(req.userId) as { points: number }
  if (user.points < item.cost) {
    res.status(400).json({ success: false, error: '积分不足' })
    return
  }

  // 扣减积分 + 记录流水
  db.prepare(`UPDATE users SET points = points - ? WHERE id = ?`).run(item.cost, req.userId)
  db.prepare(
    `INSERT INTO rewards_ledger (id, user_id, type, amount, reason, metadata) VALUES (?, ?, 'spend', ?, ?, '{}')`
  ).run(uuid(), req.userId, -item.cost, `兑换: ${item.name}`)

  const updated = db.prepare(`SELECT points, level FROM users WHERE id = ?`).get(req.userId)
  res.json({ success: true, data: { item: { id: item_id, ...item }, remaining_points: (updated as { points: number }).points } })
})

export default router
