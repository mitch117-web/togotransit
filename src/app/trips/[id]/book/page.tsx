import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PublicBookingClient from '@/app/trips/[id]/book/PublicBookingClient'
import Link from 'next/link'

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = parseInt(id, 10)

  const tripRaw = await prisma.trajet.findUnique({
    where: { id: idNum },
    include: {
      vehicule: true,
      ville_depart: true,
      ville_arrivee: true,
      reservations: {
        include: { passagers: true }
      }
    }
  })

  if (!tripRaw) {
    notFound()
  }

  const t: any = tripRaw
  const trip: any = {
    id: t.id,
    origin: t.ville_depart?.nom ?? '',
    destination: t.ville_arrivee?.nom ?? '',
    departureTime: t.date_depart,
    arrivalTime: undefined,
    price: t.prix,
    status: t.statut === 'planifie' ? 'PLANNED' : t.statut,
    vehicle: t.vehicule ? {
      id: t.vehicule.id,
      plateNumber: t.vehicule.immatriculation,
      capacity: t.vehicule.nombre_places,
      type: t.vehicule.type ?? '',
    } : null,
    bookings: (t.reservations ?? []).map(() => ({ seatNumber: 1 })),
    vehicleId: t.vehicule_id,
  }

  return (
    <div className="min-h-screen bg-surface-container-low font-sans flex flex-col">
      {/* Public Header */}
      <header className="bg-primary text-on-primary py-6 px-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary font-bold text-xl">T</div>
            <h1 className="text-2xl font-black tracking-tighter">TOGOTRANSIT</h1>
          </Link>
          <nav className="hidden md:flex gap-6 font-bold uppercase text-xs tracking-widest">
            <Link href="/tracking" className="hover:text-secondary transition-colors">Suivi Colis</Link>
            <Link href="/trips" className="text-secondary">Réservation</Link>
            <Link href="/login" className="hover:text-secondary transition-colors">Espace Pro</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 py-12">
        <PublicBookingClient trip={trip} />
      </main>

      <footer className="mt-auto py-12 text-center text-on-surface-variant/40 text-xs border-t border-outline-variant/10">
        <p>© 2026 TogoTransit S.A. - Tous droits réservés.</p>
      </footer>
    </div>
  )
}
