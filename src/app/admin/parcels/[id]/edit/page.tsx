import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditParcelClient from './EditParcelClient'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

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

  const drivers = await prisma.utilisateur.findMany({
    where: { role: 'gestionnaire' as any, ...compagnieFilterFor(session) }
  }) as any

  return <EditParcelClient parcel={parcel} drivers={drivers} />
}
