import React from 'react'
import prisma from '@/lib/prisma'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

import Link from 'next/link'
import ExportButton from '@/components/admin/export/ExportButton'
import { KpiGrid, VehicleGrid } from './FleetCards'

/** « Aujourd'hui », « Hier », « Il y a 3 jours » ou la date : le Togo est à UTC+0, on compte en jours UTC. */
function libelleDernierTrajet(depart: Date | null | undefined, maintenant = new Date()): string {
  if (!depart) return 'Aucun trajet'
  const jour = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const ecart = Math.round((jour(maintenant) - jour(depart)) / 86_400_000)
  if (ecart <= 0) return "Aujourd'hui"
  if (ecart === 1) return 'Hier'
  if (ecart < 7) return `Il y a ${ecart} jours`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(depart)
}

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

  // Dernier départ déjà passé de chaque véhicule (la carte affichait « Hier » pour tous, écrit en dur).
  const derniersDeparts = await prisma.trajet.groupBy({
    by: ['vehicule_id'],
    where: { vehicule_id: { in: vehiclesRaw.map((v) => v.id) }, date_depart: { lte: new Date() } },
    _max: { date_depart: true },
  })
  const dernierDepartDe = new Map(derniersDeparts.map((d) => [d.vehicule_id, d._max.date_depart]))

  // Adaptation to legacy shape
  const vehicles: any[] = vehiclesRaw.map((v: any) => ({
    id: v.id,
    plateNumber: v.immatriculation,
    type: v.type ?? '',
    capacity: v.nombre_places,
    status: (v.statut === 'disponible' ? 'AVAILABLE' :
             v.statut === 'en_maintenance' ? 'MAINTENANCE' :
             v.statut === 'hors_service' ? 'OUT_OF_SERVICE' : v.statut),
    trips: v.trajets ?? [],
    lastTrip: libelleDernierTrajet(dernierDepartDe.get(v.id)),
  }))

  const stats = {
    total: vehicles.length,
    outOfService: vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length,
    available: vehicles.filter(v => v.status === 'AVAILABLE').length,
    maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
  }

  return { vehicles, stats }
}

export default async function FleetPage() {
  const { vehicles, stats } = await getFleetData()
  const session = await getSessionContext()
  // Gérer la flotte (ajouter/modifier/supprimer un véhicule) est une action
  // opérationnelle propre à une compagnie — réservée aux gestionnaires. Le
  // super-admin garde une vue de supervision en lecture seule.
  const canOperate = session?.role !== 'super_admin'

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
          {canOperate && (
            <Link href="/admin/fleet/new" className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-label-md text-label-md py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm whitespace-nowrap">
              <span className="material-symbols-outlined">add</span>
              Ajouter un véhicule
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <KpiGrid stats={stats} />

      {/* Vehicle Grid */}
      <VehicleGrid vehicles={vehicles} canOperate={canOperate} />
    </div>
  )
}
