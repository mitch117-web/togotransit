import prisma from './prisma'

/**
 * Rate-limiting adossé à PostgreSQL (table partagée `rate_limit_entries`).
 *
 * Un store en mémoire ne fonctionne pas de façon fiable sur des fonctions
 * serverless (Vercel) : chaque invocation peut atterrir sur une instance
 * différente, sans mémoire partagée entre elles. En passant par la base de
 * données déjà utilisée par l'application, le compteur est correct quel que
 * soit le nombre d'instances actives.
 */
const WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS_DEFAUT = 5

export async function isRateLimited(
  key: string,
  maxAttempts: number = MAX_ATTEMPTS_DEFAUT
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const now = new Date()

  const entry = await prisma.rateLimitEntry.findUnique({ where: { key } })

  if (!entry || entry.resetAt <= now) {
    await prisma.rateLimitEntry.upsert({
      where: { key },
      update: { count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) },
      create: { key, count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) },
    })
    return { limited: false, retryAfterSec: 0 }
  }

  const updated = await prisma.rateLimitEntry.update({
    where: { key },
    data: { count: { increment: 1 } },
  })

  if (updated.count > maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)
    return { limited: true, retryAfterSec }
  }

  return { limited: false, retryAfterSec: 0 }
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitEntry.deleteMany({ where: { key } })
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
