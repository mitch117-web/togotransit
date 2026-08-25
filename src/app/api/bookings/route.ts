import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

const statutMap: Record<string, any> = {
  CONFIRMED: 'confirmee',
  PENDING: 'en_attente',
  CANCELLED: 'annulee',
  COMPLETED: 'confirmee',
  BOARDED: 'confirmee',
  en_attente: 'en_attente',
  confirmee: 'confirmee',
  annulee: 'annulee',
  terminee: 'confirmee',
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    // Réservation créée pour un client par un agent au guichet (walk-in).
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const data = await request.json()
    const trajetId = typeof data.tripId === 'string' ? parseInt(data.tripId, 10) : data.tripId
    const userIdNum = typeof data.userId === 'string' ? parseInt(data.userId, 10) : data.userId
    const seatNumber = parseInt(data.seatNumber, 10)

    const statut = statutMap[data.status] ?? 'confirmee'

    const trajet = await prisma.trajet.findUnique({
      where: { id: trajetId }
    })

    if (!trajet) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }
    if (auth!.role === 'gestionnaire' && trajet.compagnie_id !== auth!.compagnieId) {
      return NextResponse.json({ error: 'Accès refusé. Ce trajet appartient à une autre compagnie.' }, { status: 403 })
    }

    // Vérifier disponibilité via places_disponibles
    if (trajet.places_disponibles < 1) {
      return NextResponse.json({ error: 'Ce trajet est complet' }, { status: 400 })
    }

    const newReservation = await prisma.reservation.create({
      data: {
        trajet_id: trajetId,
        utilisateur_id: userIdNum,
        statut,
        montant_total: trajet.prix ?? 0,
        nombre_places: seatNumber || 1,
      } as any,
      include: {
        trajet: true,
        utilisateur: {
          select: { id: true, nom: true, prenom: true, telephone: true, email: true }
        },
      }
    })

    // Décrémenter places_disponibles sur le trajet
    await prisma.trajet.update({
      where: { id: trajetId },
      data: { places_disponibles: trajet.places_disponibles - 1 } as any
    })

    // CREATE NOTIFICATION
    try {
      await prisma.notification.create({
        data: {
          userId: userIdNum,
          title: 'Réservation confirmée ! 🎫',
          message: `Réservation #${newReservation.id} confirmée pour le trajet.`,
          type: 'RESERVATION',
        }
      })
    } catch (_) { /* notification optionnelle */ }

    return NextResponse.json(newReservation)
  } catch (error) {
    console.error('Booking Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la réservation' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    const where: any = {}
    if (tripId) where.trajet_id = parseInt(tripId, 10)
    if (status) where.statut = statutMap[status] ?? status

    if (auth!.role === 'voyageur') {
      // Toujours ses propres réservations — le paramètre `userId` éventuel est ignoré.
      where.utilisateur_id = auth!.userId
    } else if (auth!.role === 'gestionnaire') {
      where.trajet = { compagnie_id: auth!.compagnieId ?? -1 }
    }

    const bookings = await prisma.reservation.findMany({
      where,
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true, telephone: true, email: true }
        },
        trajet: {
          include: {
            vehicule: true,
            ville_depart: true,
            ville_arrivee: true,
          }
        },
        passagers: true,
      },
      orderBy: { date_reservation: 'desc' } as any,
      take: limit ? parseInt(limit) : undefined
    })
    return NextResponse.json(bookings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
