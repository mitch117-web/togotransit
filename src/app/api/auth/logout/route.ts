import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session-cookie'

/**
 * Déconnexion du portail web. Le cookie de session est HttpOnly : la page ne peut pas l'effacer elle-même,
 * c'est donc le serveur qui le fait ici. Aucune authentification n'est exigée — se déconnecter sans session
 * ne fait rien.
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 })
  // Cookies d'affichage que posait l'ancienne page de connexion : plus utilisés, on les retire au passage.
  response.cookies.set('auth_role', '', { path: '/', maxAge: 0 })
  response.cookies.set('compagnie_id', '', { path: '/', maxAge: 0 })
  return response
}
