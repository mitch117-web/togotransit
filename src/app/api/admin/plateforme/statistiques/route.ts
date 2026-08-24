import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const periode = searchParams.get('periode') || 'all'
    const compagnie_id = searchParams.get('compagnie_id')
      ? parseInt(searchParams.get('compagnie_id') as string, 10)
      : undefined

    const trajetWhere: any = {}
    const reservationWhere: any = {}
    if (compagnie_id) {
      trajetWhere.compagnie_id = compagnie_id
      reservationWhere.trajet = { compagnie_id }
    }

    let dateDebut: Date | null = null
    const now = new Date()
    if (periode === '30j') {
      dateDebut = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (periode === '7j') {
      dateDebut = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (periode === 'mois') {
      dateDebut = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    if (dateDebut) {
      reservationWhere.date_reservation = { gte: dateDebut }
      trajetWhere.createdAt = { gte: dateDebut }
    }

    const [
      compagniesCount,
      compagniesActifs,
      utilisateursCount,
      voyageursCount,
      gestionnairesCount,
      vehiculesCount,
      trajetsCount,
      reservationsCount,
      reservationsConfirmees,
      reservationsAnnulees,
      paiementsCount,
      paiementsReussis,
      avisCount,
    ] = await Promise.all([
      prisma.compagnie.count(),
      prisma.compagnie.count({ where: { statut: 'actif' } }),
      prisma.utilisateur.count(),
      prisma.utilisateur.count({ where: { role: 'voyageur' } }),
      prisma.utilisateur.count({ where: { role: 'gestionnaire' } }),
      prisma.vehicule.count(),
      prisma.trajet.count({ where: trajetWhere }),
      prisma.reservation.count({ where: reservationWhere }),
      prisma.reservation.count({ where: { ...reservationWhere, statut: 'confirmee' } }),
      prisma.reservation.count({ where: { ...reservationWhere, statut: 'annulee' } }),
      prisma.paiement.count(),
      prisma.paiement.count({ where: { statut: 'reussi' } }),
      prisma.avis.count(),
    ])

    const revenuTotalResult = await prisma.paiement.aggregate({
      where: { statut: 'reussi' },
      _sum: { montant: true },
    })

    const parCompagnie = await prisma.compagnie.findMany({
      take: 20,
      orderBy: [{ id: 'asc' }],
      include: {
        _count: {
          select: {
            trajets: true,
            vehicules: true,
            avis: true,
            utilisateurs: true,
          },
        },
        trajets: {
          take: 0,
          select: {
            _count: { select: { reservations: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        periode,
        periode_label: periode === '7j' ? '7 derniers jours'
          : periode === '30j' ? '30 derniers jours'
          : periode === 'mois' ? 'Ce mois-ci'
          : 'Tout l\'historique',
        plateforme: {
          compagnies: {
            total: compagniesCount,
            actifs: compagniesActifs,
            en_attente: compagniesCount - compagniesActifs,
          },
          utilisateurs: {
            total: utilisateursCount,
            voyageurs: voyageursCount,
            gestionnaires: gestionnairesCount,
            super_admin: utilisateursCount - voyageursCount - gestionnairesCount,
          },
          vehicules: vehiculesCount,
          trajets: trajetsCount,
          reservations: {
            total: reservationsCount,
            confirmees: reservationsConfirmees,
            en_attente: Math.max(0, reservationsCount - reservationsConfirmees - reservationsAnnulees),
            annulees: reservationsAnnulees,
            taux_confirmation: reservationsCount > 0
              ? Math.round((reservationsConfirmees / reservationsCount) * 100)
              : 0,
          },
          paiements: {
            total: paiementsCount,
            reussis: paiementsReussis,
            revenu_total: revenuTotalResult._sum.montant || 0,
            devise: 'XOF',
          },
          avis: avisCount,
        },
        par_compagnie: parCompagnie.map((c: any) => ({
          id: c.id,
          nom: c.nom,
          statut: c.statut,
          trajets: c._count.trajets,
          vehicules: c._count.vehicules,
          reservations: (c.trajets || []).reduce(
            (s: number, t: any) => s + (t?._count?.reservations ?? 0),
            0
          ),
          avis: c._count.avis,
        })),
      },
    })
  } catch (error) {
    console.error('Plateforme Statistiques GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
