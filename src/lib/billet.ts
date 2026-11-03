import { randomInt } from 'crypto'
import { billetUrl } from './billet-url'

export { billetUrl, extractNumeroBillet } from './billet-url'

// Alphabet sans caractères ambigus (0/O, 1/I/L) : le numéro se lit et se recopie sans erreur.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Numéro de billet lisible et impossible à deviner : TT-XXXX-XXXX-XXXX (12 caractères tirés avec crypto).
 * Il fait office de jeton pour la page publique de vérification, d'où le tirage non prévisible.
 */
export function generateNumeroBillet(): string {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `TT-${bloc()}-${bloc()}-${bloc()}`
}

const URL_PRODUCTION = 'https://togotransit-antg.vercel.app'

/** Adresse par laquelle le visiteur a joint le site : en-têtes de la requête (request.url porte le « 0.0.0.0 » de `next dev -H`). */
function originFromRequest(request: Request): string | null {
  const premier = (v: string | null) => v?.split(',')[0].trim() || null
  const host = premier(request.headers.get('x-forwarded-host')) ?? premier(request.headers.get('host'))
  if (!host || /^0\.0\.0\.0(:|$)/.test(host)) return null
  const local = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.)/.test(host)
  const proto = premier(request.headers.get('x-forwarded-proto')) ?? (local ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Adresse publique du site, utilisée dans le QR code des billets.
 * NEXT_PUBLIC_BASE_URL fait foi (une valeur « localhost » est ignorée en production), sinon l'adresse de la requête.
 */
export function publicBaseUrl(request?: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  const locale = !!env && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(env)
  if (env && /^https?:\/\//i.test(env) && !(locale && process.env.NODE_ENV === 'production')) {
    return env.replace(/\/+$/, '')
  }
  return (request && originFromRequest(request)) || URL_PRODUCTION
}

/** Contenu du QR code d'un billet : l'adresse de sa page de vérification. */
export function generateQRPayload(numeroBillet: string, baseUrl: string): string {
  return billetUrl(numeroBillet, baseUrl)
}
