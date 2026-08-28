import React from 'react'
import prisma from '@/lib/prisma'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

import Link from 'next/link'
import DeleteVehicleButton from '@/components/admin/DeleteVehicleButton'
import ExportButton from '@/components/admin/export/ExportButton'

async function getFleetData() {
  const session = await getSessionContext()
  const vehiclesRaw = await prisma.vehicule.findMany({
    where: compagnieFilterFor(session),
    include: {
      trajets: {
        where: {
          statut: 'en_cours' as any
        }
      }
    },
    orderBy: {
      immatriculation: 'asc'
    }
  })

  // Adaptation to legacy shape
  const vehicles: any[] = vehiclesRaw.map((v: any) => ({
    id: v.id,
    plateNumber: v.immatriculation,
    type: v.type ?? '',
    capacity: v.nombre_places,
    status: (v.statut === 'disponible' ? 'AVAILABLE' :
             v.statut === 'en_maintenance' ? 'MAINTENANCE' :
             v.statut === 'hors_service' ? 'IN_SERVICE' : v.statut),
    trips: v.trajets ?? [],
  }))

  const stats = {
    total: vehicles.length,
    inService: vehicles.filter(v => v.status === 'IN_SERVICE').length,
    available: vehicles.filter(v => v.status === 'AVAILABLE').length,
    maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
  }

  return { vehicles, stats }
}

export default async function FleetPage() {
  const { vehicles, stats } = await getFleetData()

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background">Gestion de la Flotte</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Supervisez l'état et l'affectation de vos véhicules.</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={vehicles.map(v => ({
              Immatriculation: v.plateNumber,
              Type: v.type,
              Capacité: v.capacity,
              Statut: v.status
            }))}
            filename="export_flotte_togotransit"
            label="Exporter Excel"
          />
          <Link href="/admin/fleet/new" className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-label-md text-label-md py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined">add</span>
            Ajouter un véhicule
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="h-full bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col justify-between hover:bg-surface-container-low transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container mb-4 shrink-0">
            <span className="material-symbols-outlined">apps</span>
          </div>
          <div className="mt-auto">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">Total Véhicules</p>
            <p className="font-headline-lg text-headline-lg text-primary mt-1">{stats.total}</p>
          </div>
        </div>

        <div className="h-full bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col justify-between hover:bg-surface-container-low transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary mb-4 shrink-0">
            <span className="material-symbols-outlined">route</span>
          </div>
          <div className="mt-auto">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">En Service</p>
            <p className="font-headline-lg text-headline-lg text-primary mt-1">{stats.inService}</p>
          </div>
        </div>

        <div className="h-full bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col justify-between hover:bg-surface-container-low transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface mb-4 shrink-0">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="mt-auto">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">Disponibles</p>
            <p className="font-headline-lg text-headline-lg text-primary mt-1">{stats.available}</p>
          </div>
        </div>

        <div className="h-full bg-error-container/20 p-4 rounded-xl border border-outline-variant flex flex-col justify-between shadow-sm">
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-error mb-4 shrink-0">
            <span className="material-symbols-outlined">build</span>
          </div>
          <div className="mt-auto">
            <p className="font-label-sm text-label-sm text-error uppercase tracking-wide">En Maintenance</p>
            <p className="font-headline-lg text-headline-lg text-error mt-1">{stats.maintenance}</p>
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="h-full bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  vehicle.status === 'AVAILABLE' ? 'bg-green-500' :
                  vehicle.status === 'IN_SERVICE' ? 'bg-blue-500' :
                  'bg-error'
                }`}></div>
                <Link href={`/admin/fleet/${vehicle.id}`} className="font-bold text-primary hover:underline whitespace-nowrap">{vehicle.plateNumber}</Link>
              </div>
              <span
                title={vehicle.type}
                className="text-[0.625rem] font-black uppercase text-on-surface-variant bg-surface-container px-2 py-1 rounded truncate max-w-[55%]"
              >
                {vehicle.type}
              </span>
            </div>

            <div className="p-4 flex flex-col gap-4 flex-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[1.125rem]">group</span>
                  Capacité: {vehicle.capacity} places
                </span>
                <span className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[1.125rem]">history</span>
                  Dernier trajet: Hier
                </span>
              </div>

              <div className="bg-surface-container-low rounded-lg p-3">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Statut actuel</p>
                <p className="font-body-md text-body-md text-primary font-medium">
                  {vehicle.status === 'AVAILABLE' ? 'Prêt pour départ' :
                   vehicle.status === 'IN_SERVICE' ? 'En cours de trajet' :
                   'À l\'atelier de maintenance'}
                </p>
              </div>

              <div className="flex gap-2 mt-auto pt-3 border-t border-outline-variant/30">
                <Link
                  href={`/admin/fleet/${vehicle.id}`}
                  className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md text-label-md py-2 rounded-lg transition-colors text-center"
                >
                  Détails
                </Link>
                <Link
                  href={`/admin/fleet/${vehicle.id}/edit`}
                  className="px-3 bg-surface-container-highest hover:bg-primary/20 text-primary border border-outline-variant rounded-lg transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">edit</span>
                </Link>
                <DeleteVehicleButton vehicleId={vehicle.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
