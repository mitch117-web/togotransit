import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, assertCompagnieOwnership } from '@/lib/auth'
import { z } from 'zod'

const updateVehiculeSchema = z.object({
  immatriculation: z.string().min(2).optional(),
  type: z.string().min(2).optional(),
  nombre_places: z.number().int().positive().optional(),
  statut: z.enum(['disponible', 'en_maintenance', 'hors_service']).optional(),
})

type RouteParams = Promise<{ id: string }>

export async function PUT(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    const { id } = await params
    const vehiculeId = parseInt(id, 10)
    if (isNaN(vehiculeId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const existing = await prisma.vehicule.findUnique({ where: { id: vehiculeId } })
    if (!existing) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const body = await request.json()
    const parsed = updateVehiculeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data: any = {}
    if (parsed.data.immatriculation !== undefined) data.immatriculation = parsed.data.immatriculation
    if (parsed.data.type !== undefined) data.type = parsed.data.type
    if (parsed.data.nombre_places !== undefined) data.nombre_places = parsed.data.nombre_places
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut

    const vehicule = await prisma.vehicule.update({
      where: { id: vehiculeId },
      data,
    })

    return NextResponse.json({
      success: true,
      data: vehicule,
    })
  } catch (error: any) {
    console.error('Admin Compagnie Vehicule PUT Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Un véhicule avec cette immatriculation existe déjà' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
