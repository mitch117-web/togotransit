import React from 'react'
import prisma from '@/lib/prisma'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

import Link from 'next/link'
import ExportButton from '@/components/admin/export/ExportButton'
import { KpiGrid, VehicleGrid } from './FleetCards'

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
          <Link href="/admin/fleet/new" className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-label-md text-label-md py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined">add</span>
            Ajouter un véhicule
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <KpiGrid stats={stats} />

      {/* Vehicle Grid */}
      <VehicleGrid vehicles={vehicles} />
    </div>
  )
}
