import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/jwt'

const registerSchema = z.object({
  nom: z.string().min(2, 'Nom trop court'),
  prenom: z.string().min(2, 'Prénom trop court'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().min(8, 'Téléphone invalide').regex(/^[0-9+\s-]+$/, 'Format téléphone invalide'),
  mot_de_passe: z.string().min(6, 'Mot de passe trop court'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { nom, prenom, email, telephone, mot_de_passe } = parsed.data

    const existing = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { telephone },
          ...(email ? [{ email }] : []),
        ],
      },
    })

    if (existing) {
      const field = existing.telephone === telephone ? 'téléphone' : 'email'
      return NextResponse.json(
        { error: `Un compte avec ce ${field} existe déjà` },
        { status: 409 }
      )
    }

    const motDePasseHash = await bcrypt.hash(mot_de_passe, 10)

    const user = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email: email || null,
        telephone,
        mot_de_passe: motDePasseHash,
        role: 'voyageur',
        statut: 'actif',
      },
    })

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
    console.error('Register Error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 })
  }
}
