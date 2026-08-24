import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'
import { z } from 'zod'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

    const where: any = {}
    if (q) {
      where.OR = [
        { nom: { contains: q } },
        { region: { contains: q } },
      ]
    }

    const villes = await prisma.ville.findMany({
      where,
      orderBy: [{ region: 'asc' as any }, { nom: 'asc' as any }],
      take: limit,
      include: {
        _count: {
          select: {
            agences_depart: true,
            trajets_depart: true,
            trajets_arrivee: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: villes,
      total: villes.length,
    })
  } catch (error) {
    console.error('Plateforme Villes GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const createVilleSchema = z.object({
  nom: z.string().min(2),
  region: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const body = await request.json()
    const parsed = createVilleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const existing = await prisma.ville.findUnique({
      where: { nom: parsed.data.nom },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Une ville avec ce nom existe déjà' },
        { status: 409 }
      )
    }

    const ville = await prisma.ville.create({
      data: {
        nom: parsed.data.nom,
        region: parsed.data.region ?? null,
      },
    })

    return NextResponse.json({
      success: true,
      data: ville,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Plateforme Villes POST Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Une ville avec ce nom existe déjà' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
