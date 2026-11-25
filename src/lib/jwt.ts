import jwt from 'jsonwebtoken'
import { createHmac } from 'node:crypto'
import type { UtilisateurRole } from '@prisma/client'

export interface JwtPayload {
  userId: number
  role: UtilisateurRole
  compagnieId: number | null
  /** Empreinte du mot de passe du compte au moment où le jeton a été émis (voir passwordFingerprint). */
  pwv?: string
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set')
}
export const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '30d'

/**
 * Empreinte du mot de passe (déjà haché) d'un compte, inscrite dans chacun de ses jetons.
 *
 * Elle change dès que le mot de passe change (modification du profil, « mot de passe oublié », modification
 * par un administrateur) : un jeton émis avant ce changement n'est plus accepté, sur tous les appareils.
 * C'est la façon de « déconnecter partout » un compte compromis, sans table ni colonne de plus dans la base.
 * L'empreinte ne révèle rien du mot de passe : c'est un HMAC tronqué, calculé avec la clé secrète du serveur.
 */
export function passwordFingerprint(motDePasseHache: string): string {
  return createHmac('sha256', JWT_SECRET).update(motDePasseHache).digest('base64url').slice(0, 16)
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/** Jeton d'un compte, avec l'empreinte de son mot de passe actuel. */
export function signTokenForUser(user: {
  id: number
  role: UtilisateurRole
  compagnie_id: number | null
  mot_de_passe: string
}): string {
  return signToken({
    userId: user.id,
    role: user.role,
    compagnieId: user.compagnie_id,
    pwv: passwordFingerprint(user.mot_de_passe),
  })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    if (!decoded.userId || !decoded.role) return null
    return {
      userId: Number(decoded.userId),
      role: decoded.role as UtilisateurRole,
      compagnieId: decoded.compagnieId != null ? Number(decoded.compagnieId) : null,
      pwv: typeof decoded.pwv === 'string' ? decoded.pwv : undefined,
    }
  } catch {
    return null
  }
}
