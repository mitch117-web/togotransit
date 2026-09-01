import React from 'react'
import prisma from '@/lib/prisma'
import FaresManagement from '@/components/admin/FaresManagement'
import GeneralSettings from '@/components/admin/GeneralSettings'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

async function getSettingsData() {
  const session = await getSessionContext()
  const fares = await prisma.fare.findMany({
    where: compagnieFilterFor(session),
    orderBy: {
      origin: 'asc'
    }
  })
  return { fares }
}

export default async function SettingsPage() {
  const session = await getSessionContext()
  const { fares } = await getSettingsData()

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Paramètres & Tarification</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Configurez les tarifs par zone, par poids et les paramètres globaux.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Fares Management */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <FaresManagement initialFares={fares} readOnly={session?.role === 'super_admin'} />
        </div>

        {/* Right Column: Global App Settings (plateforme uniquement) */}
        {session?.role === 'super_admin' && (
          <div className="flex flex-col gap-6">
            <GeneralSettings />
          </div>
        )}

      </div>
    </div>
  )
}
