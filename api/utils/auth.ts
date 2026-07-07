/**
 * 认证中间件 —— 从请求头解析 JWT 并挂载用户信息
 */
import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from './jwt.js'

// 扩展 Express Request 类型，附加 userId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
      username?: string
    }
  }
}

/**
 * 从 Authorization 头提取 Bearer token
 */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice(7)
}

/**
 * 要求登录的中间件，验证失败返回 401
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' })
    return
  }
  req.userId = payload.userId
  req.username = payload.username
  next()
}

/**
 * 可选认证中间件 —— 验证通过则挂载用户，不通过也放行
 */
export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      req.userId = payload.userId
      req.username = payload.username
    }
  }
  next()
}
