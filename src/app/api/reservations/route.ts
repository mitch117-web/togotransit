import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { generateNumeroBillet, generateQRPayload } from '@/lib/paygate'
import { z } from 'zod'

const passagerSchema = z.object({
  nom_complet: z.string().min(2, 'Nom du passager requis'),
  telephone: z.string().min(8, 'Téléphone passager invalide'),
  numero_siege: z.string().max(10).optional().nullable(),
})

const createReservationSchema = z.object({
  trajet_id: z.number().int().positive(),
  passagers: z.array(passagerSchema).min(1, 'Au moins un passager requis'),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const body = await request.json()
    const parsed = createReservationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { trajet_id, passagers } = parsed.data
    const nombre_places = passagers.length
    const utilisateur_id = auth!.userId

    const result = await prisma.$transaction(
      async (tx: any) => {
        const trajet = await tx.trajet.findUnique({
          where: { id: trajet_id },
          include: { vehicule: true },
        })

        if (!trajet) {
          throw Object.assign(new Error('Trajet non trouvé'), { statusCode: 404, errorMsg: 'Trajet non trouvé' })
        }

        if (trajet.statut !== 'planifie') {
          const raison = trajet.statut === 'annule' ? 'Ce trajet a été annulé' 
            : trajet.statut === 'termine' ? 'Ce trajet est déjà terminé'
            : 'Ce trajet n\'est plus disponible'
          throw Object.assign(new Error(raison), { statusCode: 409, errorMsg: raison })
        }

        const places_dispos = trajet.places_disponibles ?? trajet.vehicule?.nombre_places ?? 0

        if (places_dispos < nombre_places) {
          const msg = places_dispos === 0
            ? 'Ce trajet est complet. Plus de places disponibles.'
            : `Places insuffisantes. Il reste ${places_dispos} place${places_dispos > 1 ? 's' : ''}.`
          throw Object.assign(new Error(msg), { statusCode: 409, errorMsg: msg })
        }

        const montant_total = trajet.prix * nombre_places

        const reservation = await tx.reservation.create({
          data: {
            trajet_id,
            utilisateur_id,
            nombre_places,
            montant_total,
            statut: 'en_attente',
            passagers: {
              create: passagers.map((p: any) => ({
                nom_complet: p.nom_complet,
                telephone: p.telephone,
                numero_siege: p.numero_siege ?? null,
              })),
            },
          },
          include: {
            passagers: true,
            trajet: {
              include: {
                compagnie: true,
                ville_depart: true,
                ville_arrivee: true,
                vehicule: true,
              },
            },
          },
        })

        await tx.trajet.update({
          where: { id: trajet_id },
          data: { places_disponibles: { decrement: nombre_places } },
        })

        try {
          await tx.notification.create({
            data: {
              userId: utilisateur_id,
              tripId: trajet_id,
              title: 'Réservation enregistrée',
              message: `Votre réservation #${reservation.id} a été créée. En attente de paiement.`,
              type: 'RESERVATION',
              isRead: false,
            },
          })
        } catch (_) { /* optional */ }

        return {
          status: 201,
          data: reservation,
        }
      },
      {
        maxWait: 10000,
        timeout: 15000,
        isolationLevel: undefined as any,
      }
    )

    if ((result as any).error) {
      return NextResponse.json({ error: (result as any).error }, { status: (result as any).status || 400 })
    }

    return NextResponse.json({
      success: true,
      reservation: result.data,
      numero_billet: generateNumeroBillet(),
      qr_payload: generateQRPayload(result.data.id, generateNumeroBillet()),
      montant_attendu: result.data.montant_total,
    })
  } catch (error: any) {
    console.error('Reservation POST Error:', error?.message ?? error)
    if (error?.statusCode && error?.errorMsg) {
      return NextResponse.json(
        { error: error.errorMsg },
        { status: error.statusCode }
      )
    }
    if (error?.code === 'P2034' || /transaction|deadlock|busy|lock/i.test(error?.message || '')) {
      return NextResponse.json(
        { error: 'Conflit de réservation détecté. Veuillez réessayer.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la réservation. Réessayez.' },
      { status: 500 }
    )
  }
}
