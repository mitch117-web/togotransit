import jwt from 'jsonwebtoken'
import type { UtilisateurRole } from '@prisma/client'

export interface JwtPayload {
  userId: number
  role: UtilisateurRole
  compagnieId: number | null
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set')
}
export const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '24h'

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    if (!decoded.userId || !decoded.role) return null
    return {
      userId: Number(decoded.userId),
      role: decoded.role as UtilisateurRole,
      compagnieId: decoded.compagnieId != null ? Number(decoded.compagnieId) : null,
    }
  } catch {
    return null
  }
}