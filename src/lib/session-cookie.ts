/**
 * Cookie de session du portail web.
 *
 * Il est posé et effacé par le serveur uniquement (routes /api/auth/login et /api/auth/logout) :
 * - HttpOnly : aucun script de la page ne peut le lire, donc un script injecté ne peut pas voler la session ;
 * - SameSite=Lax : il n'accompagne pas les requêtes d'écriture lancées depuis un autre site ;
 * - Secure en production : il ne circule que sur une connexion chiffrée.
 * L'application mobile n'utilise pas ce cookie : elle envoie son jeton dans l'en-tête Authorization.
 */
export const SESSION_COOKIE = 'auth_token'

/** Durée de la session du portail : un jour, comme avant. */
const SESSION_MAX_AGE_S = 60 * 60 * 24

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  }
}
