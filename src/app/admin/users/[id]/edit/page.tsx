import React from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditUserClient from './EditUserClient'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  const user = await prisma.utilisateur.findUnique({
    where: { id: idNum }
  })

  if (!user) {
    notFound()
  }

  return <EditUserClient user={user as any} />
}
