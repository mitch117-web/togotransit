import React from 'react'
import prisma from '@/lib/prisma'
import TripForm from './TripForm'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

export default async function NewTripPage() {
  const session = await getSessionContext()
  const vehicules = await prisma.vehicule.findMany({
    where: { statut: 'disponible' as any, ...compagnieFilterFor(session) }
  })

  const vehicles: any[] = vehicules.map((v: any) => ({
    id: v.id,
    plateNumber: v.immatriculation,
    type: v.type ?? '',
    capacity: v.nombre_places,
    status: 'AVAILABLE',
  }))

  const chauffeurs = await prisma.utilisateur.findMany({
    where: { role: 'gestionnaire' as any, ...compagnieFilterFor(session) }
  })

  const drivers: any[] = chauffeurs.map((u: any) => ({
    id: u.id,
    name: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
    phone: u.telephone,
    role: 'DRIVER',
  }))

  // Get unique cities from fares to help user
  const fares = await prisma.fare.findMany({
    select: { origin: true, destination: true }
  })
  const cities = Array.from(new Set([...fares.map((f: any) => f.origin), ...fares.map((f: any) => f.destination)]))

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Planifier un Voyage</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Créez un nouveau trajet et assignez un véhicule et un chauffeur.
        </p>
      </div>

      <TripForm vehicles={vehicles} drivers={drivers} cities={cities} />
    </div>
  )
}
