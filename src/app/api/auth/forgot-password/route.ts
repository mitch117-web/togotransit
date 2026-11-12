import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { randomInt } from 'node:crypto'
import { sendEmail } from '@/lib/email'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const forgotSchema = z.object({
  email: z.string().email().optional(),
  telephone: z.string().optional(),
})

const CODE_TTL_MS = 15 * 60 * 1000

// Demandes de code limitées par quart d'heure : 10 par adresse IP, 3 pour un même compte.
const FENETRE_MS = 15 * 60 * 1000
const DEMANDES_MAX_PAR_IP = 10
const DEMANDES_MAX_PAR_COMPTE = 3

function tropDeDemandes(retryAfterSec: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
  return NextResponse.json(
    { error: `Trop de demandes. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.` },
    { status: 429 }
  )
}

export async function POST(request: Request) {
  try {
    const parIp = await isRateLimited(`forgot-ip:${getClientIp(request)}`, DEMANDES_MAX_PAR_IP, FENETRE_MS)
    if (parIp.limited) return tropDeDemandes(parIp.retryAfterSec)

    const body = await request.json()
    const parsed = forgotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Un seul identifiant fait foi, pour la clé du code comme pour la recherche du compte : l'e-mail s'il est
    // fourni, sinon le téléphone. Chercher « e-mail OU téléphone » permettait de rattacher le code d'un compte
    // à un autre compte.
    const { email, telephone } = parsed.data
    const key = email || telephone
    if (!key) {
      return NextResponse.json(
        { error: 'Email ou téléphone requis' },
        { status: 400 }
      )
    }
    const identifiant = email ? { email } : { telephone: key }

    const parCompte = await isRateLimited(`forgot:${key}`, DEMANDES_MAX_PAR_COMPTE, FENETRE_MS)
    if (parCompte.limited) return tropDeDemandes(parCompte.retryAfterSec)

    const user = await prisma.utilisateur.findFirst({ where: identifiant })

    // Générateur cryptographique : un code prévisible permettrait de réinitialiser le compte d'autrui.
    const code = String(randomInt(100000, 1000000))

    // Stocké en base (pas en mémoire) : une fonction serverless différente
    // traitera très probablement la vérification du code juste après.
    if (user) {
      await prisma.otpCode.upsert({
        where: { key },
        update: { code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
        create: { key, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
      })
    }

    console.warn(`[OTP] Code pour ${key}: ${code}`)

    let emailSent = false
    if (user && email) {
      const result = await sendEmail(
        email,
        'TogoTransit — Code de réinitialisation',
        `<p>Votre code de vérification TogoTransit est :</p>
         <p style="font-size:28px;font-weight:900;letter-spacing:4px;">${code}</p>
         <p>Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`
      )
      emailSent = result.success
      if (!result.success) {
        console.warn(`[OTP] Envoi e-mail échoué pour ${key}: ${result.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Si un compte existe, un code a été envoyé.',
      // Le code ne figure dans la réponse qu'en développement local (`next dev`), pour les essais sans envoi
      // réel. En production il n'est jamais renvoyé : il suffirait sinon de connaître le numéro ou l'adresse
      // d'un compte pour en changer le mot de passe. Tant que l'envoi par SMS est simulé, le code reste
      // lisible dans le journal du serveur (ligne « [OTP] » ci-dessus).
      otp_dev: process.env.NODE_ENV === 'development' && user && !emailSent ? code : undefined,
    })
  } catch (error) {
    console.error('Forgot password Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
