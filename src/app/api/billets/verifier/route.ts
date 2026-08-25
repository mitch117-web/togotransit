import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { z } from 'zod'

const verifierSchema = z.object({
  numero_billet: z.string().min(5, 'Numéro de billet invalide'),
  code_qr_payload: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const body = await request.json()
    const parsed = verifierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { numero_billet } = parsed.data

    const result = await prisma.$transaction(
      async (tx: any) => {
        const billet = await tx.billet.findUnique({
          where: { numero_billet },
          include: {
            reservation: {
              include: {
                trajet: {
                  include: { compagnie: true, ville_depart: true, ville_arrivee: true },
                },
                passagers: true,
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

        if (billet.reservation?.statut === 'annulee') {
          return {
            status: 409,
            error: 'Réservation annulée — billet invalide.',
            code: 'RESERVATION_ANNULEE',
          }
        }

        if (billet.statut === 'annule') {
          return {
            status: 409,
            error: 'Billet annulé — invalide.',
            code: 'BILLET_ANNULE',
          }
        }

        if (billet.statut === 'utilise') {
          return {
            status: 409,
            error: '⚠️  Billet déjà scanné (utilisé)',
            code: 'BILLET_DEJA_UTILISE',
            info: {
              date_scan_precedent: billet.date_emission,
              passagers: billet.reservation?.passagers,
              trajet: billet.reservation?.trajet
                ? {
                    ville_depart: billet.reservation.trajet.ville_depart?.nom,
                    ville_arrivee: billet.reservation.trajet.ville_arrivee?.nom,
                  }
                : null,
            },
          }
        }

        await tx.billet.update({
          where: { id: billet.id },
          data: { statut: 'utilise' },
        })

        return {
          status: 200,
          success: true,
          message: '✅ Billet validé — embarquement autorisé',
          billet: {
            id: billet.id,
            numero_billet: billet.numero_billet,
            statut: 'utilise',
          },
          passagers: billet.reservation?.passagers ?? [],
          client: billet.reservation?.utilisateur
            ? {
                nom: `${billet.reservation.utilisateur.prenom} ${billet.reservation.utilisateur.nom}`,
                telephone: billet.reservation.utilisateur.telephone,
              }
            : null,
          trajet: billet.reservation?.trajet
            ? {
                compagnie: billet.reservation.trajet.compagnie?.nom,
                ville_depart: billet.reservation.trajet.ville_depart?.nom,
                ville_arrivee: billet.reservation.trajet.ville_arrivee?.nom,
                date_depart: billet.reservation.trajet.date_depart,
              }
            : null,
          nombre_places: billet.reservation?.nombre_places ?? 1,
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
