import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole, applyCompagnieFilterToWhere } from '@/lib/auth'

const statusMap: Record<string, any> = {
  AVAILABLE: 'disponible',
  IN_SERVICE: 'disponible',
  MAINTENANCE: 'en_maintenance',
  disponible: 'disponible',
  en_maintenance: 'en_maintenance',
  hors_service: 'hors_service',
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked
    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const data = await request.json()

    const statut = statusMap[data.status] || data.status || 'disponible'
    const nombre_places = parseInt(data.capacity ?? data.nombre_places ?? '0') || 0
    // Un gestionnaire ne peut créer un véhicule que pour sa propre compagnie.
    const compagnie_id = auth!.role === 'gestionnaire' ? auth!.compagnieId : (data.compagnie_id ?? null)

    const newVehicle = await prisma.vehicule.create({
      data: {
        immatriculation: data.plateNumber ?? data.immatriculation ?? '',
        type: data.type ?? data.modele ?? data.model ?? '',
        nombre_places,
        statut,
        compagnie_id,
      } as any
    })

    return NextResponse.json(newVehicle)
  } catch (error) {
    console.error('Create Vehicle Error:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked
    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const where = applyCompagnieFilterToWhere({}, auth, 'compagnie_id')
    const vehicles = await prisma.vehicule.findMany({
      where,
      orderBy: { immatriculation: 'asc' }
    })
    return NextResponse.json(vehicles)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}
