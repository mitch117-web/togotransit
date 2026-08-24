import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut') as any
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const where: any = { utilisateur_id: auth!.userId }
    if (statut && ['en_attente', 'confirmee', 'annulee'].includes(statut)) {
      where.statut = statut
    }

    if (auth!.role === 'gestionnaire' && auth!.compagnieId) {
      delete where.utilisateur_id
      where.trajet = { compagnie_id: auth!.compagnieId }
    } else if (auth!.role === 'super_admin') {
      delete where.utilisateur_id
    }

    const reservations = await prisma.reservation.findMany({
      where,
      take: limit,
      orderBy: { date_reservation: 'desc' },
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
        paiements: true,
        billets: true,
        utilisateur: {
          select: { id: true, nom: true, prenom: true, telephone: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: reservations,
      total: reservations.length,
    })
  } catch (error) {
    console.error('MesReservations Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
