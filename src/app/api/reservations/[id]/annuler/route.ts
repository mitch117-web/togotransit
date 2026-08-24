import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole, assertCompagnieOwnership } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = await params
    const reservationId = parseInt(id, 10)
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const result = await prisma.$transaction(
      async (tx: any) => {
        await tx.$executeRawUnsafe('BEGIN IMMEDIATE')

        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          include: {
            trajet: true,
          },
        })

        if (!reservation) {
          await tx.$executeRawUnsafe('ROLLBACK')
          return { status: 404, error: 'Réservation non trouvée' }
        }

        if (auth!.role === 'voyageur' && reservation.utilisateur_id !== auth!.userId) {
          await tx.$executeRawUnsafe('ROLLBACK')
          return { status: 403, error: 'Accès refusé' }
        }

        if (auth!.role === 'gestionnaire') {
          if (reservation.trajet?.compagnie_id !== auth!.compagnieId) {
            await tx.$executeRawUnsafe('ROLLBACK')
            return { status: 403, error: 'Accès refusé' }
          }
        }

        if (reservation.statut === 'annulee') {
          await tx.$executeRawUnsafe('ROLLBACK')
          return { status: 400, error: 'Réservation déjà annulée' }
        }

        const dateDepart = new Date(reservation.trajet?.date_depart || Date.now())
        const now = new Date()
        if (auth!.role === 'voyageur' && dateDepart.getTime() < now.getTime()) {
          await tx.$executeRawUnsafe('ROLLBACK')
          return { status: 400, error: 'Impossible d\'annuler un trajet déjà parti.' }
        }

        await tx.reservation.update({
          where: { id: reservationId },
          data: { statut: 'annulee' },
        })

        if (reservation.trajet_id) {
          await tx.trajet.update({
            where: { id: reservation.trajet_id },
            data: { places_disponibles: { increment: reservation.nombre_places } },
          })
        }

        await tx.billet.updateMany({
          where: { reservation_id: reservationId },
          data: { statut: 'annule' },
        })

        try {
          await tx.notification.create({
            data: {
              userId: reservation.utilisateur_id,
              tripId: reservation.trajet_id,
              title: 'Réservation annulée',
              message: `Votre réservation #${reservationId} a été annulée.`,
              type: 'RESERVATION',
              isRead: false,
            },
          })
        } catch (_) { /* optional */ }

        await tx.$executeRawUnsafe('COMMIT')
        return { status: 200, data: { id: reservationId, statut: 'annulee' } }
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    )

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Réservation annulée',
      data: result.data,
    })
  } catch (error: any) {
    console.error('Annulation Error:', error)
    if (/transaction|deadlock|busy/i.test(error?.message || '')) {
      return NextResponse.json(
        { error: 'Conflit. Veuillez réessayer.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
