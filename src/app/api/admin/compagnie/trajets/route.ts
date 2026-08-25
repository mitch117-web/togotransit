import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, applyCompagnieFilterToWhere } from '@/lib/auth'
import { z } from 'zod'

const createTrajetSchema = z.object({
  vehicule_id: z.number().int().positive(),
  ville_depart_id: z.number().int().positive(),
  ville_arrivee_id: z.number().int().positive(),
  date_depart: z.string().datetime().or(z.string()),
  heure_depart: z.string().datetime().or(z.string()).optional(),
  duree_estimee: z.string().datetime().or(z.string()).optional().nullable(),
  prix: z.number().positive(),
  places_disponibles: z.number().int().nonnegative(),
  driver_id: z.number().int().positive().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked
    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut') as any
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

    let where: any = {}
    if (statut && ['planifie', 'en_cours', 'termine', 'annule'].includes(statut)) {
      where.statut = statut
    }
    where = applyCompagnieFilterToWhere(where, auth, 'compagnie_id')

    const trajets = await prisma.trajet.findMany({
      where,
      take: limit,
      orderBy: [{ date_depart: 'desc' }],
      include: {
        compagnie: { select: { id: true, nom: true, logo: true } },
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
        driver: { select: { id: true, nom: true, prenom: true, telephone: true } },
        _count: { select: { reservations: true, avis: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: trajets,
      total: trajets.length,
    })
  } catch (error) {
    console.error('Admin Compagnie Trajets GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    if (!auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createTrajetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const vehicule = await prisma.vehicule.findUnique({
      where: { id: parsed.data.vehicule_id },
    })
    if (!vehicule || vehicule.compagnie_id !== auth!.compagnieId) {
      return NextResponse.json({ error: 'Véhicule invalide ou non autorisé' }, { status: 403 })
    }

    const trajet = await prisma.trajet.create({
      data: {
        compagnie_id: auth!.compagnieId!,
        vehicule_id: parsed.data.vehicule_id,
        ville_depart_id: parsed.data.ville_depart_id,
        ville_arrivee_id: parsed.data.ville_arrivee_id,
        date_depart: new Date(parsed.data.date_depart),
        heure_depart: new Date(parsed.data.heure_depart || parsed.data.date_depart),
        duree_estimee: parsed.data.duree_estimee ? new Date(parsed.data.duree_estimee) : null,
        prix: parsed.data.prix,
        places_disponibles: parsed.data.places_disponibles,
        driver_id: parsed.data.driver_id ?? null,
      },
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
    }, { status: 201 })
  } catch (error: any) {
    console.error('Admin Compagnie Trajets POST Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Conflit de données' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
