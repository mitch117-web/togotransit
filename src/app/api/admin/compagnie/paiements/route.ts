import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, buildCompagnieScope } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    const scope = buildCompagnieScope(auth, 'compagnie_id')
    if (!scope) {
      return NextResponse.json({ error: 'Scope compagnie indisponible' }, { status: 403 })
    }

    const paiements = await prisma.paiement.findMany({
      where: {
        reservation: {
          trajet: scope,
        },
      },
      orderBy: [{ id: 'desc' }],
      take: 100,
      include: {
        reservation: {
          include: {
            utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true } },
            trajet: {
              include: {
                compagnie: { select: { id: true, nom: true } },
                ville_depart: true,
                ville_arrivee: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: paiements,
      total: paiements.length,
    })
  } catch (error) {
    console.error('Admin Compagnie Paiements GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
