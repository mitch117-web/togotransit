import { NextRequest, NextResponse } from 'next/server'
import type { UtilisateurRole } from '@prisma/client'
import prisma from './prisma'
import { verifyToken } from './jwt'

export interface AuthContext {
  userId: number
  role: UtilisateurRole
  compagnieId: number | null
}

const ROLE_HIERARCHY: Record<UtilisateurRole, number> = {
  voyageur: 1,
  gestionnaire: 2,
  super_admin: 3,
}

/**
 * Contexte d'authentification à partir d'un jeton. Le jeton prouve QUI appelle ; la base dit ce que ce compte
 * a le droit de faire MAINTENANT. Le rôle et la compagnie sont donc relus à chaque requête, et un compte
 * supprimé ou bloqué, comme le gestionnaire d'une compagnie suspendue, n'est plus authentifié : il n'attend
 * pas l'expiration de son jeton (30 jours) pour perdre l'accès.
 */
export async function authFromToken(token: string | null | undefined): Promise<AuthContext | null> {
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null

  const user = await prisma.utilisateur.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      statut: true,
      compagnie_id: true,
      compagnie: { select: { statut: true } },
    },
  })
  if (!user || user.statut === 'bloque') return null
  // Même règle qu'à la connexion : le gestionnaire d'une compagnie suspendue n'a plus accès.
  if (user.role === 'gestionnaire' && user.compagnie?.statut === 'suspendu') return null

  return { userId: user.id, role: user.role, compagnieId: user.compagnie_id }
}

export async function extractAuthFromRequest(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    return authFromToken(authHeader.slice(7))
  }

  // Fallback pour le front web (Server Actions / fetch client) qui s'appuie
  // sur le cookie de session plutôt que sur un header Authorization explicite.
  const cookieToken = request.cookies.get('auth_token')?.value
  if (cookieToken) {
    return authFromToken(cookieToken)
  }

  return null
}

export function requireRole(
  auth: AuthContext | null,
  requiredRole: UtilisateurRole
): NextResponse | null {
  if (!auth) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  if (ROLE_HIERARCHY[auth.role] < ROLE_HIERARCHY[requiredRole]) {
    return NextResponse.json(
      { error: `Accès refusé. Rôle requis: ${requiredRole}` },
      { status: 403 }
    )
  }
  return null
}

export function requireAnyRole(
  auth: AuthContext | null,
  allowedRoles: UtilisateurRole[]
): NextResponse | null {
  if (!auth) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json(
      { error: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}` },
      { status: 403 }
    )
  }
  return null
}

export function buildCompagnieScope(
  auth: AuthContext | null,
  field: string = 'compagnie_id'
): Record<string, unknown> | null {
  if (!auth) return null
  if (auth.role === 'super_admin') return {}
  if (auth.role === 'gestionnaire' && auth.compagnieId) {
    return { [field]: auth.compagnieId }
  }
  return null
}

export async function assertCompagnieOwnership(
  auth: AuthContext | null,
  compagnieIdFromRecord: number | null | undefined
): Promise<NextResponse | null> {
  if (!auth) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  if (auth.role === 'super_admin') return null
  if (auth.role === 'gestionnaire') {
    if (!auth.compagnieId) {
      return NextResponse.json(
        { error: 'Gestionnaire sans compagnie attribuée' },
        { status: 403 }
      )
    }
    if (compagnieIdFromRecord !== auth.compagnieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette ressource appartient à une autre compagnie.' },
        { status: 403 }
      )
    }
    return null
  }
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}

export function applyCompagnieFilterToWhere<T extends Record<string, unknown>>(
  where: T,
  auth: AuthContext | null,
  field: string = 'compagnie_id'
): T {
  const scope = buildCompagnieScope(auth, field)
  if (scope === null) return where
  return { ...where, ...scope }
}
