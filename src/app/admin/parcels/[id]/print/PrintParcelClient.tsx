'use client'

import React, { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function PrintParcelClient({ parcel }: { parcel: any }) {
  
  useEffect(() => {
    // Petit délai pour s'assurer que tout est chargé (notamment le QR code)
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-white min-h-screen p-8 text-black font-sans print:p-0">
      {/* Bouton retour (caché à l'impression) */}
      <div className="mb-8 print:hidden flex justify-between items-center">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Retour
        </button>
        <button 
          onClick={() => window.print()}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">print</span>
          Imprimer à nouveau
        </button>
      </div>

      {/* Le Bordereau */}
      <div className="max-w-[800px] mx-auto border-2 border-black p-8 flex flex-col gap-8 bg-white shadow-lg print:shadow-none print:border-none print:max-w-full">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-primary">TOGOTRANSIT</h1>
            <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Logistique & Transport de Colis</p>
            <p className="text-xs mt-2">Siège: Lomé, Togo • Tél: +228 90 00 00 00</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase">Bordereau d'Expédition</h2>
            <p className="text-sm font-medium mt-1">Date: {new Date(parcel.createdAt).toLocaleDateString('fr-FR')}</p>
            <p className="text-lg font-black mt-2 text-primary">{parcel.trackingId}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8">
          {/* Expéditeur */}
          <div className="flex flex-col gap-2 border border-gray-200 p-4 rounded-lg bg-gray-50">
            <h3 className="text-xs font-black uppercase text-gray-500 border-b border-gray-200 pb-1">Expéditeur</h3>
            <p className="text-lg font-bold">{parcel.senderName}</p>
            <p className="text-sm font-medium">{parcel.senderPhone}</p>
            <p className="text-sm mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">location_on</span>
              {parcel.origin}
            </p>
          </div>

          {/* Destinataire */}
          <div className="flex flex-col gap-2 border border-gray-200 p-4 rounded-lg bg-gray-50">
            <h3 className="text-xs font-black uppercase text-gray-500 border-b border-gray-200 pb-1">Destinataire</h3>
            <p className="text-lg font-bold">{parcel.receiverName}</p>
            <p className="text-sm font-medium">{parcel.receiverPhone}</p>
            <p className="text-sm mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">location_on</span>
              {parcel.destination}
            </p>
          </div>
        </div>

        {/* Détails Colis */}
        <div className="flex flex-col gap-4 border border-black p-4">
          <h3 className="text-xs font-black uppercase text-gray-500">Détails de l'Envoi</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="flex flex-col">
              <span className="text-[0.625rem] uppercase font-bold text-gray-600">Poids</span>
              <span className="text-lg font-black">{parcel.weight} kg</span>
            </div>
            <div className="flex flex-col border-l border-gray-200">
              <span className="text-[0.625rem] uppercase font-bold text-gray-600">Catégorie</span>
              <span className="text-sm font-bold">{parcel.category}</span>
            </div>
            <div className="flex flex-col border-l border-gray-200">
              <span className="text-[0.625rem] uppercase font-bold text-gray-600">Livraison</span>
              <span className="text-sm font-bold">{parcel.deliveryType}</span>
            </div>
            <div className="flex flex-col border-l border-gray-200">
              <span className="text-[0.625rem] uppercase font-bold text-gray-600">Montant</span>
              <span className="text-lg font-black">{parcel.price.toLocaleString('fr-FR')} F</span>
            </div>
          </div>
        </div>

        {/* QR Code & Signature Area */}
        <div className="flex justify-between items-end mt-4">
          <div className="flex flex-col items-center gap-2">
            <QRCodeSVG value={parcel.trackingId} size={100} level="H" />
            <p className="text-[0.625rem] font-bold tracking-widest">{parcel.trackingId}</p>
          </div>

          <div className="flex flex-col gap-12 w-48 text-center border-t border-black pt-2">
            <p className="text-[0.625rem] font-bold uppercase">Signature Client</p>
          </div>

          <div className="flex flex-col gap-12 w-48 text-center border-t border-black pt-2">
            <p className="text-[0.625rem] font-bold uppercase">Cachet Agence</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-[0.625rem] text-gray-600 text-center italic border-t border-gray-100 pt-4">
          Merci d'avoir choisi TogoTransit. Suivez votre colis sur www.togotransit.tg avec votre ID de tracking.
          <br />Conditions générales applicables.
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
