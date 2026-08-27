import React from 'react'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import PrintTicketButton from '@/components/admin/PrintTicketButton'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

export default async function BookingHistoryPage() {
  const session = await getSessionContext()
  const reservations = await prisma.reservation.findMany({
    where: { trajet: compagnieFilterFor(session) },
    include: {
      utilisateur: true,
      trajet: { include: { ville_depart: true, ville_arrivee: true } }
    },
    orderBy: {
      date_reservation: 'desc'
    } as any
  })

  const bookings: any[] = reservations.map((r: any) => ({
    id: r.id,
    seatNumber: r.nombre_places ?? 1,
    price: r.montant_total ?? 0,
    status: r.statut === 'confirmee' ? 'CONFIRMED' : r.statut === 'en_attente' ? 'PENDING' : r.statut,
    createdAt: r.date_reservation,
    user: r.utilisateur ? {
      id: r.utilisateur.id,
      name: `${r.utilisateur.prenom ?? ''} ${r.utilisateur.nom ?? ''}`.trim(),
      phone: r.utilisateur.telephone,
      email: r.utilisateur.email,
    } : { id: 0, name: 'Inconnu', phone: '' },
    trip: r.trajet ? {
      id: r.trajet.id,
      origin: r.trajet.ville_depart?.nom ?? '',
      destination: r.trajet.ville_arrivee?.nom ?? '',
      departureTime: r.trajet.date_depart,
    } : null,
  }))

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href="/admin/bookings" className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Historique des Réservations</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Liste complète de tous les tickets vendus sur la plateforme.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Passager</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Trajet</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Date Achat</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Siège</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Prix</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {bookings.length > 0 ? bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                        {booking.user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{booking.user.name}</p>
                        <p className="text-[0.625rem] text-on-surface-variant">{booking.user.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-bold text-primary text-sm">
                      <span>{booking.trip.origin}</span>
                      <span className="material-symbols-outlined text-[0.875rem]">arrow_forward</span>
                      <span>{booking.trip.destination}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-medium text-on-surface-variant">
                    {new Date(booking.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="p-4 font-black text-sm">#{booking.seatNumber}</td>
                  <td className="p-4 font-bold text-sm">{booking.price.toLocaleString('fr-FR')} F</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <PrintTicketButton booking={booking} />
                      <span className="px-2 py-0.5 rounded-full text-[0.5625rem] font-bold bg-green-100 text-green-700 uppercase">
                        Confirmé
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-on-surface-variant italic opacity-50">
                    Aucune réservation trouvée dans l'historique.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
