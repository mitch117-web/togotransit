import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

async function findParcel(id: string) {
  const idNum = parseInt(id, 10)
  return prisma.parcel.findFirst({
    where: {
      OR: [
        { id: isNaN(idNum) ? undefined : idNum },
        { trackingId: id }
      ].filter((x: any) => x.id !== undefined || x.trackingId !== undefined) as any
    }
  })
}

function canAccessParcel(auth: NonNullable<Awaited<ReturnType<typeof extractAuthFromRequest>>>, parcel: { compagnie_id: number | null; driverId: number | null }) {
  if (auth.role === 'super_admin') return true
  if (auth.role === 'gestionnaire') return parcel.compagnie_id === auth.compagnieId
  if (auth.role === 'voyageur') return parcel.driverId === auth.userId
  return false
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const auth = await extractAuthFromRequest(request as any)

    // Un identifiant de tracking (non numérique) reste consultable publiquement,
    // comme la page web /tracking.
    if (isNaN(idNum) && !auth) {
      const pod = await prisma.pOD.findFirst({ where: { parcel: { trackingId: id } } })
      if (!pod) return NextResponse.json({ error: 'POD not found' }, { status: 404 })
      return NextResponse.json(pod)
    }

    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const parcel = await findParcel(id)
    if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    if (!canAccessParcel(auth!, parcel)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const pod = await prisma.pOD.findUnique({ where: { parcelId: parcel.id } })
    if (!pod) {
      return NextResponse.json({ error: 'POD not found' }, { status: 404 })
    }

    return NextResponse.json(pod)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch POD' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const data = await request.json()

    const parcel = await findParcel(id)
    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    }
    // Seul le chauffeur assigné, un gestionnaire de la compagnie du colis, ou
    // un super_admin peut certifier une livraison (preuve de livraison).
    if (!canAccessParcel(auth!, parcel)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const parcelUuid = parcel.id

    // 1. Create or Update POD record (Upsert)
    const pod = await prisma.pOD.upsert({
      where: { parcelId: parcelUuid },
      update: {
        signatureUrl: data.signature,
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: data.photo,
      },
      create: {
        parcelId: parcelUuid,
        signatureUrl: data.signature,
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: data.photo,
      }
    })

    // 2. Update Parcel status and statusHistory
    const statusHistory = JSON.parse(parcel.statusHistory || '[]')
    statusHistory.push({
      status: 'DELIVERED',
      timestamp: new Date().toISOString(),
      location: parcel.destination,
      note: 'Colis livré avec succès'
    })

    const updatedParcel = await prisma.parcel.update({
      where: { id: parcelUuid },
      data: {
        status: 'DELIVERED',
        statusHistory: JSON.stringify(statusHistory)
      }
    })

    // CREATE NOTIFICATION for sender if senderId exists
    if (parcel.senderId) {
      await prisma.notification.create({
        data: {
          userId: parcel.senderId,
          title: 'Colis livré ! 📦',
          message: `Votre colis (${parcel.trackingId}) a été remis à ${parcel.receiverName}.`,
          type: 'PARCEL'
        }
      })
    }

    // 3. Send SMS notification
    await sendSMS(
      updatedParcel.senderPhone,
      `TogoTransit: Votre colis ${updatedParcel.trackingId} a été livré à ${updatedParcel.receiverName} avec succès.`
    )

    return NextResponse.json({
      message: 'Ticket validé avec succès',
      pod
    })
  } catch (error) {
    console.error('POD Save Error:', error)
    return NextResponse.json({ error: 'Failed to save POD' }, { status: 500 })
  }
}
