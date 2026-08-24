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
    const billetId = parseInt(id, 10)
    if (isNaN(billetId)) {
      return NextResponse.json({ error: 'ID billet invalide' }, { status: 400 })
    }

    const billet = await prisma.billet.findUnique({
      where: { id: billetId },
      include: {
        reservation: {
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
            utilisateur: {
              select: { id: true, nom: true, prenom: true, telephone: true },
            },
          },
        },
      },
    })

    if (!billet) {
      return NextResponse.json({ error: 'Billet non trouvé' }, { status: 404 })
    }

    if (auth!.role === 'voyageur' && billet.reservation?.utilisateur_id !== auth!.userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (auth!.role === 'gestionnaire') {
      const denied = await assertCompagnieOwnership(auth, billet.reservation?.trajet?.compagnie_id)
      if (denied) return denied
    }

    return NextResponse.json({
      success: true,
      data: {
        id: billet.id,
        numero_billet: billet.numero_billet,
        statut: billet.statut,
        code_qr: billet.code_qr,
        date_emission: billet.date_emission,
        reservation: billet.reservation
          ? {
              id: billet.reservation.id,
              statut: billet.reservation.statut,
              nombre_places: billet.reservation.nombre_places,
              passagers: billet.reservation.passagers,
              trajet: billet.reservation.trajet
                ? {
                    id: billet.reservation.trajet.id,
                    compagnie: billet.reservation.trajet.compagnie
                      ? {
                          id: billet.reservation.trajet.compagnie.id,
                          nom: billet.reservation.trajet.compagnie.nom,
                          logo: billet.reservation.trajet.compagnie.logo,
                        }
                      : null,
                    ville_depart: billet.reservation.trajet.ville_depart,
                    ville_arrivee: billet.reservation.trajet.ville_arrivee,
                    date_depart: billet.reservation.trajet.date_depart,
                    vehicule: billet.reservation.trajet.vehicule
                      ? {
                          type: billet.reservation.trajet.vehicule.type,
                          immatriculation: billet.reservation.trajet.vehicule.immatriculation,
                        }
                      : null,
                  }
                : null,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Billet GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
