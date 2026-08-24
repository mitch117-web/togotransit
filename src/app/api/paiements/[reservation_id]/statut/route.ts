import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reservation_id: string }> }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { reservation_id } = await params
    const reservationId = parseInt(reservation_id, 10)
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'ID réservation invalide' }, { status: 400 })
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        paiements: {
          orderBy: { id: 'desc' },
        },
        billets: true,
        trajet: {
          include: { compagnie: true, ville_depart: true, ville_arrivee: true },
        },
        passagers: true,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Réservation non trouvée' }, { status: 404 })
    }

    if (auth!.role === 'voyageur' && reservation.utilisateur_id !== auth!.userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (auth!.role === 'gestionnaire' && reservation.trajet?.compagnie_id !== auth!.compagnieId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const dernierPaiement = reservation.paiements[0]

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        statut: reservation.statut,
        montant_total: reservation.montant_total,
        nombre_places: reservation.nombre_places,
        date_reservation: reservation.date_reservation,
      },
      paiement: dernierPaiement
        ? {
            id: dernierPaiement.id,
            methode: dernierPaiement.methode,
            statut: dernierPaiement.statut,
            montant: dernierPaiement.montant,
            reference_transaction: dernierPaiement.reference_transaction,
            date_paiement: dernierPaiement.date_paiement,
            peut_annuler: dernierPaiement.statut === 'en_attente',
          }
        : {
            statut: 'aucun',
            message: 'Aucun paiement initié pour cette réservation',
          },
      billets_disponibles: reservation.statut === 'confirmee'
        ? reservation.billets.map((b) => ({
            id: b.id,
            numero_billet: b.numero_billet,
            statut: b.statut,
            code_qr: b.code_qr,
          }))
        : [],
      trajet_encore_disponible:
        reservation.trajet?.statut === 'planifie' &&
        (reservation.trajet.places_disponibles > 0 || reservation.statut === 'confirmee' || reservation.statut === 'en_attente'),
      prochain_poll_ms: 3000,
      delai_expiration_sans_paiement_s: 1800,
    })
  } catch (error) {
    console.error('Paiement Statut Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
