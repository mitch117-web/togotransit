import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  extractAuthFromRequest,
  requireAnyRole,
  applyCompagnieFilterToWhere,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await extractAuthFromRequest(request)
    const roleError = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (roleError) return roleError

    const data = await request.json()

    let compagnie_id: number
    if (auth!.role === 'super_admin') {
      if (!data.compagnie_id) {
        return NextResponse.json(
          { error: 'compagnie_id requis pour super_admin' },
          { status: 400 }
        )
      }
      compagnie_id = data.compagnie_id
    } else {
      if (!auth!.compagnieId) {
        return NextResponse.json(
          { error: 'Gestionnaire sans compagnie attribuée' },
          { status: 403 }
        )
      }
      compagnie_id = auth!.compagnieId
    }

    const vehicule = await prisma.vehicule.findUnique({
      where: { id: parseInt(data.vehicule_id, 10) },
    })
    if (!vehicule) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 })
    }
    if (vehicule.compagnie_id !== compagnie_id) {
      return NextResponse.json(
        { error: 'Ce véhicule n\'appartient pas à votre compagnie' },
        { status: 403 }
      )
    }

    const places_disponibles = parseInt(data.places_disponibles, 10)
    if (places_disponibles > vehicule.nombre_places) {
      return NextResponse.json(
        {
          error: `places_disponibles (${places_disponibles}) dépasse la capacité du véhicule (${vehicule.nombre_places})`,
        },
        { status: 400 }
      )
    }

    const heureDepart = data.heure_depart || '08:00:00'

    const trajet = await prisma.trajet.create({
      data: {
        compagnie_id,
        vehicule_id: parseInt(data.vehicule_id, 10),
        ville_depart_id: parseInt(data.ville_depart_id, 10),
        ville_arrivee_id: parseInt(data.ville_arrivee_id, 10),
        date_depart: new Date(data.date_depart),
        heure_depart: new Date(`1970-01-01T${heureDepart}`),
        duree_estimee: data.duree_estimee ? new Date(`1970-01-01T${data.duree_estimee}`) : null,
        prix: parseFloat(data.prix),
        places_disponibles,
        statut: data.statut || 'planifie',
        driver_id: data.driver_id ? parseInt(data.driver_id, 10) : null,
      },
      include: {
        compagnie: { select: { id: true, nom: true } },
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
      },
    })

    return NextResponse.json(trajet, { status: 201 })
  } catch (error: any) {
    console.error('Trajet Creation Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du trajet', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await extractAuthFromRequest(request)
    const { searchParams } = new URL(request.url)

    const ville_depart_id = searchParams.get('ville_depart_id')
    const ville_arrivee_id = searchParams.get('ville_arrivee_id')
    const ville_depart_nom = searchParams.get('ville_depart')
    const ville_arrivee_nom = searchParams.get('ville_arrivee')
    const date_depart = searchParams.get('date')
    const compagnie_id = searchParams.get('compagnie_id')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let where: Record<string, unknown> = {}
    const villeWhereDepart: Record<string, unknown> = {}
    const villeWhereArrivee: Record<string, unknown> = {}

    if (ville_depart_id) where.ville_depart_id = parseInt(ville_depart_id, 10)
    if (ville_arrivee_id) where.ville_arrivee_id = parseInt(ville_arrivee_id, 10)
    if (ville_depart_nom) villeWhereDepart.nom = ville_depart_nom
    if (ville_arrivee_nom) villeWhereArrivee.nom = ville_arrivee_nom
    if (Object.keys(villeWhereDepart).length) where.ville_depart = villeWhereDepart
    if (Object.keys(villeWhereArrivee).length) where.ville_arrivee = villeWhereArrivee

    if (date_depart) {
      const [y, m, d] = date_depart.split('-').map(Number)
      where.date_depart = new Date(y, m - 1, d)
    }

    if (compagnie_id) where.compagnie_id = parseInt(compagnie_id, 10)

    if (auth?.role === 'voyageur' || !auth) {
      where.statut = 'planifie'
      where.compagnie = { statut: 'actif' }
    } else if (statut) {
      where.statut = statut
    }

    where = applyCompagnieFilterToWhere(where, auth)

    const [trajets, total] = await Promise.all([
      prisma.trajet.findMany({
        where,
        include: {
          compagnie: { select: { id: true, nom: true, logo: true, telephone: true } },
          vehicule: true,
          ville_depart: true,
          ville_arrivee: true,
          _count: { select: { reservations: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date_depart: 'asc' }, { heure_depart: 'asc' }],
      }),
      prisma.trajet.count({ where }),
    ])

    const enriched = trajets.map((t: any) => ({
      ...t,
      places_reservees: t._count.reservations,
    }))

    return NextResponse.json({
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Trajets Fetch Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des trajets', details: error.message },
      { status: 500 }
    )
  }
}
