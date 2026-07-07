/**
 * 认证路由 —— 注册 / 登录 / 当前用户 / 学习目标初始化
 */
import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { db, uuid, parseJSON } from '../db.js'
import { signToken } from '../utils/jwt.js'
import { authRequired } from '../utils/auth.js'
import { awardPoints, updateStreak, checkAchievements } from '../utils/rewards.js'

const router = Router()

/**
 * 用户公开信息（去除密码）
 */
function publicUser(u: Record<string, unknown>) {
  const { password_hash, ...rest } = u
  return {
    ...rest,
    preferences: parseJSON(rest.preferences, {}),
  }
}

/**
 * POST /api/auth/register —— 注册
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body ?? {}
  if (!username || !email || !password) {
    res.status(400).json({ success: false, error: '用户名、邮箱和密码均为必填项' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ success: false, error: '密码长度至少6位' })
    return
  }

  const exists = db.prepare(`SELECT id FROM users WHERE username = ? OR email = ?`).get(username, email)
  if (exists) {
    res.status(409).json({ success: false, error: '用户名或邮箱已被注册' })
    return
  }

  const hash = bcrypt.hashSync(password, 10)
  const id = uuid()
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)`
  ).run(id, username, email, hash)

  const token = signToken({ userId: id, username })
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as Record<string, unknown>

  // 注册送初始积分（金融学维度：代币经济启动）
  awardPoints(id, 'daily_login', '新用户注册奖励')
  updateStreak(id)

  res.json({ success: true, data: { token, user: publicUser(user) } })
})

/**
 * POST /api/auth/login —— 登录
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { account, password } = req.body ?? {}
  if (!account || !password) {
    res.status(400).json({ success: false, error: '请输入账号和密码' })
    return
  }

  const user = db.prepare(`SELECT * FROM users WHERE username = ? OR email = ?`).get(account, account) as
    | Record<string, unknown> | undefined
  if (!user) {
    res.status(401).json({ success: false, error: '账号或密码错误' })
    return
  }

  const ok = bcrypt.compareSync(password, user.password_hash as string)
  if (!ok) {
    res.status(401).json({ success: false, error: '账号或密码错误' })
    return
  }

  const token = signToken({ userId: user.id as string, username: user.username as string })
  const streak = updateStreak(user.id as string)
  awardPoints(user.id as string, 'daily_login', `每日登录 (连续${streak}天)`)
  checkAchievements(user.id as string)

  const fresh = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as Record<string, unknown>
  res.json({ success: true, data: { token, user: publicUser(fresh) } })
})

/**
 * GET /api/auth/me —— 获取当前登录用户信息
 */
router.get('/me', authRequired, (req: Request, res: Response): void => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId) as Record<string, unknown> | undefined
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  res.json({ success: true, data: publicUser(user) })
})

/**
 * PUT /api/auth/profile —— 更新个人资料
 */
router.put('/profile', authRequired, (req: Request, res: Response): void => {
  const { avatar, bio, preferences } = req.body ?? {}
  db.prepare(
    `UPDATE users SET avatar = COALESCE(?, avatar), bio = COALESCE(?, bio), preferences = COALESCE(?, preferences), updated_at = datetime('now') WHERE id = ?`
  ).run(avatar ?? null, bio ?? null, preferences ? JSON.stringify(preferences) : null, req.userId)

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId) as Record<string, unknown>
  res.json({ success: true, data: publicUser(user) })
})

export default router
