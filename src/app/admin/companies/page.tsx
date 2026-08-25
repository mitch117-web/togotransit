import React from 'react'
import prisma from '@/lib/prisma'
import CompaniesClient from './CompaniesClient'
import { getSessionContext } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function CompaniesPage() {
  const session = await getSessionContext()
  if (session?.role !== 'super_admin') {
    redirect('/admin/dashboard')
  }

  const companiesRaw = await prisma.compagnie.findMany({
    include: {
      agences_locales: {
        include: {
          ville: true
        }
      },
      _count: {
        select: {
          vehicules: true,
          trajets: true,
          utilisateurs: true,
          colis: true,
          avis: true,
        }
      }
    },
    orderBy: {
      nom: 'asc'
    }
  })

  const companies = companiesRaw.map(c => ({
    id: c.id,
    nom: c.nom,
    description: c.description,
    telephone: c.telephone,
    email: c.email,
    adresse_siege: c.adresse_siege,
    statut: c.statut,
    date_inscription: c.date_inscription.toISOString(),
    agencesCount: c.agences_locales.length,
    agences: c.agences_locales.map(a => ({
      id: a.id,
      nom: a.nom_agence,
      ville: a.ville.nom,
      telephone: a.telephone,
    })),
    stats: {
      vehicles: c._count.vehicules,
      trips: c._count.trajets,
      users: c._count.utilisateurs,
      parcels: c._count.colis,
    }
  }))

  return <CompaniesClient initialCompanies={companies} />
}
