import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

/**
 * Trajets où l'utilisateur connecté est le chauffeur assigné (Trajet.driver_id).
 * "Chauffeur" n'est pas un rôle à part dans ce système : c'est un voyageur
 * référencé comme conducteur sur un ou plusieurs trajets.
 */
export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const trajets = await prisma.trajet.findMany({
      where: { driver_id: auth!.userId },
      orderBy: { date_depart: 'asc' },
      include: {
        compagnie: true,
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
        reservations: {
          where: { statut: { not: 'annulee' } },
          select: { nombre_places: true },
        },
      },
    })

    const data = trajets.map((t) => ({
      id: t.id,
      compagnie: t.compagnie ? { id: t.compagnie.id, nom: t.compagnie.nom, logo_url: t.compagnie.logo } : null,
      vehicule: t.vehicule
        ? { type: t.vehicule.type, immatriculation: t.vehicule.immatriculation, nombre_places: t.vehicule.nombre_places }
        : null,
      ville_depart: { nom: t.ville_depart?.nom ?? '' },
      ville_arrivee: { nom: t.ville_arrivee?.nom ?? '' },
      date_depart: t.date_depart,
      statut: t.statut,
      places_disponibles: t.places_disponibles,
      passagers_a_bord: t.reservations.reduce((s, r) => s + r.nombre_places, 0),
    }))

    return NextResponse.json({ success: true, data, total: data.length })
  } catch (error) {
    console.error('MesTrajets Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
