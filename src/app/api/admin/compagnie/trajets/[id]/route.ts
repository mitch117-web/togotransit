import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, assertCompagnieOwnership } from '@/lib/auth'
import { z } from 'zod'

const updateTrajetSchema = z.object({
  vehicule_id: z.number().int().positive().optional(),
  ville_depart_id: z.number().int().positive().optional(),
  ville_arrivee_id: z.number().int().positive().optional(),
  date_depart: z.string().optional(),
  heure_depart: z.string().optional(),
  duree_estimee: z.string().optional().nullable(),
  prix: z.number().positive().optional(),
  places_disponibles: z.number().int().nonnegative().optional(),
  statut: z.enum(['planifie', 'en_cours', 'termine', 'annule']).optional(),
  driver_id: z.number().int().positive().optional().nullable(),
})

type RouteParams = Promise<{ id: string }>

export async function GET(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    const { id } = await params
    const trajetId = parseInt(id, 10)
    if (isNaN(trajetId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const trajet = await prisma.trajet.findUnique({
      where: { id: trajetId },
      include: {
        compagnie: { select: { id: true, nom: true, logo: true } },
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
        driver: { select: { id: true, nom: true, prenom: true, telephone: true } },
        reservations: {
          include: {
            passagers: true,
            utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true } },
            paiements: true,
            billets: true,
          },
        },
      },
    })

    if (!trajet) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, trajet.compagnie_id)
    if (ownershipError) return ownershipError

    return NextResponse.json({
      success: true,
      data: trajet,
    })
  } catch (error) {
    console.error('Admin Compagnie Trajet Detail GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    const { id } = await params
    const trajetId = parseInt(id, 10)
    if (isNaN(trajetId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const existing = await prisma.trajet.findUnique({ where: { id: trajetId } })
    if (!existing) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const body = await request.json()
    const parsed = updateTrajetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data: any = {}
    if (parsed.data.vehicule_id !== undefined) data.vehicule_id = parsed.data.vehicule_id
    if (parsed.data.ville_depart_id !== undefined) data.ville_depart_id = parsed.data.ville_depart_id
    if (parsed.data.ville_arrivee_id !== undefined) data.ville_arrivee_id = parsed.data.ville_arrivee_id
    if (parsed.data.date_depart !== undefined) data.date_depart = new Date(parsed.data.date_depart)
    if (parsed.data.heure_depart !== undefined) data.heure_depart = new Date(parsed.data.heure_depart)
    if (parsed.data.duree_estimee !== undefined) data.duree_estimee = parsed.data.duree_estimee ? new Date(parsed.data.duree_estimee) : null
    if (parsed.data.prix !== undefined) data.prix = parsed.data.prix
    if (parsed.data.places_disponibles !== undefined) data.places_disponibles = parsed.data.places_disponibles
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut
    if (parsed.data.driver_id !== undefined) data.driver_id = parsed.data.driver_id

    const trajet = await prisma.trajet.update({
      where: { id: trajetId },
      data,
      include: {
        compagnie: { select: { id: true, nom: true, logo: true } },
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: trajet,
    })
  } catch (error) {
    console.error('Admin Compagnie Trajet PUT Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    const { id } = await params
    const trajetId = parseInt(id, 10)
    if (isNaN(trajetId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const existing = await prisma.trajet.findUnique({ where: { id: trajetId } })
    if (!existing) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const reservationsCount = await prisma.reservation.count({
      where: {
        trajet_id: trajetId,
        statut: { not: 'annulee' },
      },
    })

    if (reservationsCount > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${reservationsCount} réservation(s) active(s). Annulez d'abord les réservations.` },
        { status: 409 }
      )
    }

    await prisma.trajet.delete({ where: { id: trajetId } })

    return NextResponse.json({
      success: true,
      message: 'Trajet supprimé',
    })
  } catch (error: any) {
    console.error('Admin Compagnie Trajet DELETE Error:', error)
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Impossible de supprimer ce trajet : des références existent encore.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
