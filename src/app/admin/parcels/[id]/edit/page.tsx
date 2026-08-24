import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditParcelClient from './EditParcelClient'

export default async function EditParcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = parseInt(id, 10)

  const parcel = await prisma.parcel.findUnique({
    where: { id: idNum },
    include: { driver: true } as any
  }) as any

  const drivers = await prisma.utilisateur.findMany({
    where: { role: 'gestionnaire' as any }
  }) as any

  if (!parcel) {
    notFound()
  }

  return <EditParcelClient parcel={parcel} drivers={drivers} />
}
