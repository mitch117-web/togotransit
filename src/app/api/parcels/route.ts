import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'
import { extractAuthFromRequest } from '@/lib/auth'
import { toPublicParcel, SELECTION_SUIVI_PUBLIC } from '@/lib/parcel-public'
import { estimerPrixColis } from '@/lib/parcel-price'
import { z } from 'zod'

const texte = (max: number) => z.string().trim().min(1).max(max)

// Ce que le guichet (formulaire du portail) ou l'application mobile envoie pour enregistrer un colis.
// Les champs inconnus sont ignorés ; les nombres sont acceptés sous forme de texte.
const creerColisSchema = z.object({
  senderId: z.coerce.number().int().positive().nullish(),
  driverId: z.coerce.number().int().positive().nullish(),
  senderName: texte(120),
  senderPhone: texte(30),
  receiverName: texte(120),
  receiverPhone: texte(30),
  weight: z.coerce.number().positive().max(1000),
  origin: texte(80),
  destination: texte(80),
  category: texte(40),
  deliveryType: texte(40),
  price: z.coerce.number().min(0).max(100_000_000).optional(),
  paymentMethod: z.string().trim().max(30).nullish(),
  photo: z.string().max(4_500_000).nullish(),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    // Le super-administrateur supervise la plateforme sans écrire sur les opérations d'une compagnie.
    if (auth.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Le super-administrateur supervise la plateforme : cette opération est réservée aux gestionnaires de compagnie.' },
        { status: 403 }
      )
    }

    const parsed = creerColisSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 })
    }
    const data = parsed.data

    // Deux origines, deux niveaux de confiance. Au guichet, l'agent de la compagnie pèse le colis, fixe le
    // prix et encaisse. Depuis l'application, rien n'a encore été pesé ni payé : le serveur recalcule lui-même
    // l'estimation (le prix envoyé par le téléphone est ignoré), le colis reste « à payer », et le client ne
    // choisit ni le chauffeur ni la compagnie.
    const auGuichet = auth.role === 'gestionnaire'
    if (auGuichet && data.price === undefined) {
      return NextResponse.json({ error: 'Prix requis' }, { status: 400 })
    }
    const price = auGuichet ? data.price! : estimerPrixColis(data.weight, data.category)
    const paymentStatus = auGuichet && data.paymentMethod !== 'CASH' ? 'PAID' : 'PENDING'

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
        senderId: auGuichet ? (data.senderId ?? null) : auth.userId,
        driverId: auGuichet ? (data.driverId ?? null) : null,
        compagnie_id: auGuichet ? auth.compagnieId : null,
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        weight: data.weight,
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
        price,
        paymentStatus,
        paymentMethod: data.paymentMethod ?? null,
        photo: data.photo ?? null,
      } as any
    })

    // Notification SMS Simulation
    await sendSMS(
      data.senderPhone,
      `TogoTransit: Votre colis pour ${data.receiverName} a été enregistré. Tracking ID: ${trackingId}. Prix: ${price} F.`
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

    // Suivi public : un numéro de tracking exact donne accès, sans authentification, au seul suivi de ce
    // colis (comme la page web publique /tracking). Les numéros étant séquentiels, on ne charge et on ne
    // renvoie que la projection publique : jamais noms, téléphones, prix, positions GPS, signature ni photo.
    if (!auth) {
      if (!q) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
      const parcel = await prisma.parcel.findUnique({
        where: { trackingId: q },
        select: SELECTION_SUIVI_PUBLIC,
      })
      return NextResponse.json(parcel ? [toPublicParcel(parcel)] : [])
    }

    const where: any = {}

    if (q) {
      where.trackingId = { contains: q }
    }

    if (auth.role === 'voyageur') {
      // Un voyageur voit ses propres envois (en tant qu'expéditeur) ainsi que
      // les colis qui lui sont assignés en tant que chauffeur — jamais les
      // colis d'un tiers : le paramètre `phone` est ignoré pour ce rôle (un
      // numéro de téléphone se saisit librement, il ne prouve pas à qui est le colis).
      where.OR = [{ senderId: auth.userId }, { driverId: auth.userId }]
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
