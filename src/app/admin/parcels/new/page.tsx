import React from 'react'
import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/session'
import NewParcelForm from './NewParcelForm'

export default async function NewParcelPage() {
  const session = await getSessionContext()
  // Enregistrer un envoi de colis est une action opérationnelle propre à
  // une compagnie — réservée aux gestionnaires, pas au super-admin.
  if (session?.role === 'super_admin') {
    redirect('/admin/parcels')
  }
  return <NewParcelForm />
}
