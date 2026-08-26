import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/jwt'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const loginFlexSchema = z.object({
  identifier: z.string().min(2).optional(),
  email: z.string().optional(),
  telephone: z.string().optional(),
  mot_de_passe: z.string().min(6),
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
    const idValue = identifier || email || telephone

    if (!idValue) {
      return NextResponse.json(
        { error: 'Identifiant (email ou téléphone) requis' },
        { status: 400 }
      )
    }

    const user = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { email: idValue },
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
      }
    }

    if (!passwordOk) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      compagnieId: user.compagnie_id,
    })

    const { mot_de_passe: _, ...userWithoutPassword } = user
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