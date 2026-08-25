import { cookies } from 'next/headers'
import { verifyToken, type JwtPayload } from './jwt'

/**
 * Lecture du contexte de session côté Server Component, depuis le cookie
 * `auth_token` signé (JWT). Utilisé par les pages admin pour appliquer le
 * même cloisonnement par compagnie que les routes API.
 */
export async function getSessionContext(): Promise<JwtPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * Filtre Prisma à appliquer sur un champ `compagnie_id` :
 * - super_admin → {} (aucun filtre, voit tout)
 * - gestionnaire avec compagnie → { [field]: compagnieId }
 * - gestionnaire sans compagnie / autre rôle → filtre impossible à satisfaire
 *   (ne doit jamais tout voir par défaut : on préfère échouer fermé)
 */
export function compagnieFilterFor(
  session: JwtPayload | null,
  field: string = 'compagnie_id'
): Record<string, unknown> {
  if (session?.role === 'super_admin') return {}
  if (session?.role === 'gestionnaire' && session.compagnieId) {
    return { [field]: session.compagnieId }
  }
  return { [field]: -1 }
}
