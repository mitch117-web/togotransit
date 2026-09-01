import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteUserButton from '@/components/admin/DeleteUserButton'
import { getSessionContext } from '@/lib/session'

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  
  const userRaw = await prisma.utilisateur.findUnique({
    where: { id: idNum },
    include: {
      colis_envoyes: {
        orderBy: { createdAt: 'desc' } as any,
        take: 10
      },
      reservations: {
        include: {
          trajet: {
            include: { ville_depart: true, ville_arrivee: true }
          },
          passagers: true,
        },
        orderBy: { date_reservation: 'desc' } as any,
        take: 10
      }
    } as any
  })

  if (!userRaw) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && userRaw.compagnie_id !== session.compagnieId) {
    notFound()
  }

  const user: any = userRaw
  // Adaptation pour l'interface (champs anciens → nouveaux)
  user.name = user.name || `${user.prenom ?? ''} ${user.nom ?? ''}`.trim()
  user.phone = user.phone || user.telephone
  user.createdAt = user.createdAt || user.date_creation
  user.parcels = user.parcels || user.colis_envoyes || []
  user.bookings = (user.reservations ?? []).map((r: any) => ({
    id: r.id,
    trip: {
      origin: r.trajet?.ville_depart?.nom ?? '',
      destination: r.trajet?.ville_arrivee?.nom ?? '',
      departureTime: r.trajet?.date_depart,
    },
    seatNumber: r.passagers?.[0]?.numero_siege ?? '—',
    price: r.montant_total ?? 0,
  }))

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-primary-container text-on-primary-container border-primary/20'
      case 'gestionnaire': return 'bg-secondary-container text-on-secondary-container border-secondary/20'
      default: return 'bg-surface-container text-on-surface-variant border-outline-variant'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super-Admin'
      case 'gestionnaire': return 'Gestionnaire'
      case 'voyageur': return 'Voyageur'
      default: return role
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl border-2 border-white shadow-md">
              {getInitials(user.name)}
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase border ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link 
            href={`/admin/users/${user.id}/edit`}
            className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:brightness-110 transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[1.25rem]">edit</span>
            Modifier Profil
          </Link>
          <DeleteUserButton userId={user.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Informations de contact</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div>
                  <p className="text-[0.625rem] font-black uppercase text-on-surface-variant">Téléphone</p>
                  <p className="font-bold text-on-surface">+228 {user.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <p className="text-[0.625rem] font-black uppercase text-on-surface-variant">Email</p>
                  <p className="font-bold text-on-surface">{user.email || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface-variant">Activités</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col bg-surface-container-low p-4 rounded-xl">
                <span className="text-[0.625rem] font-black uppercase text-on-surface-variant">Colis Envoyés</span>
                <p className="text-2xl font-black text-primary">{user.parcels.length}</p>
              </div>
              <div className="flex flex-col bg-surface-container-low p-4 rounded-xl">
                <span className="text-[0.625rem] font-black uppercase text-on-surface-variant">Réservations</span>
                <p className="text-2xl font-black text-primary">{user.bookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Lists */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Recent Parcels */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Expéditions récentes</h3>
              <Link href="/admin/parcels" className="text-xs font-bold text-primary hover:underline">Voir tout</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Tracking</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Destinataire</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Destination</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {user.parcels.length > 0 ? user.parcels.map((parcel: any) => (
                    <tr key={parcel.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4 font-bold text-primary text-sm">{parcel.trackingId}</td>
                      <td className="p-4 text-sm font-medium">{parcel.receiverName}</td>
                      <td className="p-4 text-sm font-medium">{parcel.destination}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase border ${
                          parcel.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                        }`}>
                          {parcel.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-on-surface-variant italic opacity-50">
                        Aucun colis envoyé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Dernières réservations</h3>
              <Link href="/admin/bookings" className="text-xs font-bold text-primary hover:underline">Voir tout</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Trajet</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Siège</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Date</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Prix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {user.bookings.length > 0 ? user.bookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-bold text-primary text-sm">
                          <span>{booking.trip.origin}</span>
                          <span className="material-symbols-outlined text-[0.875rem]">arrow_forward</span>
                          <span>{booking.trip.destination}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-sm">#{booking.seatNumber}</td>
                      <td className="p-4 text-xs font-medium text-on-surface-variant">
                        {new Date(booking.trip.departureTime).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4 font-bold text-sm text-on-surface">
                        {booking.price.toLocaleString('fr-FR')} F
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-on-surface-variant italic opacity-50">
                        Aucune réservation effectuée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
