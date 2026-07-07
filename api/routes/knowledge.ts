/**
 * 知识图谱路由 —— 节点与关系管理
 * 融合刻意练习引擎的"心理表征构建"：将零散概念构建为可视化知识网络
 */
import { Router, type Request, type Response } from 'express'
import { db, uuid, parseJSON } from '../db.js'
import { authRequired } from '../utils/auth.js'
import { awardPoints, checkAchievements } from '../utils/rewards.js'

const router = Router()

/**
 * GET /api/knowledge/graph —— 获取当前用户的完整知识图谱
 */
router.get('/graph', authRequired, (req: Request, res: Response): void => {
  const nodes = db.prepare(`SELECT * FROM knowledge_nodes WHERE user_id = ? ORDER BY created_at DESC`).all(req.userId) as Record<string, unknown>[]
  const relations = db.prepare(`SELECT * FROM knowledge_relations WHERE user_id = ?`).all(req.userId) as Record<string, unknown>[]

  res.json({
    success: true,
    data: {
      nodes: nodes.map((n) => ({ ...n, metadata: parseJSON(n.metadata, {}) })),
      links: relations.map((r) => ({ source: r.source_id, target: r.target_id, relation_type: r.relation_type, strength: r.strength, id: r.id })),
    },
  })
})

/**
 * POST /api/knowledge/nodes —— 添加知识节点
 */
router.post('/nodes', authRequired, (req: Request, res: Response): void => {
  const { concept, description, category, mastery_level, importance, metadata } = req.body ?? {}
  if (!concept) {
    res.status(400).json({ success: false, error: '概念名称(concept)为必填项' })
    return
  }

  const id = uuid()
  db.prepare(
    `INSERT INTO knowledge_nodes (id, user_id, concept, description, category, mastery_level, importance, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, concept, description ?? '', category ?? 'general', mastery_level ?? 0, importance ?? 0.5, JSON.stringify(metadata ?? {}))

  awardPoints(req.userId!, 'knowledge_node', `添加知识节点: ${concept}`)
  checkAchievements(req.userId!)

  const node = db.prepare(`SELECT * FROM knowledge_nodes WHERE id = ?`).get(id) as Record<string, unknown>
  res.json({ success: true, data: { ...node, metadata: parseJSON(node.metadata, {}) } })
})

/**
 * PUT /api/knowledge/nodes/:id —— 更新知识节点
 */
router.put('/nodes/:id', authRequired, (req: Request, res: Response): void => {
  const { concept, description, category, mastery_level, importance, metadata } = req.body ?? {}
  const existing = db.prepare(`SELECT id FROM knowledge_nodes WHERE id = ? AND user_id = ?`).get(req.params.id, req.userId)
  if (!existing) {
    res.status(404).json({ success: false, error: '节点不存在' })
    return
  }

  db.prepare(
    `UPDATE knowledge_nodes SET concept = COALESCE(?, concept), description = COALESCE(?, description),
     category = COALESCE(?, category), mastery_level = COALESCE(?, mastery_level),
     importance = COALESCE(?, importance), metadata = COALESCE(?, metadata) WHERE id = ?`
  ).run(concept ?? null, description ?? null, category ?? null, mastery_level ?? null, importance ?? null, metadata ? JSON.stringify(metadata) : null, req.params.id)

  const node = db.prepare(`SELECT * FROM knowledge_nodes WHERE id = ?`).get(req.params.id) as Record<string, unknown>
  res.json({ success: true, data: { ...node, metadata: parseJSON(node.metadata, {}) } })
})

/**
 * DELETE /api/knowledge/nodes/:id —— 删除知识节点（同时删除关联关系）
 */
router.delete('/nodes/:id', authRequired, (req: Request, res: Response): void => {
  db.prepare(`DELETE FROM knowledge_nodes WHERE id = ? AND user_id = ?`).run(req.params.id, req.userId)
  db.prepare(`DELETE FROM knowledge_relations WHERE (source_id = ? OR target_id = ?) AND user_id = ?`).run(req.params.id, req.params.id, req.userId)
  res.json({ success: true, data: { id: req.params.id } })
})

/**
 * POST /api/knowledge/relations —— 添加知识关系
 */
router.post('/relations', authRequired, (req: Request, res: Response): void => {
  const { source_id, target_id, relation_type, strength } = req.body ?? {}
  if (!source_id || !target_id) {
    res.status(400).json({ success: false, error: 'source_id 和 target_id 为必填项' })
    return
  }

  // 校验节点归属
  const src = db.prepare(`SELECT id FROM knowledge_nodes WHERE id = ? AND user_id = ?`).get(source_id, req.userId)
  const tgt = db.prepare(`SELECT id FROM knowledge_nodes WHERE id = ? AND user_id = ?`).get(target_id, req.userId)
  if (!src || !tgt) {
    res.status(404).json({ success: false, error: '关联节点不存在' })
    return
  }

  const id = uuid()
  db.prepare(
    `INSERT INTO knowledge_relations (id, user_id, source_id, target_id, relation_type, strength) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, source_id, target_id, relation_type ?? 'related', strength ?? 0.5)

  awardPoints(req.userId!, 'knowledge_relation', '添加知识关系')
  checkAchievements(req.userId!)

  const rel = db.prepare(`SELECT * FROM knowledge_relations WHERE id = ?`).get(id)
  res.json({ success: true, data: rel })
})

/**
 * DELETE /api/knowledge/relations/:id —— 删除知识关系
 */
router.delete('/relations/:id', authRequired, (req: Request, res: Response): void => {
  db.prepare(`DELETE FROM knowledge_relations WHERE id = ? AND user_id = ?`).run(req.params.id, req.userId)
  res.json({ success: true, data: { id: req.params.id } })
})

export default router
