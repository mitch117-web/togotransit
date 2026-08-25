import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'
import { extractAuthFromRequest, requireAnyRole, assertCompagnieOwnership } from '@/lib/auth'

async function findParcelByIdOrTracking(id: string) {
  const idNum = parseInt(id, 10)
  return prisma.parcel.findFirst({
    where: {
      OR: [
        { id: isNaN(idNum) ? undefined : idNum },
        { trackingId: id }
      ].filter((x: any) => x.id !== undefined || x.trackingId !== undefined) as any
    },
    include: { pod: true }
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const auth = await extractAuthFromRequest(request as any)

    // Un identifiant de tracking (non numérique, ex: TRK-1000) agit comme un
    // jeton d'accès public à ce seul colis, comme la page web /tracking.
    if (isNaN(idNum) && !auth) {
      const parcel = await findParcelByIdOrTracking(id)
      if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
      return NextResponse.json(parcel)
    }

    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const parcel = await findParcelByIdOrTracking(id)
    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    }

    if (auth!.role === 'voyageur') {
      if (parcel.senderId !== auth!.userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    } else {
      const ownershipError = await assertCompagnieOwnership(auth, parcel.compagnie_id)
      if (ownershipError) return ownershipError
    }

    return NextResponse.json(parcel)
  } catch (error) {
    console.error('Fetch Parcel Error:', error)
    return NextResponse.json({ error: 'Failed to fetch parcel' }, { status: 500 })
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
    const oldParcel = await findParcelByIdOrTracking(id)
    if (!oldParcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, oldParcel.compagnie_id)
    if (ownershipError) return ownershipError

    const data = await request.json()
    const numericId = oldParcel.id

    // Convert string values to numbers if necessary
    const weight = typeof data.weight === 'string' ? parseFloat(data.weight) : data.weight
    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price

    // Prepare status history update if status changed
    let statusHistory = oldParcel.statusHistory
    if (data.status && data.status !== oldParcel.status) {
      let history = []
      try {
        history = JSON.parse(oldParcel.statusHistory || '[]')
      } catch (e) {
        console.error('Failed to parse history for update:', e)
      }
      history.push({
        status: data.status,
        timestamp: new Date().toISOString(),
        location: data.status === 'DELIVERED' ? data.destination : (data.location || oldParcel.origin),
        note: `Statut mis à jour : ${data.status}`
      })
      statusHistory = JSON.stringify(history)
    }

    const updatedParcel = await prisma.parcel.update({
      where: { id: numericId },
      data: {
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        weight: weight !== undefined ? weight : undefined,
        origin: data.origin,
        destination: data.destination,
        category: data.category,
        deliveryType: data.deliveryType,
        status: data.status,
        statusHistory,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        price: price !== undefined ? price : undefined,
        driverId: data.driverId
      } as any
    })

    // SMS Notifications based on status change
    if (data.status === 'DELIVERED' && oldParcel.status !== 'DELIVERED') {
      await sendSMS(
        updatedParcel.receiverPhone,
        `TogoTransit: Votre colis ${updatedParcel.trackingId} de ${updatedParcel.senderName} a été livré avec succès.`
      )
    } else if (data.status === 'OUT_FOR_DELIVERY' && oldParcel.status !== 'OUT_FOR_DELIVERY') {
      await sendSMS(
        updatedParcel.receiverPhone,
        `TogoTransit: Votre colis ${updatedParcel.trackingId} est en cours de livraison. Préparez-vous à le recevoir.`
      )
    }

    return NextResponse.json(updatedParcel)
  } catch (error) {
    console.error('Update Parcel Error:', error)
    return NextResponse.json({ error: 'Failed to update parcel' }, { status: 500 })
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
    const parcel = await findParcelByIdOrTracking(id)
    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, parcel.compagnie_id)
    if (ownershipError) return ownershipError

    await prisma.parcel.delete({ where: { id: parcel.id } })
    return NextResponse.json({ message: 'Parcel deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete parcel' }, { status: 500 })
  }
}
