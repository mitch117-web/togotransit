import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'
import { z } from 'zod'

const updateUtilisateurSchema = z.object({
  compagnie_id: z.number().int().positive().nullable().optional(),
  statut: z.enum(['actif', 'suspendu']).optional(),
})

type RouteParams = Promise<{ id: string }>

/**
 * Rattache un utilisateur (voyageur, y compris "chauffeur") à une compagnie,
 * ou change son statut. Aucune autre route n'expose ce champ : un compte créé
 * via /api/auth/register a toujours compagnie_id = null, et c'est ce champ
 * que /admin/parcels/[id]/edit utilise pour filtrer les chauffeurs proposés
 * à une compagnie donnée.
 */
export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { id } = await params
    const userId = parseInt(id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const existing = await prisma.utilisateur.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateUtilisateurSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    if (parsed.data.compagnie_id !== undefined && parsed.data.compagnie_id !== null) {
      const compagnie = await prisma.compagnie.findUnique({ where: { id: parsed.data.compagnie_id } })
      if (!compagnie) {
        return NextResponse.json({ error: 'Compagnie introuvable' }, { status: 400 })
      }
    }

    const data: any = {}
    if (parsed.data.compagnie_id !== undefined) data.compagnie_id = parsed.data.compagnie_id
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut

    const { mot_de_passe, ...utilisateur } = await prisma.utilisateur.update({
      where: { id: userId },
      data,
    })

    return NextResponse.json({ success: true, data: utilisateur })
  } catch (error) {
    console.error('Plateforme Utilisateur PATCH Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
