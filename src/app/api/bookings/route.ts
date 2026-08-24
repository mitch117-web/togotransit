import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
        utilisateur: true,
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
          utilisateur_id: userIdNum,
          titre: 'Réservation confirmée ! 🎫',
          message: `Réservation #${newReservation.id} confirmée pour le trajet.`,
          type: 'RESERVATION',
        } as any
      })
    } catch (_) { /* notification optionnelle */ }

    return NextResponse.json(newReservation)
  } catch (error) {
    console.error('Booking Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la réservation' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tripId = searchParams.get('tripId')
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')
  const limit = searchParams.get('limit')

  try {
    const where: any = {}
    if (tripId) where.trajet_id = parseInt(tripId, 10)
    if (userId) where.utilisateur_id = parseInt(userId, 10)
    if (status) where.statut = statutMap[status] ?? status

    const bookings = await prisma.reservation.findMany({
      where,
      include: {
        utilisateur: true,
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
