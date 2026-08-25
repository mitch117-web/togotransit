import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, applyCompagnieFilterToWhere, assertCompagnieOwnership } from '@/lib/auth'
import { z } from 'zod'

const createVehiculeSchema = z.object({
  immatriculation: z.string().min(2),
  type: z.string().min(2),
  nombre_places: z.number().int().positive(),
  statut: z.enum(['disponible', 'en_maintenance', 'hors_service']).optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked
    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const where = applyCompagnieFilterToWhere({}, auth, 'compagnie_id')

    const vehicules = await prisma.vehicule.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      include: {
        _count: { select: { trajets: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: vehicules,
      total: vehicules.length,
    })
  } catch (error) {
    console.error('Admin Compagnie Vehicules GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    if (!auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createVehiculeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const existing = await prisma.vehicule.findUnique({
      where: { immatriculation: parsed.data.immatriculation },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Un véhicule avec cette immatriculation existe déjà" },
        { status: 409 }
      )
    }

    const vehicule = await prisma.vehicule.create({
      data: {
        compagnie_id: auth!.compagnieId!,
        immatriculation: parsed.data.immatriculation,
        type: parsed.data.type,
        nombre_places: parsed.data.nombre_places,
        statut: parsed.data.statut || 'disponible',
      },
    })

    return NextResponse.json({
      success: true,
      data: vehicule,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Admin Compagnie Vehicules POST Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Un véhicule avec cette immatriculation existe déjà' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
