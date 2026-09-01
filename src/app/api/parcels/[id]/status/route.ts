import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

// Transitions qu'un chauffeur (voyageur assigné) peut déclencher lui-même
// depuis le mobile — jamais vers DELIVERED, qui passe uniquement par le
// flux de preuve de livraison (POD).
const DRIVER_ALLOWED_STATUSES = ['IN_TRANSIT', 'OUT_FOR_DELIVERY']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const { status } = await request.json()

    const parcel = await prisma.parcel.findUnique({ where: { id: idNum } })
    if (!parcel) {
      return NextResponse.json({ error: 'Colis introuvable' }, { status: 404 })
    }

    const isAssignedDriver = auth!.role === 'voyageur' && parcel.driverId === auth!.userId
    const isCompagnieManager = auth!.role === 'gestionnaire' && parcel.compagnie_id === auth!.compagnieId

    if (auth!.role !== 'super_admin' && !isAssignedDriver && !isCompagnieManager) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Un chauffeur ne peut faire avancer le statut que vers IN_TRANSIT ou
    // OUT_FOR_DELIVERY — jamais vers DELIVERED (réservé au flux POD), ni
    // revenir en arrière.
    if (isAssignedDriver && !DRIVER_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut non autorisé pour un chauffeur' }, { status: 403 })
    }

    const history = JSON.parse(parcel.statusHistory || '[]')
    history.push({
      status,
      timestamp: new Date().toISOString(),
      location: parcel.origin,
      note: `Statut mis à jour : ${status}`,
    })

    const updated = await prisma.parcel.update({
      where: { id: parcel.id },
      data: { status, statusHistory: JSON.stringify(history) },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update parcel status', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
