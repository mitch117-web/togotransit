'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TrackingClient({ initialParcel, initialId }: { initialParcel: any, initialId?: string }) {
  const [trackingId, setTrackingId] = useState(initialId || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId) return
    setLoading(true)
    router.push(`/tracking?id=${trackingId.toUpperCase()}`)
    setLoading(false)
  }

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'IN_AGENCY': return 1
      case 'IN_TRANSIT': return 2
      case 'OUT_FOR_DELIVERY': return 3
      case 'DELIVERED': return 4
      default: return 1
    }
  }

  const currentStep = initialParcel ? getStatusStep(initialParcel.status) : 0

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* Search Bar Section */}
      <section className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant shadow-xl flex flex-col gap-6 items-center text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-primary">Suivez votre envoi</h2>
          <p className="text-on-surface-variant max-w-sm">Entrez votre numéro de tracking (ex: TRK-1001) pour voir l'état actuel de votre colis.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 w-full max-w-lg">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-2xl">search</span>
            <input 
              type="text" 
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Ex: TRK-1001"
              className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border-2 border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-xl font-bold uppercase transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-secondary text-on-secondary px-8 py-4 rounded-2xl font-black text-lg hover:brightness-110 shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <span className="animate-spin material-symbols-outlined">sync</span> : 'SUIVRE'}
          </button>
        </form>
      </section>

      {/* Result Section */}
      {initialParcel ? (
        <section className="flex flex-col gap-8">
          {/* Tracking Stepper */}
          <div className="bg-white p-8 rounded-[2rem] border border-outline-variant shadow-lg flex flex-col gap-10 overflow-hidden relative">
            <div className="flex justify-between items-center border-b border-outline-variant pb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-outline tracking-widest">Colis ID</span>
                <span className="text-2xl font-black text-primary">{initialParcel.trackingId}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-outline tracking-widest">Destination</span>
                <span className="text-2xl font-black text-primary">{initialParcel.destination}</span>
              </div>
            </div>

            {/* Stepper Logic */}
            <div className="relative flex justify-between items-center px-4 md:px-10">
              {/* Progress Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0">
                <div 
                  className="h-full bg-green-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                ></div>
              </div>

              {/* Steps */}
              {[
                { label: 'En Agence', icon: 'storefront' },
                { label: 'En Transit', icon: 'local_shipping' },
                { label: 'En cours', icon: 'delivery_dining' },
                { label: 'Livré', icon: 'check_circle' }
              ].map((step, index) => {
                const stepNum = index + 1
                const isActive = stepNum <= currentStep
                const isCurrent = stepNum === currentStep

                return (
                  <div key={index} className="flex flex-col items-center gap-3 relative z-10">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
                      isActive 
                        ? 'bg-green-500 border-green-100 text-white shadow-lg shadow-green-200' 
                        : 'bg-white border-gray-100 text-gray-300'
                    } ${isCurrent ? 'scale-110 ring-4 ring-green-50' : ''}`}>
                      <span className="material-symbols-outlined text-2xl md:text-3xl">{step.icon}</span>
                    </div>
                    <span className={`text-[10px] md:text-xs font-black uppercase tracking-tighter text-center max-w-[60px] md:max-w-none ${
                      isActive ? 'text-green-600' : 'text-gray-300'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-outline-variant mt-4">
              <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-outline-variant/50">
                <span className="material-symbols-outlined text-primary text-3xl opacity-40">calendar_today</span>
                <div>
                  <p className="text-[10px] font-black uppercase text-outline">Date d'expédition</p>
                  <p className="font-bold">{new Date(initialParcel.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-outline-variant/50">
                <span className="material-symbols-outlined text-primary text-3xl opacity-40">weight</span>
                <div>
                  <p className="text-[10px] font-black uppercase text-outline">Poids</p>
                  <p className="font-bold">{initialParcel.weight} kg</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-outline-variant/50">
                <span className="material-symbols-outlined text-primary text-3xl opacity-40">payments</span>
                <div>
                  <p className="text-[10px] font-black uppercase text-outline">Statut Paiement</p>
                  <p className={`font-bold ${initialParcel.paymentStatus === 'PAID' ? 'text-green-600' : 'text-error'}`}>
                    {initialParcel.paymentStatus === 'PAID' ? 'RÉGLÉ' : 'À PAYER'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {initialParcel.status === 'DELIVERED' && initialParcel.pod && (
            <div className="bg-green-50 border-2 border-green-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-sm">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-500 shadow-md">
                <span className="material-symbols-outlined text-4xl">verified_user</span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-black text-green-800">Colis Livré avec succès</h3>
                <p className="text-green-700 text-sm">Ce colis a été remis en mains propres le {new Date(initialParcel.pod.deliveredAt).toLocaleDateString('fr-FR')} à {new Date(initialParcel.pod.deliveredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-20 bg-white/50 border border-green-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {initialParcel.pod.signatureUrl ? (
                    <img src={initialParcel.pod.signatureUrl} alt="Signature POD" className="max-h-full object-contain" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-green-200">signature</span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase text-green-800 opacity-60">Signature POD</span>
              </div>
            </div>
          )}
        </section>
      ) : initialId ? (
        <section className="bg-error-container/20 p-8 rounded-[2rem] border border-error-container/50 text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-6xl text-error">sentiment_very_dissatisfied</span>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-error">Numéro de suivi invalide</h3>
            <p className="text-error/80">Nous ne trouvons aucun colis correspondant au numéro <span className="font-bold">{initialId}</span>. Veuillez vérifier votre bordereau.</p>
          </div>
          <button 
            onClick={() => setTrackingId('')}
            className="mt-4 text-error font-bold border-b-2 border-error/20 hover:border-error transition-all"
          >
            Réessayer
          </button>
        </section>
      ) : (
        /* Empty State / Welcome */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Fiabilité', text: 'Chaque colis est scanné à chaque étape de son voyage.', icon: 'shield_with_heart' },
            { title: 'Rapidité', text: 'Service express entre les grandes villes du Togo.', icon: 'bolt' },
            { title: 'Proximité', text: 'Agences disponibles à Lomé, Kara, Atakpamé et plus.', icon: 'location_on' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-outline-variant flex flex-col gap-4">
              <span className="material-symbols-outlined text-primary text-4xl opacity-20">{item.icon}</span>
              <h4 className="font-black text-primary uppercase text-sm tracking-tighter">{item.title}</h4>
              <p className="text-on-surface-variant text-xs leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
