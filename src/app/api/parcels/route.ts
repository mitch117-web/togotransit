import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'
import { extractAuthFromRequest } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

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
        senderId: auth.role === 'voyageur' ? auth.userId : (data.senderId ?? null),
        driverId: data.driverId ?? null,
        compagnie_id: auth.role === 'gestionnaire' ? auth.compagnieId : (data.compagnie_id ?? null),
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
        photo: data.photo ?? null,
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
    const auth = await extractAuthFromRequest(request as any)

    // Suivi public : un numéro de tracking exact agit comme un jeton d'accès à
    // ce seul colis (comme la page web publique /tracking), sans authentification.
    if (!auth) {
      if (!q) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
      const parcel = await prisma.parcel.findUnique({
        where: { trackingId: q },
        include: { pod: true },
      })
      return NextResponse.json(parcel ? [parcel] : [])
    }

    const where: any = {}

    if (q) {
      where.trackingId = { contains: q }
    }

    if (auth.role === 'voyageur') {
      // Un voyageur voit ses propres envois (en tant qu'expéditeur) ainsi que
      // les colis qui lui sont assignés en tant que chauffeur — jamais les
      // colis d'un tiers, quel que soit le paramètre `phone` envoyé par le client.
      where.OR = [{ senderId: auth.userId }, { driverId: auth.userId }, { senderPhone: phone ?? undefined }]
    } else {
      // gestionnaire / super_admin
      if (auth.role === 'gestionnaire') {
        where.compagnie_id = auth.compagnieId ?? -1
      }
      if (phone) {
        where.OR = [{ senderPhone: phone }, { receiverPhone: phone }]
      }
      if (driverId) {
        where.driverId = driverId
      }
    }

    const parcels = await prisma.parcel.findMany({
      where,
      include: {
        pod: true,
        driver: {
          select: { id: true, nom: true, prenom: true, telephone: true }
        }
      } as any,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined
    })
    return NextResponse.json(parcels)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch parcels' }, { status: 500 })
  }
}
