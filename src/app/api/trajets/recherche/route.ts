import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const depart = (searchParams.get('depart') || searchParams.get('ville_depart') || searchParams.get('origin') || '').trim()
    const arrivee = (searchParams.get('arrivee') || searchParams.get('ville_arrivee') || searchParams.get('destination') || '').trim()
    const date = searchParams.get('date') || searchParams.get('date_depart')
    const compagnie_id = searchParams.get('compagnie_id') ? parseInt(searchParams.get('compagnie_id') as string, 10) : undefined
    const prix_min = searchParams.get('prix_min') ? parseFloat(searchParams.get('prix_min') as string) : undefined
    const prix_max = searchParams.get('prix_max') ? parseFloat(searchParams.get('prix_max') as string) : undefined
    const heure_debut = searchParams.get('heure_debut') || undefined
    const heure_fin = searchParams.get('heure_fin') || undefined
    const sort_by = (searchParams.get('sort_by') || 'heure_depart') as string
    const sort_dir = ((searchParams.get('sort_dir') as string) || 'asc') as 'asc' | 'desc'
    const statut = (searchParams.get('statut') as string) || 'planifie'

    const where: any = {}
    where.statut = statut === 'tout' ? undefined : statut
    where.places_disponibles = { gt: 0 }

    if (compagnie_id && !isNaN(compagnie_id)) where.compagnie_id = compagnie_id

    if (depart) where.ville_depart = { nom: { equals: depart } }
    if (arrivee) where.ville_arrivee = { nom: { equals: arrivee } }

    if (date) {
      try {
        const jour = new Date(date)
        const debut = new Date(jour)
        debut.setHours(0, 0, 0, 0)
        const fin = new Date(jour)
        fin.setHours(23, 59, 59, 999)
        where.date_depart = { gte: debut, lte: fin }
      } catch {
      }
    } else {
      // Sans date explicite, "à venir" doit vraiment vouloir dire à venir :
      // un trajet "planifie" dont la date est déjà passée (jamais clôturé)
      // ne doit pas remonter avant les vrais prochains départs.
      where.date_depart = { gte: new Date() }
    }

    if (prix_min !== undefined && !isNaN(prix_min)) {
      where.prix = { ...(where.prix || {}), gte: prix_min }
    }
    if (prix_max !== undefined && !isNaN(prix_max)) {
      where.prix = { ...(where.prix || {}), lte: prix_max }
    }

    const orderBy: any[] = []
    switch (sort_by) {
      case 'prix':
        orderBy.push({ prix: sort_dir })
        break
      case 'heure_depart':
      default:
        orderBy.push({ date_depart: sort_dir })
        break
      case 'compagnie':
        orderBy.push({ compagnie: { nom: sort_dir } as any })
        break
      case 'duree':
        orderBy.push({ duree_estimee: sort_dir })
        break
    }
    orderBy.push({ prix: 'asc' })

    const trajets = await prisma.trajet.findMany({
      where,
      orderBy,
      include: {
        compagnie: true,
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
        driver: true,
        avis: true,
        reservations: {
          where: { statut: { not: 'annulee' } },
          include: { passagers: true },
        },
      },
    })

    let filtered: any[] = trajets

    if (heure_debut || heure_fin) {
      filtered = filtered.filter((t: any) => {
        const d = new Date(t.date_depart)
        const hh = d.getHours() + d.getMinutes() / 60
        if (heure_debut) {
          const [h, m] = heure_debut.split(':').map(Number)
          const debut = (h || 0) + (m || 0) / 60
          if (hh < debut) return false
        }
        if (heure_fin) {
          const [h, m] = heure_fin.split(':').map(Number)
          const fin = (h || 0) + (m || 0) / 60
          if (hh > fin) return false
        }
        return true
      })
    }

    const compagniesAvisCache = new Map<number, { note: number; count: number }>()
    for (const t of trajets) {
      const cid = t.compagnie_id
      if (!compagniesAvisCache.has(cid) && t.compagnie) {
        compagniesAvisCache.set(cid, { note: 0, count: 0 })
      }
    }

    const data = filtered.map((t: any) => {
      const compagnie = t.compagnie ? {
        id: t.compagnie.id,
        nom: t.compagnie.nom,
        logo_url: t.compagnie.logo,
        telephone: t.compagnie.telephone,
        note_moyenne: (() => {
          if (!t.avis || t.avis.length === 0) return null
          const sum = t.avis.reduce((s: number, a: any) => s + (a.note || 0), 0)
          return Math.round((sum / t.avis.length) * 10) / 10
        })(),
        avis_count: t.avis?.length ?? 0,
      } : null

      const vehicule = t.vehicule ? {
        id: t.vehicule.id,
        type: t.vehicule.type,
        immatriculation: t.vehicule.immatriculation,
        nombre_places: t.vehicule.nombre_places,
        amenities: null,
      } : null

      const chauffeur = t.driver ? {
        id: t.driver.id,
        nom: `${t.driver.prenom ?? ''} ${t.driver.nom ?? ''}`.trim(),
        telephone: t.driver.telephone,
      } : null

      const nb_passagers = (t.reservations || []).reduce(
        (s: number, r: any) => s + (r.passagers?.length ?? r.nombre_places ?? 1),
        0
      )
      const places_restantes = Math.max(0, (t.places_disponibles ?? (vehicule?.nombre_places ?? 30)))

      const d = new Date(t.date_depart)
      let duree_minutes: number | null = null
      if (t.duree_estimee) {
        const de = new Date(t.duree_estimee)
        duree_minutes = de.getUTCHours() * 60 + de.getUTCMinutes()
        if (duree_minutes === 0) {
          duree_minutes = t.duree_estimee instanceof Date ? Math.round(t.duree_estimee.getTime() / 60000) : null
        }
      }

      return {
        id: t.id,
        compagnie,
        vehicule,
        chauffeur,
        ville_depart: {
          id: t.ville_depart?.id,
          nom: t.ville_depart?.nom ?? '',
          pays: 'Togo',
          region: t.ville_depart?.region,
        },
        ville_arrivee: {
          id: t.ville_arrivee?.id,
          nom: t.ville_arrivee?.nom ?? '',
          pays: 'Togo',
          region: t.ville_arrivee?.region,
        },
        date_depart: t.date_depart,
        heure_depart_iso: d.toISOString(),
        heure_depart: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        date_arrivee_estimee: duree_minutes ? new Date(d.getTime() + duree_minutes * 60000).toISOString() : null,
        duree_minutes,
        duree_libelle: duree_minutes
          ? `${Math.floor(duree_minutes / 60)}h${String(duree_minutes % 60).padStart(2, '0')}`
          : null,
        prix: t.prix,
        devise: 'XOF',
        statut: t.statut,
        places_disponibles_total: t.places_disponibles ?? vehicule?.nombre_places ?? 30,
        places_reservees: nb_passagers,
        places_restantes,
        comporte_plan_sieges: false,
      }
    })

    return NextResponse.json({
      success: true,
      meta: {
        total: data.length,
        total_tous_horaires: trajets.length,
        depart,
        arrivee,
        date,
        compagnies_disponibles: Array.from(new Set(trajets.map((t: any) => t.compagnie_id).filter(Boolean))).length,
        prix_min_trouve: data.length ? Math.min(...data.map((t: any) => t.prix)) : null,
        prix_max_trouve: data.length ? Math.max(...data.map((t: any) => t.prix)) : null,
      },
      data,
    })
  } catch (err: any) {
    console.error('GET /api/trajets/recherche error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur interne', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
