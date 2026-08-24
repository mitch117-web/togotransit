import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'
import { z } from 'zod'

const updateStatutSchema = z.object({
  statut: z.enum(['actif', 'suspendu', 'en_attente']),
})

type RouteParams = Promise<{ id: string }>

export async function PUT(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { id } = await params
    const compagnieId = parseInt(id, 10)
    if (isNaN(compagnieId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const existing = await prisma.compagnie.findUnique({ where: { id: compagnieId } })
    if (!existing) {
      return NextResponse.json({ error: 'Compagnie non trouvée' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateStatutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const compagnie = await prisma.compagnie.update({
      where: { id: compagnieId },
      data: { statut: parsed.data.statut },
    })

    const usersAffected = await prisma.utilisateur.updateMany({
      where: { compagnie_id: compagnieId },
      data: {
        statut: parsed.data.statut === 'suspendu' ? 'bloque' : 'actif',
      },
    })

    return NextResponse.json({
      success: true,
      data: compagnie,
      utilisateurs_affectes: usersAffected.count,
      message: `Compagnie passée en statut "${parsed.data.statut}"`,
    })
  } catch (error) {
    console.error('Plateforme Compagnie Statut PUT Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
