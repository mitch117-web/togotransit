import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { extractNumeroBillet } from '@/lib/billet'
import { departureInstant } from '@/lib/trajet-time'
import { z } from 'zod'

// Le scanner envoie ce qu'il a lu : adresse de vérification, ancien QR au format JSON ou numéro seul.
const verifierSchema = z.object({
  numero_billet: z.string().optional(),
  code_qr_payload: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    // Un voyageur ne peut valider un embarquement que s'il est le chauffeur
    // assigné au trajet du billet — vérifié après lecture du billet ci-dessous.
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const body = await request.json()
    const parsed = verifierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const numero_billet =
      extractNumeroBillet(parsed.data.numero_billet) ?? extractNumeroBillet(parsed.data.code_qr_payload)
    if (!numero_billet) {
      return NextResponse.json(
        { error: "QR code non reconnu : ce n'est pas un billet TogoTransit.", code: 'QR_INVALIDE' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx: any) => {
        const billet = await tx.billet.findUnique({
          where: { numero_billet },
          include: {
            reservation: {
              include: {
                trajet: {
                  include: { compagnie: true, vehicule: true, ville_depart: true, ville_arrivee: true },
                },
                passagers: { orderBy: { id: 'asc' } },
                utilisateur: {
                  select: { id: true, nom: true, prenom: true, telephone: true },
                },
              },
            },
          },
        })

        if (!billet) {
          return {
            status: 404,
            error: 'Billet introuvable. Vérifiez le numéro.',
            code: 'BILLET_INCONNU',
          }
        }

        if (auth!.role === 'gestionnaire') {
          if (billet.reservation?.trajet?.compagnie_id !== auth!.compagnieId) {
            return {
              status: 403,
              error: 'Ce billet appartient à une autre compagnie.',
              code: 'MAUVAISE_COMPAGNIE',
            }
          }
        }

        // Un voyageur ne peut valider que les billets de son propre trajet
        // (il est chauffeur, pas agent de compagnie).
        if (auth!.role === 'voyageur') {
          if (billet.reservation?.trajet?.driver_id !== auth!.userId) {
            return {
              status: 403,
              error: "Ce billet ne concerne pas votre trajet.",
              code: 'MAUVAIS_TRAJET',
            }
          }
        }

        // Ce que le contrôleur doit voir : qui voyage, où, quand, sur quel siège.
        const reservation = billet.reservation
        const trajet = reservation?.trajet
        const details = {
          numero_billet: billet.numero_billet,
          passagers: reservation?.passagers ?? [],
          sieges: (reservation?.passagers ?? [])
            .map((p: { numero_siege: string | null }) => p.numero_siege)
            .filter(Boolean),
          nombre_places: reservation?.nombre_places ?? 1,
          trajet: trajet
            ? {
                compagnie: trajet.compagnie?.nom,
                ville_depart: trajet.ville_depart?.nom,
                ville_arrivee: trajet.ville_arrivee?.nom,
                date_depart: trajet.date_depart,
                depart_at: departureInstant(trajet).toISOString(),
                vehicule: trajet.vehicule
                  ? { type: trajet.vehicule.type, immatriculation: trajet.vehicule.immatriculation }
                  : null,
              }
            : null,
        }

        if (reservation?.statut === 'annulee') {
          return {
            status: 409,
            error: 'Réservation annulée — billet invalide.',
            code: 'RESERVATION_ANNULEE',
            info: details,
          }
        }

        if (billet.statut === 'annule') {
          return {
            status: 409,
            error: 'Billet annulé — invalide.',
            code: 'BILLET_ANNULE',
            info: details,
          }
        }

        // Passage à « utilisé » en une seule instruction conditionnelle : si deux appareils scannent le même billet
        // au même instant, un seul obtient la mise à jour, l'autre est refusé comme « déjà utilisé ».
        const pris = await tx.billet.updateMany({
          where: { id: billet.id, statut: 'valide' },
          data: { statut: 'utilise' },
        })

        if (pris.count === 0) {
          return {
            status: 409,
            error: '⚠️  Billet déjà scanné (utilisé)',
            code: 'BILLET_DEJA_UTILISE',
            info: { ...details, date_emission: billet.date_emission },
          }
        }

        return {
          status: 200,
          success: true,
          code: 'BILLET_VALIDE',
          message: '✅ Billet validé — embarquement autorisé',
          billet: {
            id: billet.id,
            numero_billet: billet.numero_billet,
            statut: 'utilise',
          },
          passagers: details.passagers,
          sieges: details.sieges,
          client: reservation?.utilisateur
            ? {
                nom: `${reservation.utilisateur.prenom} ${reservation.utilisateur.nom}`,
                telephone: reservation.utilisateur.telephone,
              }
            : null,
          trajet: details.trajet,
          nombre_places: details.nombre_places,
          scanne_a: new Date().toISOString(),
        }
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    )

    if (result.status !== 200) {
      return NextResponse.json(
        { error: result.error, code: (result as any).code, info: (result as any).info },
        { status: result.status }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Verifier Billet Error:', error)
    if (/transaction|deadlock/i.test(error?.message || '')) {
      return NextResponse.json(
        { error: 'Conflit pendant la vérification — réessayez' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
