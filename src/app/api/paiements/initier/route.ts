import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { initierPaiement } from '@/lib/paygate'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { z } from 'zod'

const initierSchema = z.object({
  reservation_id: z.number().int().positive(),
  methode: z.enum(['flooz', 'tmoney']),
  numero_telephone: z.string().regex(/^[0-9+]+$/, 'Format de téléphone invalide').min(8, 'Téléphone trop court'),
})

export async function POST(request: Request) {
  try {
    // Validation du corps de la requête
    const body = await request.json()
    const parsed = initierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { reservation_id, methode, numero_telephone } = parsed.data

    // Extraction de l'auth utilisateur
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    // Récupération de la réservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservation_id },
      include: {
        trajet: {
          include: { compagnie: true, ville_depart: true, ville_arrivee: true },
        },
        passagers: true,
        utilisateur: true,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Réservation non trouvée' }, { status: 404 })
    }

    // Vérification des droits d'accès
    if (auth!.role === 'voyageur' && reservation.utilisateur_id !== auth!.userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (auth!.role === 'gestionnaire' && reservation.trajet?.compagnie_id !== auth!.compagnieId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (reservation.statut === 'annulee') {
      return NextResponse.json({ error: 'Réservation annulée, paiement impossible' }, { status: 400 })
    }
    if (reservation.statut === 'confirmee') {
      return NextResponse.json({
        error: 'Réservation déjà confirmée',
        deja_confirmee: true,
        reservation_id,
      }, { status: 400 })
    }

    if (reservation.trajet?.statut !== 'planifie') {
      return NextResponse.json({
        error: 'Ce trajet n\'est plus disponible à la réservation.',
      }, { status: 409 })
    }

    if (reservation.trajet.places_disponibles < 0) {
      return NextResponse.json(
        { error: 'Plus de places disponibles pour ce trajet.' },
        { status: 409 }
      )
    }

    // --- Appel à PayGate (règles activées seulement si credentials configurés) ---
    try {
      // On détermine le montant total de la réservation
      const montantTotal = reservation.montant_total

      // Appel client PayGate : methode attendue 'flooz' ou 'tmoney'
      const paygateResult = await initierPaiement({
        montant: montantTotal,
        numeroTelephone: numero_telephone,
        methode,
        reservationId: String(reservation.id),
      })

      // Enregistrement en base d'un paiement avec statut 'en_attente'
      // et la référence retournée par PayGate
      const referencePayGate = paygateResult.reference

      const paiement = await prisma.paiement.create({
        data: {
          reservation_id,
          methode,
          montant: montantTotal,
          reference_transaction: referencePayGate,
          statut: 'en_attente',
        },
      })

      // Retours d'instructions à l'utilisateur (telles que fournies par PayGate)
      const instructions = paygateResult.instructions || [
        '1. Ouvrez le menu Mobile Money de votre téléphone',
        methode === 'flooz' ? '2. Choisissez "Moov Money" > "Payer un marchand"' : '2. Choisissez "T-Money" > "Paiement service"',
        `3. Code marchand: TG-TRANSIT-${methode.toUpperCase()}`,
        `4. Montant: ${montantTotal} XOF`,
        `5. Référence: ${referencePayGate}`,
        '6. Validez avec votre code PIN',
        '7. Revenez sur l\'app, le statut sera mis à jour automatiquement',
      ]

      return NextResponse.json({
        success: true,
        paiement: {
          id: paiement.id,
          reference_transaction: paiement.reference_transaction,
          methode: paiement.methode,
          montant: paiement.montant,
          statut: paiement.statut,
          provider_label: methode === 'flooz' ? 'Flooz (Moov Money Togo)' : 'T-Money (Togocom)',
          instructions,
        },
        date_expiration_attente: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
    } catch (paygateError: any) {
      // Erreur PayGate (API injoignable, clés manquantes, etc.)
      console.error('Erreur PayGate:', paygateError.message)

      // On ne fait pas tomber l'ensemble de la requête — on renvoie une erreur
      // claire indiquant que le paiement est temporairement indisponible
      return NextResponse.json(
        {
          error: 'Service de paiement temporairement indisponible.',
          detail: paygateError.message,
          // On prouve quand même qu'on a identifié la réservation
          reservation_id,
        },
        { status: 503 }
      )
    }
  } catch (error: any) {
    console.error('Initier Paiement Error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'initialisation du paiement' }, { status: 500 })
  }
}