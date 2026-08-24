import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
    const data = await request.json()
    
    const statut = statusMap[data.status] || data.status || 'disponible'
    const nombre_places = parseInt(data.capacity ?? data.nombre_places ?? '0') || 0

    const newVehicle = await prisma.vehicule.create({
      data: {
        immatriculation: data.plateNumber ?? data.immatriculation ?? '',
        type: data.type ?? data.modele ?? data.model ?? '',
        nombre_places,
        statut,
        compagnie_id: data.compagnie_id ?? null,
      } as any
    })

    return NextResponse.json(newVehicle)
  } catch (error) {
    console.error('Create Vehicle Error:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const vehicles = await prisma.vehicule.findMany({
      orderBy: { immatriculation: 'asc' }
    })
    return NextResponse.json(vehicles)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}
