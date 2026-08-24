import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, buildCompagnieScope } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut') as any
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const scope = buildCompagnieScope(auth, 'compagnie_id')
    if (!scope) {
      return NextResponse.json({ error: 'Scope compagnie indisponible' }, { status: 403 })
    }

    const where: any = {
      trajet: scope,
    }
    if (statut && ['en_attente', 'confirmee', 'annulee'].includes(statut)) {
      where.statut = statut
    }

    const reservations = await prisma.reservation.findMany({
      where,
      take: limit,
      orderBy: [{ date_reservation: 'desc' }],
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true, email: true } },
        trajet: {
          include: {
            compagnie: { select: { id: true, nom: true } },
            ville_depart: true,
            ville_arrivee: true,
            vehicule: true,
          },
        },
        passagers: true,
        paiements: true,
        billets: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: reservations,
      total: reservations.length,
    })
  } catch (error) {
    console.error('Admin Compagnie Reservations GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
