import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditParcelClient from './EditParcelClient'
import { getSessionContext } from '@/lib/session'

export default async function EditParcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = parseInt(id, 10)

  const parcel = await prisma.parcel.findUnique({
    where: { id: idNum },
    include: { driver: true } as any
  }) as any

  if (!parcel) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && parcel.compagnie_id !== session.compagnieId) {
    notFound()
  }
  // Modifier un colis est une action opérationnelle propre à une
  // compagnie — réservée aux gestionnaires, pas au super-admin.
  if (session?.role === 'super_admin') {
    notFound()
  }

  // "Chauffeur" n'est pas un rôle à part dans ce système : c'est un
  // voyageur rattaché à la compagnie (Utilisateur.compagnie_id) — on ne
  // propose donc que les chauffeurs de la même compagnie que le colis,
  // jamais ceux d'une autre compagnie ni les simples clients (compagnie_id
  // null).
  const drivers = await prisma.utilisateur.findMany({
    where: { role: 'voyageur' as any, compagnie_id: parcel.compagnie_id }
  }) as any

  return <EditParcelClient parcel={parcel} drivers={drivers} />
}
