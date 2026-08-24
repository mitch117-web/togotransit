import React from 'react'
import prisma from '@/lib/prisma'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const usersRaw = await prisma.utilisateur.findMany({
    include: {
      compagnie: true,
    },
    orderBy: {
      date_creation: 'desc',
    },
  })

  const users = usersRaw.map((u: any) => ({
    id: u.id,
    name: `${u.prenom || ''} ${u.nom || ''}`.trim() || 'Utilisateur',
    email: u.email || '',
    phone: u.telephone || '',
    role: u.role === 'super_admin' ? 'ADMIN' : u.role === 'gestionnaire' ? 'AGENT' : 'CLIENT',
    rawRole: u.role,
    compagnie: u.compagnie?.nom || null,
    createdAt: u.date_creation ? u.date_creation.toISOString() : new Date().toISOString(),
  }))

  return (
    <UsersClient initialUsers={users} />
  )
}
