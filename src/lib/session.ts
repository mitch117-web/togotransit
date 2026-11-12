import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { JwtPayload } from './jwt'
import { authFromToken } from './auth'

/**
 * Session du portail côté Server Component : lue dans le cookie `auth_token` (JWT signé), puis recontrôlée
 * en base par `authFromToken`. Utilisée par les pages admin pour appliquer le même cloisonnement par
 * compagnie que les routes API, avec le rôle et la compagnie du compte tels qu'ils sont MAINTENANT.
 *
 * Le proxy ne fait qu'un contrôle rapide du jeton (signature, rôle inscrit dedans) ; le contrôle sûr est ici,
 * au plus près des données : un compte supprimé ou bloqué, le gestionnaire d'une compagnie suspendue, ou un
 * compte redevenu simple voyageur est renvoyé vers la connexion à sa prochaine page. La fonction ne renvoie
 * donc jamais `null` en pratique. `cache` évite de refaire la requête entre le gabarit et la page.
 */
export const getSessionContext = cache(async (): Promise<JwtPayload | null> => {
  const cookieStore = await cookies()
  const session = await authFromToken(cookieStore.get('auth_token')?.value)

  if (!session) redirect('/login?expired=1')
  // Le portail web est réservé aux comptes professionnels (les voyageurs utilisent l'application mobile).
  if (session.role === 'voyageur') redirect('/login?mobileOnly=1')

  return session
})

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
