'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'

export default function PODClient({ parcel }: { parcel: any }) {
  const router = useRouter()
  const sigPad = useRef<SignatureCanvas>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)

  // Simulation GPS
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      })
    }
  }, [])

  const clear = () => {
    sigPad.current?.clear()
  }

  const handleSave = async () => {
    if (sigPad.current?.isEmpty()) {
      alert("Veuillez signer avant de valider.")
      return
    }

    setLoading(true)
    try {
      const signatureData = sigPad.current?.getTrimmedCanvas().toDataURL('image/png')
      
      const response = await fetch(`/api/parcels/${parcel.id}/pod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          latitude: location?.lat,
          longitude: location?.lng
        })
      })

      if (response.ok) {
        alert("Preuve de livraison enregistrée avec succès !")
        router.push('/admin/parcels')
        router.refresh()
      } else {
        throw new Error('Failed to save POD')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de l'enregistrement de la preuve")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Preuve de Livraison (POD)</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Colis: {parcel.trackingId} • Destinataire: {parcel.receiverName}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-lg flex flex-col gap-6">
        {/* GPS Status */}
        <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
          <span className={`material-symbols-outlined ${location ? 'text-green-500' : 'text-orange-500'} animate-pulse`}>
            {location ? 'location_on' : 'location_searching'}
          </span>
          <div>
            <p className="font-label-sm text-[10px] uppercase text-on-surface-variant">Coordonnées GPS</p>
            <p className="font-body-sm text-xs font-bold text-primary">
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Recherche de la position...'}
            </p>
          </div>
        </div>

        {/* Signature Pad */}
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface font-bold">Signature du destinataire</label>
          <div className="border-2 border-dashed border-outline-variant rounded-xl overflow-hidden bg-white">
            <SignatureCanvas 
              ref={sigPad}
              penColor='black'
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair'
              }}
            />
          </div>
          <button 
            onClick={clear}
            className="text-primary text-xs font-bold self-end hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Effacer la signature
          </button>
        </div>

        {/* Photo Simulation */}
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface font-bold">Photo du colis (Optionnel)</label>
          <div className="w-full h-32 border-2 border-dashed border-outline-variant rounded-xl flex flex-center justify-center items-center bg-surface-container-low text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors">
            <div className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-3xl">add_a_photo</span>
              <span className="text-xs font-bold uppercase">Prendre une photo</span>
            </div>
          </div>
        </div>

        <button 
          disabled={loading}
          onClick={handleSave}
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          {loading ? (
            <span className="animate-spin material-symbols-outlined">sync</span>
          ) : (
            <span className="material-symbols-outlined">verified</span>
          )}
          {loading ? 'Validation...' : 'Valider la livraison'}
        </button>
      </div>

      <div className="bg-secondary-container p-4 rounded-xl text-on-secondary-container text-xs flex items-start gap-3">
        <span className="material-symbols-outlined">shield</span>
        <p className="opacity-90 leading-relaxed">
          Cette action enregistrera l'heure exacte, la position GPS et la signature pour garantir la sécurité de la livraison. Un SMS de confirmation sera envoyé à l'expéditeur.
        </p>
      </div>
    </div>
  )
}
