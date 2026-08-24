import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Génération d'un ID de tracking unique (ex: TRK-1000)
    // On récupère tous les IDs commençant par TRK- pour trouver le maximum numériquement
    const allParcels = await prisma.parcel.findMany({
      where: { trackingId: { startsWith: 'TRK-' } },
      select: { trackingId: true }
    })
    
    let nextNumber = 1000
    if (allParcels.length > 0) {
      const numbers = allParcels.map((p: { trackingId: string }) => {
        const parts = p.trackingId.split('-')
        return parts.length > 1 ? parseInt(parts[1]) : 0
      }).filter((n: number) => !isNaN(n))
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }
    
    // Safety loop to ensure uniqueness
    let trackingId = `TRK-${nextNumber}`
    let exists = await prisma.parcel.findUnique({ where: { trackingId } })
    while (exists) {
      nextNumber++
      trackingId = `TRK-${nextNumber}`
      exists = await prisma.parcel.findUnique({ where: { trackingId } })
    }

    const newParcel = await prisma.parcel.create({
      data: {
        trackingId,
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        weight: parseFloat(data.weight),
        origin: data.origin,
        destination: data.destination,
        category: data.category,
        deliveryType: data.deliveryType,
        status: 'IN_AGENCY',
        statusHistory: JSON.stringify([{
          status: 'IN_AGENCY',
          timestamp: new Date().toISOString(),
          location: data.origin,
          note: 'Colis enregistré en agence'
        }]),
        price: parseFloat(data.price),
        paymentStatus: data.paymentMethod === 'CASH' ? 'PENDING' : 'PAID',
        paymentMethod: data.paymentMethod,
      } as any
    })

    // Notification SMS Simulation
    await sendSMS(
      data.senderPhone, 
      `TogoTransit: Votre colis pour ${data.receiverName} a été enregistré. Tracking ID: ${trackingId}. Prix: ${data.price} F.`
    )

    return NextResponse.json(newParcel)
  } catch (error) {
    console.error('Create Parcel Error:', error)
    return NextResponse.json({ error: 'Failed to create parcel' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const phone = searchParams.get('phone')
  const driverId = searchParams.get('driverId')
  const limit = searchParams.get('limit')

  try {
    const where: any = {}
    
    if (q) {
      where.trackingId = { contains: q }
    }
    
    if (phone) {
      where.OR = [
        { senderPhone: phone },
        { receiverPhone: phone }
      ]
    }

    if (driverId) {
      where.driverId = driverId
    }

    const parcels = await prisma.parcel.findMany({
      where,
      include: {
        pod: true,
        driver: true
      } as any,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined
    })
    return NextResponse.json(parcels)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch parcels' }, { status: 500 })
  }
}
