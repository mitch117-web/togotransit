import React from 'react'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import PrintTicketButton from '@/components/admin/PrintTicketButton'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

async function getBookingsData() {
  const session = await getSessionContext()
  const trajets = await prisma.trajet.findMany({
    where: {
      date_depart: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      },
      ...compagnieFilterFor(session),
    },
    include: {
      vehicule: true,
      ville_depart: true,
      ville_arrivee: true,
      _count: {
        select: { reservations: true }
      }
    },
    orderBy: {
      date_depart: 'asc'
    }
  })

  const trips: any[] = trajets.map((t: any) => ({
    id: t.id,
    origin: t.ville_depart?.nom ?? '',
    destination: t.ville_arrivee?.nom ?? '',
    departureTime: t.date_depart,
    arrivalTime: undefined,
    price: t.prix ?? 0,
    status: t.statut === 'planifie' ? 'PLANNED' : t.statut === 'en_cours' ? 'ONGOING' : t.statut === 'termine' ? 'COMPLETED' : t.statut,
    vehicle: t.vehicule ? { id: t.vehicule.id, plateNumber: t.vehicule.immatriculation, capacity: t.vehicule.nombre_places, type: t.vehicule.type ?? '' } : null,
    _count: { bookings: t._count?.reservations ?? 0 },
  }))

  const recentReservations = await prisma.reservation.findMany({
    where: { trajet: compagnieFilterFor(session) },
    take: 5,
    include: {
      utilisateur: true,
      passagers: true,
      trajet: { include: { ville_depart: true, ville_arrivee: true, vehicule: true } }
    },
    orderBy: {
      date_reservation: 'desc'
    } as any
  })

  const recentBookings: any[] = recentReservations.map((r: any) => ({
    id: r.id,
    seatNumber: r.passagers?.[0]?.numero_siege ?? r.nombre_places ?? 1,
    price: r.montant_total ?? 0,
    status: r.statut === 'confirmee' ? 'CONFIRMED' : r.statut === 'en_attente' ? 'PENDING' : r.statut,
    createdAt: r.date_reservation,
    user: r.utilisateur ? {
      id: r.utilisateur.id,
      name: `${r.utilisateur.prenom ?? ''} ${r.utilisateur.nom ?? ''}`.trim(),
      phone: r.utilisateur.telephone,
      email: r.utilisateur.email,
    } : null,
    trip: r.trajet ? {
      id: r.trajet.id,
      origin: r.trajet.ville_depart?.nom ?? '',
      destination: r.trajet.ville_arrivee?.nom ?? '',
      departureTime: r.trajet.date_depart,
      vehicle: r.trajet.vehicule ? { id: r.trajet.vehicule.id, type: r.trajet.vehicule.type ?? '' } : null,
    } : null,
  }))

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 3600 * 1000)
  const prev24h = new Date(now.getTime() - 48 * 3600 * 1000)

  const [ticketsLast24h, ticketsPrev24h] = await Promise.all([
    prisma.reservation.count({
      where: { trajet: compagnieFilterFor(session), date_reservation: { gte: last24h } },
    }),
    prisma.reservation.count({
      where: { trajet: compagnieFilterFor(session), date_reservation: { gte: prev24h, lt: last24h } },
    }),
  ])
  const ticketsGrowthPct = ticketsPrev24h > 0
    ? ((ticketsLast24h - ticketsPrev24h) / ticketsPrev24h) * 100
    : (ticketsLast24h > 0 ? null : 0)

  return { trips, recentBookings, ticketsLast24h, ticketsGrowthPct }
}

