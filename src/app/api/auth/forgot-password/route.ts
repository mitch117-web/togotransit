import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const forgotSchema = z.object({
  email: z.string().email().optional(),
  telephone: z.string().optional(),
})

const CODES = new Map<string, { code: string; expires: number }>()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = forgotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    const { email, telephone } = parsed.data
    if (!email && !telephone) {
      return NextResponse.json(
        { error: 'Email ou téléphone requis' },
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

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const key = `${email || telephone}`
    CODES.set(key, { code, expires: Date.now() + 15 * 60 * 1000 })

    console.warn(`[OTP] Code pour ${key}: ${code}`)

    return NextResponse.json({
      success: true,
      message: 'Si un compte existe, un code a été envoyé.',
      otp_dev: user ? code : undefined,
    })
  } catch (error) {
    console.error('Forgot password Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export { CODES }
