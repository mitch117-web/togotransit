import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { generateNumeroBillet, generateQRPayload } from '@/lib/paygate'
import { z } from 'zod'

const mockSchema = z.object({
  reference_transaction: z.string().min(1),
  statut: z.enum(['reussi', 'echoue']),
})

/**
 * Simule le retour d'un opérateur Mobile Money, pour permettre de tester le
 * tunnel de paiement de bout en bout sans compte marchand PayGate réel
 * (voir le mode démo dans /api/paiements/initier). N'agit JAMAIS sur un
 * paiement réel : la référence doit obligatoirement commencer par "MOCK-",
 * qui n'est produite que par le mode démo côté serveur.
 */
export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const body = await request.json()
    const parsed = mockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }
    const { reference_transaction, statut } = parsed.data

    if (!reference_transaction.startsWith('MOCK-')) {
      return NextResponse.json(
        { error: 'Ce webhook de test ne peut agir que sur un paiement en mode démo.' },
        { status: 403 }
      )
    }

    const paiement = await prisma.paiement.findFirst({
      where: { reference_transaction },
      include: {
        reservation: {
          include: {
            trajet: { include: { compagnie: true, ville_depart: true, ville_arrivee: true } },
            passagers: true,
          },
        },
      },
    })

    if (!paiement) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
    }

    const reservation = paiement.reservation
    if (!reservation) {
      return NextResponse.json({ error: 'Réservation associée introuvable' }, { status: 404 })
    }

    if (auth!.role === 'voyageur' && reservation.utilisateur_id !== auth!.userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (auth!.role === 'gestionnaire' && reservation.trajet?.compagnie_id !== auth!.compagnieId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const nouveauStatut = statut === 'reussi' ? 'reussi' : 'echoue'

    await prisma.paiement.update({
      where: { id: paiement.id },
      data: {
        statut: nouveauStatut,
        date_paiement: statut === 'reussi' ? new Date() : null,
      },
    })

    if (statut === 'reussi') {
      if (reservation.statut !== 'confirmee') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { statut: 'confirmee' },
        })
      }

      const billetsExistants = await prisma.billet.findMany({
        where: { reservation_id: reservation.id },
      })

      if (billetsExistants.length === 0) {
        for (const _passager of reservation.passagers) {
          const numero_billet = generateNumeroBillet()
          await prisma.billet.create({
            data: {
              reservation_id: reservation.id,
              numero_billet,
              statut: 'valide',
              code_qr: generateQRPayload(reservation.id, numero_billet),
            },
          })
        }
      }

      await prisma.notification.create({
        data: {
          userId: reservation.utilisateur_id,
          tripId: reservation.trajet_id,
          title: 'Paiement confirmé ! 🎫 (démo)',
          message: `Votre réservation #${reservation.id} est confirmée. Billets disponibles dans "Mes réservations".`,
          type: 'PAIEMENT',
          isRead: false,
        },
      })
    } else {
      await prisma.notification.create({
        data: {
          userId: reservation.utilisateur_id,
          tripId: reservation.trajet_id,
          title: 'Paiement échoué (démo)',
          message: `Le paiement pour la réservation #${reservation.id} a échoué. Réessayez.`,
          type: 'PAIEMENT',
          isRead: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      mode_demo: true,
      paiement_id: paiement.id,
      reservation_id: reservation.id,
      statut: nouveauStatut,
      reservation_statut: statut === 'reussi' ? 'confirmee' : reservation.statut,
      billet_genere: statut === 'reussi',
    })
  } catch (error: any) {
    console.error('Mock Webhook Error:', error)
    return NextResponse.json({ error: 'Erreur traitement webhook de démo' }, { status: 500 })
  }
}
