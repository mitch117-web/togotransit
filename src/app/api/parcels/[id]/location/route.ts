import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

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
    const { latitude, longitude } = await request.json()

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordinates required' }, { status: 400 })
    }

    // Find parcel by ID or trackingId
    const parcel = await prisma.parcel.findFirst({
      where: {
        OR: [
          { id: isNaN(idNum) ? undefined : idNum },
          { trackingId: id }
        ].filter((x: any) => x.id !== undefined || x.trackingId !== undefined) as any
      }
    })

    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    }

    // Seul le chauffeur assigné au colis, un gestionnaire de la compagnie
    // concernée, ou un super_admin peut y injecter une position GPS.
    const isAssignedDriver = auth!.role === 'voyageur' && parcel.driverId === auth!.userId
    const isCompagnieManager = auth!.role === 'gestionnaire' && parcel.compagnie_id === auth!.compagnieId
    if (auth!.role !== 'super_admin' && !isAssignedDriver && !isCompagnieManager) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Update statusHistory with new coordinates
    const history = JSON.parse(parcel.statusHistory || '[]')

    const newEntry = {
      status: parcel.status, // Keep current status
      timestamp: new Date().toISOString(),
      location: `GPS Update: ${latitude}, ${longitude}`,
      metadata: { latitude, longitude }
    }

    history.push(newEntry)

    await prisma.parcel.update({
      where: { id: parcel.id },
      data: {
        statusHistory: JSON.stringify(history)
      }
    })

    return NextResponse.json({ success: true, entry: newEntry })
  } catch (error) {
    console.error('Failed to update location', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
