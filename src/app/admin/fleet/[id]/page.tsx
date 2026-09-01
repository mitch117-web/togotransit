import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteVehicleButton from '@/components/admin/DeleteVehicleButton'
import { getSessionContext } from '@/lib/session'

export default async function VehicleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const idNum = parseInt(id, 10)
  const vehicleRaw = await prisma.vehicule.findUnique({
    where: { id: idNum },
    include: {
      trajets: {
        include: {
          ville_depart: true,
          ville_arrivee: true,
          _count: {
            select: { reservations: true }
          }
        },
        orderBy: {
          date_depart: 'desc'
        }
      }
    } as any
  })

  if (!vehicleRaw) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && vehicleRaw.compagnie_id !== session.compagnieId) {
    notFound()
  }

  const v: any = vehicleRaw
  const vehicle: any = {
    id: v.id,
    plateNumber: v.immatriculation,
    type: v.type ?? '',
    capacity: v.nombre_places,
    status: v.statut === 'disponible' ? 'AVAILABLE' : v.statut === 'en_maintenance' ? 'MAINTENANCE' : 'OUT_OF_SERVICE',
    compagnie_id: v.compagnie_id,
    cree_le: undefined,
    createdAt: undefined,
  }
  vehicle.trips = (v.trajets ?? []).map((t: any) => ({
    id: t.id,
    origin: t.ville_depart?.nom ?? '',
    destination: t.ville_arrivee?.nom ?? '',
    departureTime: t.date_depart,
    arrivalTime: undefined,
    price: t.prix ?? 0,
    statut: t.statut === 'termine' ? 'COMPLETED' : t.statut === 'en_cours' ? 'ONGOING' : (t.status ?? 'PLANNED'),
    status: t.statut === 'termine' ? 'COMPLETED' : t.statut === 'en_cours' ? 'ONGOING' : (t.status ?? 'PLANNED'),
    _count: { bookings: t._count?.reservations ?? 0 },
  }))

  // Calcul des stats du véhicule
  const totalTrips = vehicle.trips.length
  const completedTrips = vehicle.trips.filter((t: any) => t.status === 'COMPLETED').length
  const totalRevenue = vehicle.trips.reduce((acc: any, trip: any) => acc + (trip.price * trip._count.bookings), 0)

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
      case 'MAINTENANCE': return 'bg-error-container/20 text-error border-error-container'
      case 'OUT_OF_SERVICE': return 'bg-surface-container-high text-on-surface-variant border-outline-variant'
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Disponible'
      case 'MAINTENANCE': return 'En maintenance'
      case 'OUT_OF_SERVICE': return 'Hors service'
      default: return status
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/fleet" className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">Détails du Véhicule</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest font-bold">{vehicle.plateNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link 
            href={`/admin/fleet/${vehicle.id}/edit`}
            className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:brightness-110 transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[1.25rem]">edit</span>
            Modifier
          </Link>
          <DeleteVehicleButton vehicleId={vehicle.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Vehicle Info & Stats */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Info Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Spécifications</h3>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border ${getStatusStyle(vehicle.status)}`}>
                {getStatusLabel(vehicle.status)}
              </span>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                <span className="text-sm text-on-surface-variant">Type</span>
                <span className="font-bold text-primary uppercase">{vehicle.type}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                <span className="text-sm text-on-surface-variant">Capacité</span>
                <span className="font-bold text-on-surface">{vehicle.capacity} Sièges</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                <span className="text-sm text-on-surface-variant">Immatriculation</span>
                <span className="font-bold text-on-surface">{vehicle.plateNumber}</span>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface-variant">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col bg-surface-container-low p-4 rounded-xl">
                <span className="text-[0.625rem] font-black uppercase text-on-surface-variant">Total Voyages</span>
                <p className="text-2xl font-black text-primary">{totalTrips}</p>
              </div>
              <div className="flex flex-col bg-surface-container-low p-4 rounded-xl">
                <span className="text-[0.625rem] font-black uppercase text-on-surface-variant">Terminés</span>
                <p className="text-2xl font-black text-primary">{completedTrips}</p>
              </div>
              <div className="flex flex-col bg-surface-container-low p-4 rounded-xl col-span-2">
                <span className="text-[0.625rem] font-black uppercase text-on-surface-variant">Revenu Généré</span>
                <p className="text-2xl font-black text-primary">{totalRevenue.toLocaleString('fr-FR')} F</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Trip History */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Historique des Voyages</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Trajet</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Date</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Remplissage</th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {vehicle.trips.length > 0 ? vehicle.trips.map((trip: any) => (
                    <tr key={trip.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-body-sm font-bold text-primary">
                          <span>{trip.origin}</span>
                          <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                          <span>{trip.destination}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-on-surface-variant">
                        {new Date(trip.departureTime).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold">{trip._count.bookings} / {vehicle.capacity}</span>
                          <div className="w-24 h-1 bg-outline-variant rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-secondary" 
                              style={{ width: `${(trip._count.bookings / vehicle.capacity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase border ${
                          trip.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
                          trip.status === 'ONGOING' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                          'bg-primary/10 text-primary border-primary/30'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-on-surface-variant italic opacity-50">
                        Aucun voyage enregistré pour ce véhicule.
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
