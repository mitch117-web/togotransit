import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  extractAuthFromRequest,
  requireAnyRole,
  assertCompagnieOwnership,
  buildCompagnieScope,
} from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await extractAuthFromRequest(request)
    const { id } = await params
    const trajetId = parseInt(id, 10)

    const scope = buildCompagnieScope(auth)
    const where: Record<string, unknown> = { id: trajetId }
    if (scope && auth?.role !== 'super_admin') {
      Object.assign(where, scope)
    }

    const trajet = await prisma.trajet.findUnique({
      where: where as any,
      include: {
        compagnie: { select: { id: true, nom: true, logo: true, telephone: true, email: true } },
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
        driver: { select: { id: true, nom: true, prenom: true, telephone: true } },
        reservations: {
          include: {
            passagers: true,
            utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true } },
          },
        },
        avis: {
          include: { utilisateur: { select: { nom: true, prenom: true } } },
          take: 10,
          orderBy: { date_avis: 'desc' },
        },
        _count: { select: { avis: true, reservations: true } },
      },
    })

    if (!trajet) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }

    if ((auth?.role === 'voyageur' || !auth) && trajet.statut !== 'planifie') {
      return NextResponse.json({ error: 'Trajet non disponible' }, { status: 403 })
    }

    return NextResponse.json(trajet)
  } catch (error: any) {
    console.error('Trajet Detail Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du trajet', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await extractAuthFromRequest(request)
    const roleError = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (roleError) return roleError

    const { id } = await params
    const trajetId = parseInt(id, 10)
    const existing = await prisma.trajet.findUnique({
      where: { id: trajetId },
      include: { vehicule: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const data = await request.json()

    if (data.vehicule_id && parseInt(data.vehicule_id, 10) !== existing.vehicule_id) {
      const newVehicule = await prisma.vehicule.findUnique({
        where: { id: parseInt(data.vehicule_id, 10) },
      })
      if (!newVehicule) {
        return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 })
      }
      const scope = buildCompagnieScope(auth)
      if (scope && newVehicule.compagnie_id !== auth!.compagnieId && auth!.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Ce véhicule n\'appartient pas à votre compagnie' },
          { status: 403 }
        )
      }
      if (data.places_disponibles !== undefined) {
        if (parseInt(data.places_disponibles, 10) > newVehicule.nombre_places) {
          return NextResponse.json(
            {
              error: `places_disponibles dépasse la capacité du véhicule (${newVehicule.nombre_places})`,
            },
            { status: 400 }
          )
        }
      } else if (existing.places_disponibles > newVehicule.nombre_places) {
        return NextResponse.json(
          {
            error: `places_disponibles actuelles (${existing.places_disponibles}) dépassent la capacité du nouveau véhicule (${newVehicule.nombre_places})`,
          },
          { status: 400 }
        )
      }
    } else if (data.places_disponibles !== undefined) {
      if (parseInt(data.places_disponibles, 10) > existing.vehicule.nombre_places) {
        return NextResponse.json(
          {
            error: `places_disponibles (${data.places_disponibles}) dépasse la capacité du véhicule (${existing.vehicule.nombre_places})`,
          },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (data.vehicule_id !== undefined) updateData.vehicule_id = parseInt(data.vehicule_id, 10)
    if (data.ville_depart_id !== undefined) updateData.ville_depart_id = parseInt(data.ville_depart_id, 10)
    if (data.ville_arrivee_id !== undefined) updateData.ville_arrivee_id = parseInt(data.ville_arrivee_id, 10)
    if (data.date_depart !== undefined) updateData.date_depart = new Date(data.date_depart)
    if (data.heure_depart !== undefined) updateData.heure_depart = new Date(`1970-01-01T${data.heure_depart}`)
    if (data.duree_estimee !== undefined) {
      updateData.duree_estimee = data.duree_estimee ? new Date(`1970-01-01T${data.duree_estimee}`) : null
    }
    if (data.prix !== undefined) updateData.prix = parseFloat(data.prix)
    if (data.places_disponibles !== undefined) updateData.places_disponibles = parseInt(data.places_disponibles, 10)
    if (data.statut !== undefined) updateData.statut = data.statut
    if (data.driver_id !== undefined) {
      updateData.driver_id = data.driver_id ? parseInt(data.driver_id, 10) : null
    }
    if (data.currentLat !== undefined) updateData.currentLat = data.currentLat
    if (data.currentLng !== undefined) updateData.currentLng = data.currentLng
    if (data.currentLat !== undefined || data.currentLng !== undefined) {
      updateData.lastUpdate = new Date()
    }

    const trajet = await prisma.trajet.update({
      where: { id: trajetId },
      data: updateData,
      include: {
        compagnie: { select: { id: true, nom: true } },
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
      },
    })

    return NextResponse.json(trajet)
  } catch (error: any) {
    console.error('Trajet Update Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du trajet', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await extractAuthFromRequest(request)
    const roleError = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (roleError) return roleError

    const { id } = await params
    const trajetId = parseInt(id, 10)
    const existing = await prisma.trajet.findUnique({ where: { id: trajetId } })
    if (!existing) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const reservationsCount = await prisma.reservation.count({
      where: { trajet_id: trajetId, statut: 'confirmee' },
    })
    if (reservationsCount > 0 && existing.statut === 'planifie') {
      return NextResponse.json(
        { error: `Impossible de supprimer: ${reservationsCount} réservation(s) confirmée(s) sur ce trajet. Annulez d'abord les réservations ou passez le trajet en statut "annulé".` },
        { status: 400 }
      )
    }

    await prisma.trajet.delete({ where: { id: trajetId } })
    return NextResponse.json({ success: true, message: 'Trajet supprimé' })
  } catch (error: any) {
    console.error('Trajet Delete Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du trajet', details: error.message },
      { status: 500 }
    )
  }
}
