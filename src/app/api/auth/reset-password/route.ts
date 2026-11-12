import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { isRateLimited, resetRateLimit, getClientIp } from '@/lib/rate-limit'

const resetSchema = z.object({
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  code: z.string().length(6),
  nouveau_mot_de_passe: z.string().min(6),
})

// Un code à 6 chiffres se devine à force d'essais : ils sont donc limités, par compte (5) et par adresse IP (20),
// sur un quart d'heure — la durée de vie d'un code. Au-delà, le code en cours est détruit.
const FENETRE_MS = 15 * 60 * 1000
const ESSAIS_MAX_PAR_COMPTE = 5
const ESSAIS_MAX_PAR_IP = 20

function tropDeTentatives(retryAfterSec: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
  return NextResponse.json(
    { error: `Trop de tentatives. Demandez un nouveau code dans ${minutes} minute${minutes > 1 ? 's' : ''}.` },
    { status: 429 }
  )
}

export async function POST(request: Request) {
  try {
    const parIp = await isRateLimited(`reset-ip:${getClientIp(request)}`, ESSAIS_MAX_PAR_IP, FENETRE_MS)
    if (parIp.limited) return tropDeTentatives(parIp.retryAfterSec)

    const body = await request.json()
    const parsed = resetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Même règle que pour la demande du code : un seul identifiant (l'e-mail s'il est fourni, sinon le
    // téléphone) sert à la fois à retrouver le code et le compte. Ainsi le code d'un compte ne peut jamais
    // servir à changer le mot de passe d'un autre.
    const { email, telephone, code, nouveau_mot_de_passe } = parsed.data
    const key = email || telephone
    if (!key) {
      return NextResponse.json(
        { error: 'Email ou téléphone requis' },
        { status: 400 }
      )
    }
    const identifiant = email ? { email } : { telephone: key }

    const parCompte = await isRateLimited(`reset:${key}`, ESSAIS_MAX_PAR_COMPTE, FENETRE_MS)
    if (parCompte.limited) {
      await prisma.otpCode.deleteMany({ where: { key } })
      return tropDeTentatives(parCompte.retryAfterSec)
    }

    const entry = await prisma.otpCode.findUnique({ where: { key } })

    if (!entry || entry.code !== code || entry.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Code invalide ou expiré' },
        { status: 400 }
      )
    }

    const user = await prisma.utilisateur.findFirst({ where: identifiant })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const motDePasseHash = await bcrypt.hash(nouveau_mot_de_passe, 10)

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: { mot_de_passe: motDePasseHash },
    })

    await prisma.otpCode.delete({ where: { key } })

    // Réinitialisation réussie : les compteurs de ce compte repartent de zéro.
    await resetRateLimit(`reset:${key}`)
    await resetRateLimit(`forgot:${key}`)

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé',
    })
  } catch (error) {
    console.error('Reset password Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
