/**
 * 学习计划路由 —— 计划 CRUD + 里程碑管理
 * 融合刻意练习引擎的"技能分解"与深度工作引擎的"时间块规划"
 */
import { Router, type Request, type Response } from 'express'
import { db, uuid, parseJSON } from '../db.js'
import { authRequired } from '../utils/auth.js'
import { awardPoints, checkAchievements } from '../utils/rewards.js'

const router = Router()

/**
 * 装饰计划行：解析 JSON 字段、附加里程碑与进度
 */
function decoratePlan(row: Record<string, unknown>) {
  const milestones = db.prepare(`SELECT * FROM plan_milestones WHERE plan_id = ? ORDER BY sort_order ASC`).all(row.id) as Record<string, unknown>[]
  const total = milestones.length
  const done = milestones.filter((m) => m.status === 'completed').length
  return {
    ...row,
    target_skills: parseJSON(row.target_skills, []),
    engines: parseJSON(row.engines, []),
    milestones,
    milestone_total: total,
    milestone_done: done,
  }
}

/**
 * GET /api/plans —— 获取当前用户的计划列表
 */
router.get('/', authRequired, (req: Request, res: Response): void => {
  const rows = db.prepare(`SELECT * FROM learning_plans WHERE user_id = ? ORDER BY created_at DESC`).all(req.userId) as Record<string, unknown>[]
  res.json({ success: true, data: rows.map(decoratePlan) })
})

/**
 * POST /api/plans —— 创建学习计划
 * Agent 角色：自动生成里程碑建议（刻意练习 - 技能分解）
 */
