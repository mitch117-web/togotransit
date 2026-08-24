import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifierSignatureWebhook, generateNumeroBillet, generateQRPayload } from '@/lib/paygate'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const rawBody = await request.text()
    let body: any

    try {
      body = JSON.parse(rawBody)
    } catch {
      body = {}
    }

    console.log(`[WEBHOOK ${provider}] reçu:`, JSON.stringify(body).slice(0, 500))

    // --- Validation de la signature PayGate ---
    const signatureHeader = request.headers.get('x-signature') || request.headers.get('signature')
    const validation = verifierSignatureWebhook(body, signatureHeader ?? '')

    if (!validation.valid) {
      console.error(`[WEBHOOK ${provider}] Signature invalide!`, validation.message)
      return NextResponse.json(
        { success: false, error: validation.message || 'Signature webhook invalide' },
        { status: 401 }
      )
    }

    // La signature est valide — on extrait la transaction
    const transaction = validation.transaction
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Corps de webhook valide mais aucune donnée transactionnelle identifiable' },
        { status: 400 }
      )
    }

    const reference_transaction = transaction.reference

    // --- Traitement dans une transaction PostgreSQL atomique ---
    const paiement = await prisma.paiement.findFirst({
      where: { reference_transaction },
      include: {
        reservation: {
          include: {
            trajet: {
              include: { compagnie: true, ville_depart: true, ville_arrivee: true },
            },
            utilisateur: true,
            passagers: true,
            paiements: true,
          },
        },
      },
    })

    if (!paiement) {
      return NextResponse.json(
        { status: 404, error: `Aucun paiement trouvé pour référence ${reference_transaction}` },
        { status: 404 }
      )
    }

    // Idempotence : si le statut est déjà terminal, on renvoie immédiatement
    if (paiement.statut === 'reussi' && transaction.status === 'réussi') {
      return NextResponse.json({
        status: 200,
        idempotent: true,
        message: 'Paiement déjà traité (idempotence OK)',
        paiement_id: paiement.id,
      })
    }

    if (paiement.statut === 'echoue' && transaction.status === 'échoué') {
      return NextResponse.json({
        status: 200,
        idempotent: true,
        message: 'Échec déjà enregistré',
        paiement_id: paiement.id,
      })
    }

    // Mise à jour du statut du paiement (mappe le statut PayGate vers l'enum Prisma)
    const nouveauStatut = transaction.status === 'réussi' ? 'reussi' : transaction.status === 'échoué' ? 'echoue' : 'en_attente'
    await prisma.paiement.update({
      where: { id: paiement.id },
      data: {
        statut: nouveauStatut,
        date_paiement: transaction.status === 'réussi' ? new Date() : null,
      },
    })

    const reservation = paiement.reservation
    if (!reservation) {
      return NextResponse.json({ status: 404, error: 'Réservation associée introuvable' }, { status: 404 })
    }

    // Traitement selon le statut
    if (transaction.status === 'réussi') {
      // Confirmation de la réservation si ce n'est pas déjà le cas
      if (reservation.statut !== 'confirmee') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { statut: 'confirmee' },
        })
      }

      // Génération des billets UNIQUEMENT s'ils n'existent pas déjà
      const billetsExistants = await prisma.billet.findMany({
        where: { reservation_id: reservation.id },
      })

      if (billetsExistants.length === 0) {
        for (const passager of reservation.passagers) {
          const numero_billet = generateNumeroBillet()
          await prisma.billet.create({
            data: {
              reservation_id: reservation.id,
              numero_billet,
              statut: 'valide',
              code_qr: generateQRPayload(reservation.id, numero_billet),
            }
          })
        }
      }

      // Notification au voyageur
      await prisma.notification.create({
        data: {
          userId: reservation.utilisateur_id,
          tripId: reservation.trajet_id,
          title: 'Paiement confirmé ! 🎫',
          message: `Votre réservation #${reservation.id} est confirmée. Billets disponibles dans "Mes réservations".`,
          type: 'PAIEMENT',
          isRead: false,
        }
      })
    }
    else if (transaction.status === 'échoué') {
      // Marquer l'échec
      if (reservation.statut === 'en_attente') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { statut: 'en_attente' },
        })
      }

      await prisma.notification.create({
        data: {
          userId: reservation.utilisateur_id,
          tripId: reservation.trajet_id,
          title: 'Paiement échoué',
          message: `Le paiement pour la réservation #${reservation.id} a échoué. Réessayez.`,
          type: 'PAIEMENT',
          isRead: false,
        }
      })
    }

    return NextResponse.json({
      status: 200,
      paiement_id: paiement.id,
      reservation_id: reservation.id,
      statut: transaction.status,
      reservation_statut: transaction.status === 'réussi' ? 'confirmee' : reservation.statut,
      billet_genere: transaction.status === 'réussi',
    })
  } catch (error: any) {
    console.error(`Webhook paiement Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Erreur traitement webhook', message: error?.message },
      { status: 500 }
    )
  }
}