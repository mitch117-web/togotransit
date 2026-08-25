import { NextRequest, NextResponse } from 'next/server'
import type { UtilisateurRole } from '@prisma/client'
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

export async function extractAuthFromRequest(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return verifyToken(token)
  }

  // Fallback pour le front web (Server Actions / fetch client) qui s'appuie
  // sur le cookie de session plutôt que sur un header Authorization explicite.
  const cookieToken = request.cookies.get('auth_token')?.value
  if (cookieToken) {
    return verifyToken(cookieToken)
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
