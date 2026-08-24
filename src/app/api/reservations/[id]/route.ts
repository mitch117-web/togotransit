import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole, assertCompagnieOwnership } from '@/lib/auth'

export async function GET(
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

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        trajet: {
          include: {
            compagnie: true,
            vehicule: true,
            ville_depart: true,
            ville_arrivee: true,
          },
        },
        passagers: true,
        paiements: true,
        billets: true,
        utilisateur: {
          select: { id: true, nom: true, prenom: true, telephone: true, email: true },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Réservation non trouvée' }, { status: 404 })
    }

    if (auth!.role === 'voyageur' && reservation.utilisateur_id !== auth!.userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (auth!.role === 'gestionnaire') {
      const denied = await assertCompagnieOwnership(auth, reservation.trajet?.compagnie_id)
      if (denied) return denied
    }

    return NextResponse.json({
      success: true,
      data: reservation,
    })
  } catch (error) {
    console.error('Reservation GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
