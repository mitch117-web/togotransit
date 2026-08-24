import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    
    const parcel = await prisma.parcel.findFirst({
      where: {
        OR: [
          { id: isNaN(idNum) ? undefined : idNum },
          { trackingId: id }
        ].filter((x: any) => x.id !== undefined || x.trackingId !== undefined) as any
      },
      include: {
        pod: true
      }
    })

    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
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
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const data = await request.json()
    
    const oldParcel = await prisma.parcel.findUnique({
      where: { id: isNaN(idNum) ? undefined : idNum } as any
    }) as any

    if (!oldParcel) {
      // Try trackingId fallback
      const byTracking = await prisma.parcel.findFirst({ where: { trackingId: id } })
      if (!byTracking) {
        return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
      }
    }

    const numericId = oldParcel?.id ?? idNum

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    await prisma.parcel.delete({
      where: { id: isNaN(idNum) ? undefined : idNum } as any
    })
    return NextResponse.json({ message: 'Parcel deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete parcel' }, { status: 500 })
  }
}
