import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const resetSchema = z.object({
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  code: z.string().length(6),
  nouveau_mot_de_passe: z.string().min(6),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    const { email, telephone, code, nouveau_mot_de_passe } = parsed.data
    const key = `${email || telephone}`

    const entry = await prisma.otpCode.findUnique({ where: { key } })

    if (!entry || entry.code !== code || entry.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Code invalide ou expiré' },
        { status: 400 }
      )
    }

    const user = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(telephone ? [{ telephone }] : []),
        ],
      },
    })

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

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé',
    })
  } catch (error) {
    console.error('Reset password Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
