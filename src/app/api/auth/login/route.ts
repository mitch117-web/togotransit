import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { signTokenForUser } from '@/lib/jwt'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session-cookie'

const loginFlexSchema = z.object({
  identifier: z.string().min(2).optional(),
  email: z.string().optional(),
  telephone: z.string().optional(),
  mot_de_passe: z.string().min(6),
  // Envoyé par la page de connexion du portail : la session est alors posée dans un cookie HttpOnly.
  web: z.boolean().optional(),
})

const BCRYPT_PREFIX = '$2'

export async function POST(request: Request) {
  try {
    // Protection brute-force : 20 tentatives / minute / IP. Plus permissif
    // qu'un simple anti-bruteforce mono-compte car une même IP (agence,
    // démonstration) peut légitimement enchaîner les connexions à plusieurs
    // comptes différents en quelques secondes ; 20/min reste dérisoire pour
    // deviner un mot de passe bcrypt.
    const ip = getClientIp(request)
    const { limited, retryAfterSec } = await isRateLimited(`login:${ip}`, 20)
    if (limited) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${retryAfterSec} secondes.` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = loginFlexSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { identifier, email, telephone, mot_de_passe } = parsed.data
    const idValue = (identifier || email || telephone)?.trim()

    if (!idValue) {
      return NextResponse.json(
        { error: 'Identifiant (email ou téléphone) requis' },
        { status: 400 }
      )
    }

    const user = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { email: { equals: idValue, mode: 'insensitive' } },
          { telephone: idValue }
        ]
      },
      include:
        {
          compagnie: { select: { id: true, nom: true, logo: true, statut: true } }
        }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.statut === 'bloque') {
      return NextResponse.json({ error: 'Compte bloqué. Contactez le support.' }, { status: 403 })
    }

    if (user.role === 'gestionnaire' && user.compagnie && user.compagnie.statut === 'suspendu') {
      return NextResponse.json(
        { error: 'La compagnie est suspendue. Contactez l\'administrateur.' },
        { status: 403 }
      )
    }

    // Vérification du mot de passe : hash bcrypt (nouveaux comptes) ou
    // mot de passe en clair hérité des anciens comptes (migré automatiquement au premier login)
    const storedPassword = user.mot_de_passe
    let passwordOk = false
    let motDePasseEnregistre = storedPassword

    if (storedPassword.startsWith(BCRYPT_PREFIX)) {
      passwordOk = await bcrypt.compare(mot_de_passe, storedPassword)
    } else {
      passwordOk = storedPassword === mot_de_passe
      if (passwordOk) {
        // Migration automatique : remplace le mot de passe en clair par un hash
        const hash = await bcrypt.hash(mot_de_passe, 10)
        await prisma.utilisateur.update({
          where: { id: user.id },
          data: { mot_de_passe: hash },
        })
        motDePasseEnregistre = hash
      }
    }

    if (!passwordOk) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    // Le jeton porte l'empreinte du mot de passe enregistré : il cessera d'être accepté au prochain changement.
    const token = signTokenForUser({ ...user, mot_de_passe: motDePasseEnregistre })

    const { mot_de_passe: _, ...userWithoutPassword } = user

    // Connexion depuis le portail web : le jeton n'est jamais confié au JavaScript de la page. Le serveur le
    // pose lui-même dans un cookie HttpOnly (voir lib/session-cookie), et seulement pour un compte
    // professionnel — un voyageur n'a pas d'espace web.
    if (parsed.data.web) {
      const response = NextResponse.json({ success: true, user: userWithoutPassword })
      if (user.role === 'gestionnaire' || user.role === 'super_admin') {
        response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      }
      return response
    }

    // Application mobile : elle reçoit le jeton et l'envoie ensuite dans l'en-tête Authorization.
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error('Login Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la connexion' }, { status: 500 })
  }
}