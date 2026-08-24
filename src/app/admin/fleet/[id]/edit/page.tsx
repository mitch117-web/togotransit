import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditVehicleClient from './EditVehicleClient'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  const vehicleRaw = await prisma.vehicule.findUnique({
    where: { id: idNum }
  })

  if (!vehicleRaw) {
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
  }

  return <EditVehicleClient vehicle={vehicle} />
}
