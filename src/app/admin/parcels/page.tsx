import React from 'react'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import ExportButton from '@/components/admin/export/ExportButton'
import { getSessionContext, compagnieFilterFor } from '@/lib/session'

async function getParcels(search?: string, status?: string) {
  const session = await getSessionContext()
  const where: any = compagnieFilterFor(session)

  if (search) {
    where.OR = [
      { trackingId: { contains: search } },
      { senderName: { contains: search } },
      { receiverName: { contains: search } },
    ]
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  const parcels = await prisma.parcel.findMany({
      where,
      include: { driver: true } as any,
      orderBy: {
        createdAt: 'desc'
      }
    }) as any[]
  return parcels
}

export default async function ParcelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const currentStatus = params.status || 'ALL'
  
  const parcels = await getParcels(query, currentStatus)

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'IN_TRANSIT': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'IN_AGENCY': return 'bg-primary/10 text-primary border-primary/30'
      case 'OUT_FOR_DELIVERY': return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant'
    }
  }

  const statuses = [
    { label: 'Tous', value: 'ALL' },
    { label: 'En Agence', value: 'IN_AGENCY' },
    { label: 'En Transit', value: 'IN_TRANSIT' },
    { label: 'Livrés', value: 'DELIVERED' },
  ]

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Gestion des Expéditions</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Suivez et gérez tous les colis du réseau TogoTransit.</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={parcels.map(p => ({
              ID: p.trackingId,
              Expéditeur: p.senderName,
              Destinataire: p.receiverName,
              Origine: p.origin,
              Destination: p.destination,
              Poids: p.weight,
              Prix: p.price,
              Statut: p.status,
              Paiement: p.paymentStatus,
              Chauffeur: p.driver?.name || 'Non assigné',
              Date: p.createdAt
            }))}
            filename="export_colis_togotransit"
            label="Exporter Excel"
          />
          <Link href="/admin/parcels/new" className="bg-primary text-on-primary rounded-lg py-2.5 px-5 font-label-md text-label-md hover:brightness-110 transition-all shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[1.25rem]">add</span>
            Nouvel Envoi
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-surface-container-low p-4 rounded-xl border border-outline-variant">
        <form className="relative flex-1 w-full" action="/admin/parcels" method="GET">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            name="q"
            defaultValue={query}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
            placeholder="Rechercher par ID tracking, nom..." 
            type="text"
          />
          {currentStatus !== 'ALL' && <input type="hidden" name="status" value={currentStatus} />}
        </form>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {statuses.map((s) => (
            <Link
              key={s.value}
              href={`/admin/parcels?status=${s.value}${query ? `&q=${query}` : ''}`}
              className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all border ${
                currentStatus === s.value 
                  ? 'bg-primary text-on-primary border-primary shadow-sm' 
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Parcels Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tracking ID</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Expéditeur / Destinataire</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Trajet</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Chauffeur</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Infos Colis</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Statut / Paiement</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {parcels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant italic font-body-md">
                    Aucun colis trouvé pour cette recherche.
                  </td>
                </tr>
              ) : (
                parcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-4">
                      <p className="font-label-md text-label-md text-primary font-bold">{parcel.trackingId}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {new Date(parcel.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[0.875rem] text-primary">upload</span>
                          <span className="font-body-sm text-body-sm font-medium">{parcel.senderName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[0.875rem] text-primary">download</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{parcel.receiverName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-body-sm text-body-sm">
                        <span className="font-medium text-primary">{parcel.origin}</span>
                        <span className="material-symbols-outlined text-[0.875rem] text-outline">arrow_forward</span>
                        <span className="font-medium text-primary">{parcel.destination}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        {parcel.driver ? (
                          <>
                            <span className="font-label-md text-label-md text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-[1rem]">local_shipping</span>
                              {parcel.driver.name}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {parcel.driver.phone}
                            </span>
                          </>
                        ) : (
                          <span className="font-label-sm text-label-sm text-on-surface-variant italic">
                            Non assigné
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">{parcel.weight} kg</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-tighter">
                          {parcel.category} • {parcel.deliveryType}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase border w-fit ${getStatusStyle(parcel.status)}`}>
                        {parcel.status.replace(/_/g, ' ')}
                      </span>
                      {parcel.status === 'IN_TRANSIT' && (
                        <Link 
                          href={`/admin/parcels/${parcel.id}/pod`}
                          className="text-[0.625rem] font-bold text-primary flex items-center gap-1 hover:underline"
                        >
                          <span className="material-symbols-outlined text-[0.875rem]">task_alt</span>
                          VALIDER LIVRAISON
                        </Link>
                      )}
                      <span className={`text-[0.6875rem] font-medium flex items-center gap-1 ${parcel.paymentStatus === 'PAID' ? 'text-green-600' : 'text-error'}`}>
                          <span className="material-symbols-outlined text-[0.875rem]">
                            {parcel.paymentStatus === 'PAID' ? 'check_circle' : 'pending'}
                          </span>
                          {parcel.paymentStatus === 'PAID' ? 'PAYÉ' : 'À PAYER'} ({parcel.paymentMethod})
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/admin/parcels/${parcel.id}`}
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title="Voir Détails"
                        >
                          <span className="material-symbols-outlined text-[1.25rem]">visibility</span>
                        </Link>
                        <Link 
                          href={`/admin/parcels/${parcel.id}/edit`}
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title="Modifier"
                        >
                          <span className="material-symbols-outlined text-[1.25rem]">edit</span>
                        </Link>
                        <Link 
                          href={`/admin/parcels/${parcel.id}/print`}
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title="Imprimer"
                        >
                          <span className="material-symbols-outlined text-[1.25rem]">print</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
