import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'ID de réservation manquant' }, { status: 400 })
    }

    const bookingIdNum = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId

    const booking = await prisma.reservation.findUnique({
      where: { id: bookingIdNum },
      include: {
        utilisateur: true,
        trajet: {
          include: {
            vehicule: true
          }
        }
      } as any
    })

    if (!booking) {
      return NextResponse.json({ error: 'Réservation non trouvée' }, { status: 404 })
    }

    // Marquer la réservation comme validée (statut restera confirmee mais on peut noter)
    // Pour simuler l'embarquement, on passe à "terminee" ou on garde "confirmee"
    const updatedBooking = await prisma.reservation.update({
      where: { id: bookingIdNum },
      data: { statut: 'terminee' } as any,
      include: {
        utilisateur: true,
        trajet: {
          include: {
            vehicule: true
          }
        }
      } as any
    })

    return NextResponse.json({
      message: 'Ticket validé avec succès',
      booking: updatedBooking
    })
  } catch (error) {
    console.error('Validation Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la validation' }, { status: 500 })
  }
}
