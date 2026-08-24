import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const compagnie_id = searchParams.get('compagnie_id')
      ? parseInt(searchParams.get('compagnie_id') as string, 10)
      : undefined
    const note_min = searchParams.get('note_min')
      ? parseInt(searchParams.get('note_min') as string, 10)
      : undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const where: any = {}
    if (compagnie_id) where.compagnie_id = compagnie_id
    if (note_min) where.note = { gte: note_min }

    const avis = await prisma.avis.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      take: limit,
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true } },
        compagnie: { select: { id: true, nom: true, logo: true } },
        trajet: {
          include: {
            ville_depart: { select: { nom: true } },
            ville_arrivee: { select: { nom: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: avis,
      total: avis.length,
    })
  } catch (error) {
    console.error('Plateforme Avis GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
