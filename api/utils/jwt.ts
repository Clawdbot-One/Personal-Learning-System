/**
 * JWT 工具模块 —— 签发与验证令牌
 */
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'learnflow-dev-secret-change-in-prod'
const EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  username: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload
  } catch {
    return null
  }
}
