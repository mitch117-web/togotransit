import React from 'react'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

export default async function NewBookingPage() {
  const session = await getSessionContext()
  const trajets = await prisma.trajet.findMany({
    where: {
      statut: 'planifie' as any,
      date_depart: {
        gte: new Date()
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
    status: 'PLANNED',
    vehicle: t.vehicule ? { id: t.vehicule.id, plateNumber: t.vehicule.immatriculation, capacity: t.vehicule.nombre_places, type: t.vehicule.type ?? '' } : null,
    _count: { bookings: t._count?.reservations ?? 0 },
  }))

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Nouvelle Réservation</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Sélectionnez un voyage pour commencer la réservation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => {
          const availableSeats = (trip.vehicle?.capacity || 0) - trip._count.bookings
          const isFull = availableSeats <= 0

          return (
            <div key={trip.id} className={`bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden flex flex-col shadow-sm transition-all ${isFull ? 'opacity-60' : 'hover:shadow-md hover:border-primary'}`}>
              <div className="p-4 bg-surface-container-high flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 shrink-0 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[1.25rem] shrink-0">event</span>
                  <span className="font-bold text-sm whitespace-nowrap truncate">
                    {new Date(trip.departureTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <span
                  title={trip.vehicle?.type}
                  className="text-[0.625rem] font-black uppercase text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded shadow-sm truncate max-w-[40%]"
                >
                  {trip.vehicle?.type}
                </span>
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-primary">{trip.origin}</span>
                    <span className="text-[0.625rem] font-bold uppercase text-outline">Départ</span>
                  </div>
                  <span className="material-symbols-outlined text-outline">arrow_forward</span>
                  <div className="flex flex-col text-right">
                    <span className="text-xl font-black text-primary">{trip.destination}</span>
                    <span className="text-[0.625rem] font-bold uppercase text-outline">Arrivée</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[1.125rem]">schedule</span>
                  <span className="text-sm font-medium">
                    {new Date(trip.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-4 border-y border-outline-variant/30">
                  <div className="flex flex-col">
                    <span className="text-[0.625rem] font-bold uppercase text-on-surface-variant">Places</span>
                    <span className={`text-lg font-black ${availableSeats < 5 ? 'text-error' : 'text-green-600'}`}>
                      {availableSeats} / {trip.vehicle?.capacity}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[0.625rem] font-bold uppercase text-on-surface-variant">Prix</span>
                    <span className="text-lg font-black text-on-surface">{trip.price.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>

                {isFull ? (
                  <button disabled className="w-full bg-surface-container-highest text-on-surface-variant py-3 rounded-xl font-bold cursor-not-allowed">
                    COMPLET
                  </button>
                ) : (
                  <Link 
                    href={`/admin/bookings/${trip.id}/seats`}
                    className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-center hover:brightness-110 transition-all shadow-md shadow-primary/20"
                  >
                    SÉLECTIONNER LE SIÈGE
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {trips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-3xl border-2 border-dashed border-outline-variant gap-6">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-outline opacity-40">calendar_today</span>
          </div>
          <div className="text-center max-w-sm">
            <h3 className="text-xl font-bold text-on-surface">Aucun voyage disponible</h3>
            <p className="text-on-surface-variant text-sm mt-2">
              Il n'y a pas de voyages planifiés pour le futur. Vous devez d'abord planifier un voyage avant de pouvoir effectuer une réservation.
            </p>
          </div>
          <Link 
            href="/admin/bookings/trips/new" 
            className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg transition-all"
          >
            Planifier un nouveau voyage
          </Link>
        </div>
      )}
    </div>
  )
}
