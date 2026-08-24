/**
 * Rate-limiting en mémoire (par IP) — suffisant pour un contexte académique.
 * Pour une production multi-instance, remplacer par un store partagé (Redis...).
 */
const WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS = 5

const attempts = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(ip: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { limited: false, retryAfterSec: 0 }
  }

  entry.count += 1
  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, retryAfterSec }
  }

  return { limited: false, retryAfterSec: 0 }
}

export function resetRateLimit(ip: string) {
  attempts.delete(ip)
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}