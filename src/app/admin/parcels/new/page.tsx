import React from 'react'
import prisma from '@/lib/prisma'
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

  // Clients déjà inscrits (voyageurs), pour pouvoir lier l'envoi à un vrai
  // compte — sinon le colis n'apparaît jamais dans "Mes Colis" sur mobile,
  // même si le nom/téléphone saisis correspondent.
  const utilisateurs = await prisma.utilisateur.findMany({
    where: { role: 'voyageur' as any },
    orderBy: { prenom: 'asc' } as any,
  })
  const clients = utilisateurs.map((u: any) => ({
    id: u.id,
    name: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
    phone: u.telephone,
    email: u.email,
  }))

  return <NewParcelForm clients={clients} />
}
