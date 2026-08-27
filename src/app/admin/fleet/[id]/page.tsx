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
    status: v.statut === 'disponible' ? 'AVAILABLE' : v.statut === 'en_maintenance' ? 'MAINTENANCE' : 'IN_SERVICE',
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
      case 'AVAILABLE': return 'bg-green-100 text-green-700 border-green-200'
      case 'IN_SERVICE': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'MAINTENANCE': return 'bg-error-container/20 text-error border-error-container'
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant'
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
            <span className="material-symbols-outlined text-[20px]">edit</span>
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
                {vehicle.status.replace(/_/g, ' ')}
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
          <div className="bg-primary text-on-primary p-6 rounded-2xl shadow-lg flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm font-bold opacity-90">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col bg-white/10 p-4 rounded-xl">
                <span className="text-[10px] font-black uppercase opacity-70">Total Voyages</span>
                <p className="text-2xl font-black">{totalTrips}</p>
              </div>
              <div className="flex flex-col bg-white/10 p-4 rounded-xl">
                <span className="text-[10px] font-black uppercase opacity-70">Terminés</span>
                <p className="text-2xl font-black">{completedTrips}</p>
              </div>
              <div className="flex flex-col bg-white/10 p-4 rounded-xl col-span-2">
                <span className="text-[10px] font-black uppercase opacity-70">Revenu Généré</span>
                <p className="text-2xl font-black">{totalRevenue.toLocaleString('fr-FR')} F</p>
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
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          trip.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                          trip.status === 'ONGOING' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-orange-100 text-orange-700 border-orange-200'
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