export default async function BookingsPage() {
  const { trips, recentBookings, ticketsLast24h, ticketsGrowthPct } = await getBookingsData()

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Gestion des Réservations</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Gérez les tickets de transport et les plans de sièges.</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/admin/bookings/trips/new"
            className="bg-primary text-on-primary hover:brightness-110 font-label-md text-label-md py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-md whitespace-nowrap"
          >
            <span className="material-symbols-outlined">add_road</span>
            Planifier un Voyage
          </Link>
          <Link 
            href="/admin/bookings/new"
            className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-label-md text-label-md py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined">add_card</span>
            Nouvelle Réservation
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Available Trips */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">Prochains Départs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip: any) => {
              const availableSeats = (trip.vehicle?.capacity || 0) - trip._count.bookings
              return (
                <div key={trip.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 bg-surface-bright border-b border-outline-variant text-on-surface flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="material-symbols-outlined text-[1.25rem] text-primary">schedule</span>
                      <span className="font-label-md text-label-md whitespace-nowrap">
                        {new Date(trip.departureTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - {new Date(trip.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span
                      title={trip.vehicle?.type}
                      className="bg-surface-container text-on-surface-variant px-2 py-1 rounded text-[0.625rem] font-bold uppercase truncate max-w-[45%]"
                    >
                      {trip.vehicle?.type}
                    </span>
                  </div>
                  
                  <div className="p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-headline-md text-headline-md text-primary font-bold">{trip.origin}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Départ</span>
                      </div>
                      <span className="material-symbols-outlined text-outline">arrow_forward</span>
                      <div className="flex flex-col text-right">
                        <span className="font-headline-md text-headline-md text-primary font-bold">{trip.destination}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Arrivée</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Places libres</span>
                        <span className={`font-bold ${availableSeats < 5 ? 'text-error' : 'text-green-600'}`}>
                          {availableSeats} / {trip.vehicle?.capacity}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Prix</span>
                        <p className="font-bold text-primary">{trip.price.toLocaleString('fr-FR')} F</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <Link 
                        href={`/admin/bookings/${trip.id}/seats`}
                        className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold py-2 rounded-lg transition-colors text-center text-sm"
                      >
                        Réserver
                      </Link>
                      <Link 
                        href={`/admin/bookings/${trip.id}/seats`}
                        className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 rounded-lg transition-colors text-center text-sm flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">group</span>
                        Passagers
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-bold text-center">Activité Récente</h3>
            
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {recentBookings.length > 0 ? recentBookings.map((booking: any) => (
                <div key={booking.id} className="p-4 bg-surface rounded-xl border border-outline-variant/50 flex flex-col gap-3 hover:border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                      {booking.user.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-on-surface leading-tight">{booking.user.name}</p>
                      <p className="text-[0.625rem] text-on-surface-variant">Siège #{booking.seatNumber} • {booking.trip.origin} → {booking.trip.destination}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[0.625rem] font-medium text-on-surface-variant">
                      {new Date(booking.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <div className="flex items-center gap-2">
                      <PrintTicketButton booking={booking} />
                      <span className="px-2 py-0.5 rounded-full text-[0.5625rem] font-bold bg-emerald-500/10 text-emerald-700 uppercase">
                        Confirmé
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-on-surface-variant italic opacity-50">
                  Aucune réservation récente
                </div>
              )}
            </div>

            <Link 
              href="/admin/bookings/history" 
              className="w-full py-3 rounded-xl border border-outline-variant font-bold text-sm text-center hover:bg-surface-container-high transition-all mt-2"
            >
              Voir tout l'historique
            </Link>
          </div>

          {/* KPI Mini-Card */}
          <div className="bg-primary-container p-4 rounded-xl text-on-primary-container shadow-sm mt-4">
            <p className="font-label-sm text-label-sm uppercase opacity-80">Tickets vendus (24h)</p>
            <div className="flex items-end gap-2 mt-1">
              <h4 className="font-headline-lg text-headline-lg font-bold">{ticketsLast24h}</h4>
              {ticketsGrowthPct !== null && (
                <span className={`font-label-sm text-label-sm mb-1 ${ticketsGrowthPct >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {ticketsGrowthPct >= 0 ? '+' : ''}{ticketsGrowthPct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
