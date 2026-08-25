import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditUserClient from './EditUserClient'
import { getSessionContext } from '@/lib/session'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  const user = await prisma.utilisateur.findUnique({
    where: { id: idNum }
  })

  if (!user) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && user.compagnie_id !== session.compagnieId) {
    notFound()
  }

  return <EditUserClient user={user as any} />
}
