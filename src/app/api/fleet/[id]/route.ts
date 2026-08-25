import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole, assertCompagnieOwnership } from '@/lib/auth'

const statusMap: Record<string, any> = {
  AVAILABLE: 'disponible',
  IN_SERVICE: 'disponible',
  MAINTENANCE: 'en_maintenance',
  disponible: 'disponible',
  en_maintenance: 'en_maintenance',
  hors_service: 'hors_service',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const vehicle = await prisma.vehicule.findUnique({
      where: { id: idNum }
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, vehicle.compagnie_id)
    if (ownershipError) return ownershipError

    return NextResponse.json(vehicle)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)

    const existing = await prisma.vehicule.findUnique({ where: { id: idNum } })
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const data = await request.json()

    const statut = statusMap[data.status] ?? data.statut ?? undefined
    const nombre_places = data.capacity !== undefined ? parseInt(data.capacity) : (data.nombre_places !== undefined ? parseInt(data.nombre_places) : undefined)

    const updateData: any = {}
    if (data.plateNumber !== undefined) updateData.immatriculation = data.plateNumber
    if (data.immatriculation !== undefined) updateData.immatriculation = data.immatriculation
    if (data.type !== undefined) updateData.type = data.type
    if (data.model !== undefined) updateData.type = data.model
    if (data.modele !== undefined) updateData.type = data.modele
    if (nombre_places !== undefined) updateData.nombre_places = nombre_places
    if (statut !== undefined) updateData.statut = statut
    // Seul un super_admin peut transférer un véhicule vers une autre compagnie.
    if (auth!.role === 'super_admin' && data.compagnie_id !== undefined) {
      updateData.compagnie_id = data.compagnie_id
    }

    const updatedVehicle = await prisma.vehicule.update({
      where: { id: idNum },
      data: updateData
    })

    return NextResponse.json(updatedVehicle)
  } catch (error) {
    console.error('Update Vehicle Error:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)

    const vehicle = await prisma.vehicule.findUnique({ where: { id: idNum } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, vehicle.compagnie_id)
    if (ownershipError) return ownershipError

    // Vérifier s'il y a des voyages liés à ce véhicule
    const relatedTrips = await prisma.trajet.findFirst({
      where: { vehicule_id: idNum }
    })

    if (relatedTrips) {
      return NextResponse.json({
        error: "Impossible de supprimer ce véhicule car il a des voyages enregistrés dans l'historique."
      }, { status: 400 })
    }

    await prisma.vehicule.delete({
      where: { id: idNum }
    })
    return NextResponse.json({ message: 'Vehicle deleted successfully' })
  } catch (error: any) {
    console.error('Delete Vehicle Error:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 })
  }
}
