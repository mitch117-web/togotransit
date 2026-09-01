import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SeatSelectionClient from '@/app/admin/bookings/[id]/seats/SeatSelectionClient'
import { getSessionContext } from '@/lib/session'

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

  const t: any = trajetRaw
  const trip: any = {
    id: t.id,
    origin: t.ville_depart?.nom ?? '',
    destination: t.ville_arrivee?.nom ?? '',
    departureTime: t.date_depart,
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
