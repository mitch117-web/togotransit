import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SeatSelectionClient from '@/app/admin/bookings/[id]/seats/SeatSelectionClient'
import { getSessionContext } from '@/lib/session'
import { departureInstant } from '@/lib/trajet-time'

// Ce que le plan de sièges lit dans une réservation du trajet.
type ReservationPlan = {
  id: number
  nombre_places?: number | null
  passagers?: { nom_complet?: string | null; numero_siege?: string | null }[]
  utilisateur?: { prenom?: string | null; nom?: string | null } | null
}

export default async function SeatSelectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  
  const trajetRaw = await prisma.trajet.findUnique({
    where: { id: idNum },
    include: {
      vehicule: true,
      ville_depart: true,
      ville_arrivee: true,
      compagnie: true,
      reservations: {
        where: { statut: { not: 'annulee' } },
        include: {
          utilisateur: true,
          passagers: true,
        }
      }
    }
  })

  if (!trajetRaw) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && trajetRaw.compagnie_id !== session.compagnieId) {
    notFound()
  }
  // Créer une réservation au guichet est une action opérationnelle propre
  // à une compagnie — réservée aux gestionnaires, pas au super-admin.
  if (session?.role === 'super_admin') {
    notFound()
  }

  const t: any = trajetRaw
  const reservationsActives: ReservationPlan[] = t.reservations ?? []
  const trip: any = {
    id: t.id,
    origin: t.ville_depart?.nom ?? '',
    destination: t.ville_arrivee?.nom ?? '',
    departureTime: t.date_depart,
    departureAt: departureInstant(t).toISOString(),
    company: t.compagnie?.nom ?? 'TogoTransit',
    price: t.prix ?? 0,
    status: 'PLANNED',
    vehicle: t.vehicule ? {
      id: t.vehicule.id,
      plateNumber: t.vehicule.immatriculation,
      capacity: t.vehicule.nombre_places,
      type: t.vehicule.type ?? '',
    } : null,
    bookings: (t.reservations ?? [])
      .filter((r: any) => r.passagers?.[0]?.numero_siege)
      .map((r: any) => ({
        id: r.id,
        seatNumber: parseInt(r.passagers[0].numero_siege, 10),
        user: r.utilisateur ? {
          id: r.utilisateur.id,
          name: `${r.utilisateur.prenom ?? ''} ${r.utilisateur.nom ?? ''}`.trim(),
          phone: r.utilisateur.telephone,
          role: 'CLIENT',
        } : null,
      })),
    // Réservations sans siège numéroté (faites depuis l'application) : elles occupent des places sans figurer sur le plan.
    unseated: reservationsActives
      .filter((r) => !r.passagers?.[0]?.numero_siege)
      .map((r) => {
        const compte = r.utilisateur ? `${r.utilisateur.prenom ?? ''} ${r.utilisateur.nom ?? ''}`.trim() : ''
        const noms = (r.passagers ?? []).map((p) => p.nom_complet).filter(Boolean).join(', ')
        return {
          id: r.id,
          places: r.nombre_places ?? 1,
          name: noms || compte || 'Client',
          par: noms && compte && noms !== compte ? compte : null, // le compte qui a réservé, quand ce n'est pas le passager
        }
      }),
    soldPlaces: reservationsActives.reduce((n, r) => n + (r.nombre_places ?? 1), 0),
  }

  const utilisateurs = await prisma.utilisateur.findMany({
    where: { role: 'voyageur' as any },
    orderBy: { prenom: 'asc' } as any
  })

  const users: any[] = utilisateurs.map((u: any) => ({
    id: u.id,
    name: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
    phone: u.telephone,
    email: u.email,
    role: u.role === 'voyageur' ? 'CLIENT' : (u.role ?? ''),
  }))

  return <SeatSelectionClient trip={trip} users={users} />
}
