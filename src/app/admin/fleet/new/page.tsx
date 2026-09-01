import React from 'react'
import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/session'
import NewVehicleForm from './NewVehicleForm'

export default async function NewVehiclePage() {
  const session = await getSessionContext()
  // Ajouter un véhicule est une action opérationnelle propre à une
  // compagnie — réservée aux gestionnaires, pas au super-admin.
  if (session?.role === 'super_admin') {
    redirect('/admin/fleet')
  }
  return <NewVehicleForm />
}
