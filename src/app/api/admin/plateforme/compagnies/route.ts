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
    const statut = searchParams.get('statut') as any
    const q = searchParams.get('q') || ''

    const where: any = {}
    if (statut && ['actif', 'suspendu', 'en_attente'].includes(statut)) {
      where.statut = statut
    }
    if (q) {
      where.OR = [
        { nom: { contains: q } },
        { email: { contains: q } },
        { telephone: { contains: q } },
      ]
    }

    const compagnies = await prisma.compagnie.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      include: {
        _count: {
          select: {
            utilisateurs: true,
            trajets: true,
            vehicules: true,
            avis: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: compagnies,
      total: compagnies.length,
    })
  } catch (error) {
    console.error('Plateforme Compagnies GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const createCompagnieSchema = z.object({
  nom: z.string().min(2),
  logo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  adresse_siege: z.string().optional().nullable(),
  statut: z.enum(['actif', 'suspendu', 'en_attente']).optional(),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const body = await request.json()
    const parsed = createCompagnieSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const compagnie = await prisma.compagnie.create({
      data: {
        nom: parsed.data.nom,
        logo: parsed.data.logo ?? null,
        description: parsed.data.description ?? null,
        telephone: parsed.data.telephone ?? null,
        email: parsed.data.email ?? null,
        adresse_siege: parsed.data.adresse_siege ?? null,
        statut: parsed.data.statut || 'en_attente',
      },
    })

    return NextResponse.json({
      success: true,
      data: compagnie,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Plateforme Compagnies POST Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Conflit de données' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
