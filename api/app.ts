/**
 * LearnFlow API 服务器
 * 路由总入口：认证 / 计划 / 会话 / 知识图谱 / 奖励 / Agent / 分析
 */
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import plansRoutes from './routes/plans.js'
import sessionsRoutes from './routes/sessions.js'
import knowledgeRoutes from './routes/knowledge.js'
import rewardsRoutes from './routes/rewards.js'
import agentRoutes from './routes/agent.js'
import analyticsRoutes from './routes/analytics.js'

dotenv.config()
initDB()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API 路由挂载
 */
app.use('/api/auth', authRoutes)
app.use('/api/plans', plansRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/agent', agentRoutes)
app.use('/api/analytics', analyticsRoutes)

/**
 * 健康检查
 */
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'LearnFlow API is running', time: new Date().toISOString() })
})

/**
 * 错误处理中间件
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[API Error]', error.message)
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

/**
 * 404 处理
 */
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: '接口不存在' })
})

export default app
