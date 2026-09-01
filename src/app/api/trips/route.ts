import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

const statutMap: Record<string, any> = {
  PLANNED: 'planifie',
  ONGOING: 'en_cours',
  COMPLETED: 'termine',
  CANCELLED: 'annule',
  planifie: 'planifie',
  en_cours: 'en_cours',
  termine: 'termine',
  annule: 'annule',
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked
    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const data = await request.json()

    const statut = statutMap[data.status] ?? 'planifie'
    const vehiculeId = typeof data.vehicleId === 'string' ? parseInt(data.vehicleId, 10) : data.vehicleId
    // Un gestionnaire ne peut créer un trajet que pour sa propre compagnie.
    const compagnie_id = auth!.role === 'gestionnaire'
      ? auth!.compagnieId
      : (typeof data.compagnie_id === 'string' ? parseInt(data.compagnie_id, 10) : data.compagnie_id) || null

    if (!compagnie_id) {
      return NextResponse.json({ error: 'Compagnie requise' }, { status: 400 })
    }

    if (vehiculeId) {
      const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } })
      if (!vehicule || (auth!.role === 'gestionnaire' && vehicule.compagnie_id !== auth!.compagnieId)) {
        return NextResponse.json({ error: 'Véhicule invalide ou non autorisé' }, { status: 403 })
      }
    }

    // Le formulaire envoie des noms de ville (origin/destination), pas des
    // ville_depart_id/ville_arrivee_id — on les résout ici.
    const villeDepartId = data.ville_depart_id
      ? (typeof data.ville_depart_id === 'string' ? parseInt(data.ville_depart_id, 10) : data.ville_depart_id)
      : (await prisma.ville.findFirst({ where: { nom: data.origin } }))?.id
    const villeArriveeId = data.ville_arrivee_id
      ? (typeof data.ville_arrivee_id === 'string' ? parseInt(data.ville_arrivee_id, 10) : data.ville_arrivee_id)
      : (await prisma.ville.findFirst({ where: { nom: data.destination } }))?.id

    if (!villeDepartId || !villeArriveeId) {
      return NextResponse.json(
        { error: `Ville introuvable : ${!villeDepartId ? data.origin : data.destination}` },
        { status: 400 }
      )
    }

    const driverId = data.driverId
      ? (typeof data.driverId === 'string' ? parseInt(data.driverId, 10) : data.driverId)
      : null

    const trajet = await prisma.trajet.create({
      data: {
        ville_depart_id: villeDepartId,
        ville_arrivee_id: villeArriveeId,
        date_depart: new Date(data.departureTime),
        heure_depart: new Date(data.departureTime),
        prix: parseFloat(data.price ?? data.prix ?? 0),
        vehicule_id: vehiculeId ?? null,
        driver_id: driverId,
        statut,
        compagnie_id,
        places_disponibles: parseInt(data.capacity ?? data.nombre_places ?? data.places_disponibles ?? 30),
      } as any,
      include: { vehicule: true, ville_depart: true, ville_arrivee: true }
    })

    // Legacy shape
    const trip: any = {
      id: trajet.id,
      origin: (trajet as any).ville_depart?.nom ?? data.origin,
      destination: (trajet as any).ville_arrivee?.nom ?? data.destination,
      departureTime: trajet.date_depart,
      arrivalTime: undefined,
      price: trajet.prix,
      vehicleId: trajet.vehicule_id,
      status: trajet.statut === 'planifie' ? 'PLANNED' : trajet.statut,
      vehicle: (trajet as any).vehicule,
    }

    return NextResponse.json(trip)
  } catch (error: any) {
    console.error('Trip Creation Error:', error)
    return NextResponse.json({
      error: 'Erreur lors de la création du voyage',
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const date = searchParams.get('date')

  console.log(`Search Trips: origin=${origin}, destination=${destination}, date=${date}`)

  try {
    const where: any = { statut: { not: 'annule' as any } }
    
    if (origin && origin.trim() !== "") {
      where.ville_depart = { nom: { contains: origin.trim() } }
    }
    if (destination && destination.trim() !== "") {
      where.ville_arrivee = { nom: { contains: destination.trim() } }
    }
    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
      
      where.date_depart = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    const trajets = await prisma.trajet.findMany({
      where,
      include: {
        vehicule: true,
        ville_depart: true,
        ville_arrivee: true,
        _count: {
          select: { reservations: true }
        }
      },
      orderBy: { date_depart: 'asc' }
    })
    
    const trips: any[] = trajets.map((t: any) => ({
      id: t.id,
      origin: t.ville_depart?.nom ?? '',
      destination: t.ville_arrivee?.nom ?? '',
      departureTime: t.date_depart,
      arrivalTime: undefined,
      price: t.prix,
      vehicleId: t.vehicule_id,
      driverId: t.driver_id ?? null,
      status: statutMap[t.statut] === 'planifie' ? 'PLANNED' : (t.statut ?? 'PLANNED'),
      vehicle: t.vehicule ? {
        id: t.vehicule.id,
        plateNumber: t.vehicule.immatriculation,
        type: t.vehicule.type ?? '',
        capacity: t.vehicule.nombre_places,
      } : null,
      _count: { bookings: t._count?.reservations ?? 0 },
      bookings: Array(t._count?.reservations ?? 0).map((_, i) => ({ id: i, seatNumber: i + 1 })),
    }))
    
    // AUTO-GENERATION LOGIC (if no trips found, try with vehicule fallback)
    if (trips.length === 0 && date) {
      console.log('No trips found - returning empty (auto-gen skipped)')
    }

    console.log(`Found ${trips.length} trips`)
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Fetch trips error:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}