router.post('/', authRequired, (req: Request, res: Response): void => {
  const { title, description, category, target_skills, engines, deadline } = req.body ?? {}
  if (!title) {
    res.status(400).json({ success: false, error: '计划标题为必填项' })
    return
  }

  const id = uuid()
  const skills = target_skills ?? []
  const engineList = engines ?? ['deliberate_practice', 'deep_work', 'knowledge_action']

  db.prepare(
    `INSERT INTO learning_plans (id, user_id, title, description, category, target_skills, engines, deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, title, description ?? '', category ?? 'general', JSON.stringify(skills), JSON.stringify(engineList), deadline ?? null)

  // Agent 自动拆解里程碑（刻意练习：技能分解）
  const milestoneTemplates = generateMilestones(title, skills)
  const insertMilestone = db.prepare(
    `INSERT INTO plan_milestones (id, plan_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)`
  )
  milestoneTemplates.forEach((m, i) => {
    insertMilestone.run(uuid(), id, m.title, m.description, i)
  })

  const row = db.prepare(`SELECT * FROM learning_plans WHERE id = ?`).get(id) as Record<string, unknown>
  res.json({ success: true, data: decoratePlan(row) })
})

/**
 * 根据目标技能自动生成里程碑（刻意练习引擎 - 技能分解方法论）
 */
function generateMilestones(title: string, skills: unknown[]): { title: string; description: string }[] {
  const milestones: { title: string; description: string }[] = []
  if (skills.length === 0) {
    // 无明确技能时，生成通用学习阶段
    milestones.push({ title: '基础认知构建', description: '建立领域基础知识框架，阅读入门材料' })
    milestones.push({ title: '核心概念掌握', description: '深入理解核心概念，构建知识图谱' })
    milestones.push({ title: '实践应用训练', description: '通过刻意练习将知识转化为技能' })
    milestones.push({ title: '综合输出验证', description: '完成项目或费曼输出，验证掌握程度' })
  } else {
    skills.forEach((s) => {
      const skill = s as { name?: string; level?: string }
      milestones.push({
        title: `掌握：${skill.name ?? '技能'}`,
        description: `目标水平：${skill.level ?? '入门'}。建议采用刻意练习法分解子技能并逐项突破。`,
      })
    })
    milestones.push({ title: '综合实践与输出', description: '整合所有技能完成实战项目，并通过费曼方法教授他人验证掌握度' })
  }
  return milestones
}

/**
 * GET /api/plans/:id —— 获取计划详情
 */
router.get('/:id', authRequired, (req: Request, res: Response): void => {
  const row = db.prepare(`SELECT * FROM learning_plans WHERE id = ? AND user_id = ?`).get(req.params.id, req.userId) as Record<string, unknown> | undefined
  if (!row) {
    res.status(404).json({ success: false, error: '计划不存在' })
    return
  }
  res.json({ success: true, data: decoratePlan(row) })
})

/**
 * PUT /api/plans/:id —— 更新计划
 */
router.put('/:id', authRequired, (req: Request, res: Response): void => {
  const { title, description, status, category, deadline, progress } = req.body ?? {}
  const existing = db.prepare(`SELECT * FROM learning_plans WHERE id = ? AND user_id = ?`).get(req.params.id, req.userId)
  if (!existing) {
    res.status(404).json({ success: false, error: '计划不存在' })
    return
  }

  db.prepare(
    `UPDATE learning_plans SET title = COALESCE(?, title), description = COALESCE(?, description),
     status = COALESCE(?, status), category = COALESCE(?, category), deadline = COALESCE(?, deadline),
     progress = COALESCE(?, progress), updated_at = datetime('now') WHERE id = ?`
  ).run(title ?? null, description ?? null, status ?? null, category ?? null, deadline ?? null, progress ?? null, req.params.id)

  if (status === 'completed') {
    awardPoints(req.userId!, 'plan_complete', '完成学习计划')
    checkAchievements(req.userId!)
  }

  const row = db.prepare(`SELECT * FROM learning_plans WHERE id = ?`).get(req.params.id) as Record<string, unknown>
  res.json({ success: true, data: decoratePlan(row) })
})

/**
 * DELETE /api/plans/:id —— 删除计划
 */
router.delete('/:id', authRequired, (req: Request, res: Response): void => {
  db.prepare(`DELETE FROM learning_plans WHERE id = ? AND user_id = ?`).run(req.params.id, req.userId)
  res.json({ success: true, data: { id: req.params.id } })
})

/**
 * PUT /api/plans/:planId/milestones/:milestoneId —— 更新里程碑状态
 */
router.put('/:planId/milestones/:milestoneId', authRequired, (req: Request, res: Response): void => {
  const { status } = req.body ?? {}
  const plan = db.prepare(`SELECT id FROM learning_plans WHERE id = ? AND user_id = ?`).get(req.params.planId, req.userId)
  if (!plan) {
    res.status(404).json({ success: false, error: '计划不存在' })
    return
  }

  const completedAt = status === 'completed' ? new Date().toISOString() : null
  db.prepare(`UPDATE plan_milestones SET status = ?, completed_at = ? WHERE id = ? AND plan_id = ?`)
    .run(status ?? 'pending', completedAt, req.params.milestoneId, req.params.planId)

  if (status === 'completed') {
    awardPoints(req.userId!, 'milestone_complete', '完成里程碑')
    checkAchievements(req.userId!)
  }

  // 自动更新计划进度
  const milestones = db.prepare(`SELECT status FROM plan_milestones WHERE plan_id = ?`).all(req.params.planId) as { status: string }[]
  const total = milestones.length
  const done = milestones.filter((m) => m.status === 'completed').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const newStatus = progress === 100 ? 'completed' : 'active'
  db.prepare(`UPDATE learning_plans SET progress = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(progress, newStatus, req.params.planId)

  if (newStatus === 'completed') {
    awardPoints(req.userId!, 'plan_complete', '完成学习计划')
    checkAchievements(req.userId!)
  }

  const row = db.prepare(`SELECT * FROM learning_plans WHERE id = ?`).get(req.params.planId) as Record<string, unknown>
  res.json({ success: true, data: decoratePlan(row) })
})

/**
 * POST /api/plans/:planId/milestones —— 新增里程碑
 */
router.post('/:planId/milestones', authRequired, (req: Request, res: Response): void => {
  const { title, description } = req.body ?? {}
  if (!title) {
    res.status(400).json({ success: false, error: '里程碑标题为必填项' })
    return
  }
  const plan = db.prepare(`SELECT id FROM learning_plans WHERE id = ? AND user_id = ?`).get(req.params.planId, req.userId)
  if (!plan) {
    res.status(404).json({ success: false, error: '计划不存在' })
    return
  }
  const maxOrder = (db.prepare(`SELECT MAX(sort_order) as m FROM plan_milestones WHERE plan_id = ?`).get(req.params.planId) as { m: number | null }).m ?? -1
  const id = uuid()
  db.prepare(`INSERT INTO plan_milestones (id, plan_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .run(id, req.params.planId, title, description ?? '', maxOrder + 1)
  const milestone = db.prepare(`SELECT * FROM plan_milestones WHERE id = ?`).get(id)
  res.json({ success: true, data: milestone })
})

export default router
