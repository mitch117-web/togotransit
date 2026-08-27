import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GenerateInvoiceButton from '@/components/admin/GenerateInvoiceButton'
import { getSessionContext } from '@/lib/session'

export default async function ParcelDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  
  const parcel = await prisma.parcel.findUnique({
    where: { id: idNum },
    include: {
      pod: true,
      sender: true
    }
  }) as any

  if (!parcel) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && parcel.compagnie_id !== session.compagnieId) {
    notFound()
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-700 border-green-200'
      case 'IN_TRANSIT': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'IN_AGENCY': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant'
    }
  }

  let statusHistory = []
  try {
    statusHistory = JSON.parse(parcel.statusHistory || '[]').reverse()
  } catch (e) {
    console.error('Failed to parse status history:', e)
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/parcels" className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">Détails de l'expédition</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest font-bold">Tracking ID: {parcel.trackingId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <GenerateInvoiceButton parcel={parcel} />
          <Link 
            href={`/admin/parcels/${parcel.id}/print`}
            className="bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold py-2 px-4 rounded-lg transition-all border border-outline-variant flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            Imprimer Bordereau
          </Link>
          <Link 
            href={`/admin/parcels/${parcel.id}/edit`}
            className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:brightness-110 transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            Modifier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Status Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">État actuel</h3>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border ${getStatusStyle(parcel.status)}`}>
                {parcel.status.replace(/_/g, ' ')}
              </span>
            </div>
            
            {/* Dynamic Status History */}
            <div className="flex flex-col gap-6 relative ml-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline-variant opacity-30"></div>
              
              {statusHistory.map((update: any, index: number) => (
                <div key={index} className={`flex gap-4 relative z-10 ${index === 0 ? 'opacity-100' : 'opacity-60'}`}>
                  <div className={`w-4 h-4 rounded-full mt-1 border-2 border-white shadow-sm ${
                    index === 0 ? (update.status === 'DELIVERED' ? 'bg-green-500' : 'bg-primary') : 'bg-outline-variant'
                  }`}></div>
                  <div className="flex flex-col">
                    <p className="font-label-md text-label-md font-bold text-on-surface">
                      {update.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] font-medium text-on-surface-variant">
                      {new Date(update.timestamp).toLocaleString('fr-FR')} • {update.location}
                    </p>
                    {update.note && <p className="text-xs italic text-on-surface-variant/80 mt-1">{update.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined text-primary">person</span>
                <h3 className="font-label-md text-label-md font-black uppercase text-on-surface-variant">Expéditeur</h3>
              </div>
              <div>
                <p className="text-lg font-bold text-primary">{parcel.senderName}</p>
                <p className="text-sm font-medium text-on-surface">{parcel.senderPhone}</p>
                <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  Agence de départ: {parcel.origin}
                </p>
              </div>
            </div>

            {/* Receiver */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined text-secondary">person_pin</span>
                <h3 className="font-label-md text-label-md font-black uppercase text-on-surface-variant">Destinataire</h3>
              </div>
              <div>
                <p className="text-lg font-bold text-secondary">{parcel.receiverName}</p>
                <p className="text-sm font-medium text-on-surface">{parcel.receiverPhone}</p>
                <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  Agence de destination: {parcel.destination}
                </p>
              </div>
            </div>
          </div>

          {/* Parcel Details Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Informations Techniques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-on-surface-variant">Poids</span>
                <p className="text-lg font-bold">{parcel.weight} kg</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-on-surface-variant">Catégorie</span>
                <p className="text-lg font-bold">{parcel.category}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-on-surface-variant">Type</span>
                <p className="text-lg font-bold">{parcel.deliveryType}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-on-surface-variant">Prix</span>
                <p className="text-lg font-bold text-primary">{parcel.price.toLocaleString('fr-FR')} F</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: POD & Payment */}
        <div className="flex flex-col gap-6">
          {/* Payment Status Card */}
          <div className={`p-6 rounded-2xl border shadow-md flex flex-col gap-4 ${
            parcel.paymentStatus === 'PAID' ? 'bg-green-50 border-green-200' : 'bg-error-container/10 border-error-container'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className="font-label-md text-label-md font-black uppercase">Statut Paiement</h3>
              <span className="material-symbols-outlined text-3xl">
                {parcel.paymentStatus === 'PAID' ? 'check_circle' : 'pending'}
              </span>
            </div>
            <div>
              <p className="text-2xl font-black">{parcel.paymentStatus === 'PAID' ? 'RÉGLÉ' : 'À PAYER'}</p>
              <p className="text-sm opacity-70 mt-1">Méthode: {parcel.paymentMethod}</p>
            </div>
            {parcel.paymentStatus !== 'PAID' && (
              <button className="w-full bg-primary text-on-primary font-bold py-2 rounded-lg mt-2">Enregistrer Paiement</button>
            )}
          </div>

          {/* POD Card */}
          {parcel.status === 'DELIVERED' && parcel.pod ? (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">verified</span>
                Preuve de Livraison
              </h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-on-surface-variant">Signature</span>
                  <div className="w-full h-32 bg-gray-50 border border-outline-variant rounded-lg flex items-center justify-center overflow-hidden">
                    {parcel.pod.signatureUrl ? (
                      <img src={parcel.pod.signatureUrl} alt="Signature" className="max-h-full object-contain" />
                    ) : (
                      <span className="text-xs italic text-gray-400">Signature numérisée</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-on-surface-variant">Position GPS</span>
                  <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <p className="text-xs font-bold text-primary">
                      {parcel.pod.latitude?.toFixed(4)}, {parcel.pod.longitude?.toFixed(4)}
                    </p>
                  </div>
                </div>

                {parcel.pod.photoUrl && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-on-surface-variant">Photo de livraison</span>
                    <div className="w-full h-48 bg-gray-50 border border-outline-variant rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={parcel.pod.photoUrl} alt="Preuve de livraison" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-on-surface-variant italic">
                  Livré le {new Date(parcel.pod.deliveredAt || parcel.pod.updatedAt).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-3 py-12">
              <span className="material-symbols-outlined text-4xl text-outline opacity-20">inventory_2</span>
              <p className="text-sm font-bold text-on-surface-variant opacity-50 italic">Aucune preuve de livraison disponible</p>
            </div>
          )}

          {/* Action Note */}
          <div className="bg-primary-container p-6 rounded-2xl text-on-primary-container shadow-md">
            <h4 className="font-label-md text-label-md font-black uppercase mb-2">Actions Admin</h4>
            <ul className="text-xs flex flex-col gap-2 opacity-90">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
                Le changement de statut envoie un SMS automatique au client.
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] mt-0.5">shield</span>
                Les modifications sont tracées dans le journal de sécurité.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
