import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

/**
 * Proxy de protection des routes admin.
 *
 * Logique :
 * - Routes /admin/** → exiger un JWT signé valide avec rôle gestionnaire ou super_admin
 * - Le rôle est lu UNIQUEMENT depuis le JWT vérifié (jamais depuis un cookie non vérifié)
 * - Si non authentifié ou rôle insuffisant → rediriger vers /login
 * - Les voyageurs utilisent exclusivement l'application mobile : un voyageur
 *   connecté qui tente /admin est renvoyé vers /login avec un message dédié.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protéger uniquement les routes admin
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth_token')?.value

    // Pas de token → redirection vers login
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const payload = verifyToken(token)

    // Token invalide ou expiré → effacer les cookies et rediriger
    if (!payload) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('expired', '1')
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth_token')
      response.cookies.delete('auth_role')
      response.cookies.delete('compagnie_id')
      return response
    }

    // Voyageur tentant d'accéder à /admin → aucune interface web pour ce
    // rôle, on renvoie vers /login avec un message explicatif.
    if (payload.role === 'voyageur') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('mobileOnly', '1')
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth_token')
      response.cookies.delete('auth_role')
      response.cookies.delete('compagnie_id')
      return response
    }

    // Rôle inconnu ou manquant
    if (!['gestionnaire', 'super_admin'].includes(payload.role)) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
