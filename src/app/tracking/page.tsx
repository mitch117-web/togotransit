import React from 'react'
import TrackingClient from './TrackingClient'
import prisma from '@/lib/prisma'

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  const trackingId = params.id

  let parcel = null
  if (trackingId) {
    parcel = await prisma.parcel.findUnique({
      where: { trackingId },
      include: {
        pod: true
      }
    })
  }

  return (
    <div className="min-h-screen bg-surface-container-low font-sans">
      {/* Public Header */}
      <header className="bg-surface-container-lowest border-b border-outline-variant py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xl">T</div>
            <h1 className="text-2xl font-black tracking-tighter text-on-surface">TOGOTRANSIT</h1>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold uppercase text-primary tracking-widest">Suivi de Colis</p>
            <p className="text-[0.625rem] text-on-surface-variant">Service National de Logistique</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-12 flex flex-col gap-12">
        <TrackingClient initialParcel={parcel} initialId={trackingId} />
      </main>

      <footer className="mt-auto py-12 text-center text-on-surface-variant/40 text-xs border-t border-outline-variant/10">
        <p>© 2026 TogoTransit S.A. - Tous droits réservés.</p>
      </footer>
    </div>
  )
}
