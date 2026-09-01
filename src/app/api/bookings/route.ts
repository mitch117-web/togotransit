import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { generateNumeroBillet, generateQRPayload } from '@/lib/paygate'

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

    // Un siège ne peut être attribué qu'une seule fois sur ce trajet — on
    // vérifie parmi les passagers déjà enregistrés (le vrai numéro de siège
    // vit sur Passager.numero_siege, pas sur Reservation).
    if (seatNumber) {
      const dejaPris = await prisma.passager.findFirst({
        where: {
          numero_siege: String(seatNumber),
          reservation: { trajet_id: trajetId, statut: { not: 'annulee' } },
        },
      })
      if (dejaPris) {
        return NextResponse.json({ error: `Le siège #${seatNumber} est déjà réservé` }, { status: 409 })
      }
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: userIdNum } })
    if (!utilisateur) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const newReservation = await prisma.reservation.create({
      data: {
        trajet_id: trajetId,
        utilisateur_id: userIdNum,
        statut,
        montant_total: trajet.prix ?? 0,
        nombre_places: 1,
        passagers: {
          create: {
            nom_complet: `${utilisateur.prenom ?? ''} ${utilisateur.nom ?? ''}`.trim(),
            telephone: utilisateur.telephone,
            numero_siege: seatNumber ? String(seatNumber) : null,
          },
        },
      } as any,
      include: {
        trajet: true,
        utilisateur: {
          select: { id: true, nom: true, prenom: true, telephone: true, email: true }
        },
        passagers: true,
      }
    })

    // Décrémenter places_disponibles sur le trajet
    await prisma.trajet.update({
      where: { id: trajetId },
      data: { places_disponibles: trajet.places_disponibles - 1 } as any
    })

    // Une réservation créée au guichet est payée sur place (espèces) : il
    // n'y a pas de webhook opérateur qui viendra confirmer le paiement et
    // générer le billet plus tard, contrairement au flux de réservation
    // mobile — on doit donc le faire immédiatement ici, sinon le voyageur
    // reste bloqué sur "Billet en cours de génération" indéfiniment.
    if (statut === 'confirmee') {
      await prisma.paiement.create({
        data: {
          reservation_id: newReservation.id,
          methode: 'autre',
          reference_transaction: `GUICHET-${newReservation.id}-${Date.now()}`,
          montant: newReservation.montant_total,
          statut: 'reussi',
          date_paiement: new Date(),
        } as any,
      })

      const numero_billet = generateNumeroBillet()
      await prisma.billet.create({
        data: {
          reservation_id: newReservation.id,
          numero_billet,
          statut: 'valide',
          code_qr: generateQRPayload(newReservation.id, numero_billet),
        },
      })
    }

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
