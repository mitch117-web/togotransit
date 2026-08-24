'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PublicBookingClient({ trip }: { trip: any }) {
  const router = useRouter()
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [passenger, setPassenger] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const takenSeats = trip.bookings.map((b: any) => b.seatNumber)
  const capacity = trip.vehicle?.capacity || 45

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSeat) {
      alert("Veuillez sélectionner un siège.")
      return
    }

    if (!passenger.name || !passenger.phone) {
      alert("Veuillez remplir vos informations.")
      return
    }
    
    setLoading(true)
    try {
      // 1. D'abord on crée/récupère l'utilisateur via une API simplifiée ou on utilise l'existant
      // Pour cet exemple, on va utiliser l'API /api/users pour créer un client s'il n'existe pas
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...passenger, role: 'CLIENT', password: 'password123' })
      })
      
      const userData = await userRes.json()
      if (!userRes.ok && userRes.status !== 409) { // 409 if user already exists
        throw new Error(userData.error || "Erreur lors de l'identification")
      }

      // 2. On effectue la réservation
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          userId: userData.id, // L'ID retourné par l'API
          seatNumber: selectedSeat,
          paymentMethod: 'TMONEY' // Par défaut pour le public
        })
      })

      if (bookingRes.ok) {
        alert(`Félicitations ${passenger.name} ! Votre réservation pour le siège #${selectedSeat} est confirmée. Un SMS vous a été envoyé.`)
        router.push('/trips')
      } else {
        const error = await bookingRes.json()
        throw new Error(error.error || 'Erreur lors de la réservation')
      }
    } catch (error: any) {
      alert(error.message || "Erreur lors de la réservation")
    } finally {
      setLoading(false)
    }
  }

  const renderSeats = () => {
    const seats = []
    for (let i = 1; i <= capacity; i++) {
      const isTaken = takenSeats.includes(i)
      const isSelected = selectedSeat === i
      
      seats.push(
        <button
          key={i}
          type="button"
          disabled={isTaken || loading}
          onClick={() => setSelectedSeat(i)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2 ${
            isTaken 
              ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
              : isSelected
                ? 'bg-secondary text-on-secondary border-secondary shadow-lg scale-110'
                : 'bg-white border-outline-variant text-primary hover:border-primary'
          }`}
        >
          {i}
        </button>
      )
    }
    return seats
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-primary font-bold hover:underline mb-4">
          <span className="material-symbols-outlined">arrow_back</span>
          Retour aux trajets
        </button>
        <h2 className="text-4xl font-black text-primary tracking-tighter">SÉLECTIONNEZ VOTRE SIÈGE</h2>
        <p className="text-on-surface-variant text-lg">
          Voyage de <span className="font-bold text-primary">{trip.origin}</span> à <span className="font-bold text-secondary">{trip.destination}</span>
          <br />
          <span className="text-sm opacity-60">Départ le {new Date(trip.departureTime).toLocaleString('fr-FR')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Bus Map */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-outline-variant shadow-2xl flex flex-col items-center">
          <div className="w-full max-w-sm flex flex-col gap-8">
            <div className="w-full h-16 bg-surface-container-high rounded-t-[50px] border-x-4 border-t-4 border-outline-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-3xl">directions_bus</span>
            </div>

            <div className="grid grid-cols-4 gap-x-6 gap-y-4 px-4">
              {renderSeats()}
            </div>

            <div className="flex justify-center gap-8 mt-8 pt-8 border-t border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white border-2 border-outline-variant rounded-md"></div>
                <span className="text-[10px] font-black uppercase text-outline">Libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 border-2 border-gray-300 rounded-md"></div>
                <span className="text-[10px] font-black uppercase text-outline">Occupé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-secondary border-2 border-secondary rounded-md"></div>
                <span className="text-[10px] font-black uppercase text-outline">Choisi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleBooking} className="flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-outline-variant shadow-2xl flex flex-col gap-8">
            <h3 className="text-2xl font-black text-primary tracking-tight">VOS INFORMATIONS</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-outline ml-4">Nom Complet</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Koffi Mensah"
                  className="w-full px-6 py-4 bg-surface-container-low rounded-2xl border-2 border-transparent focus:border-primary outline-none font-bold text-primary"
                  value={passenger.name}
                  onChange={(e) => setPassenger({...passenger, name: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-outline ml-4">Téléphone</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="90 00 00 00"
                  className="w-full px-6 py-4 bg-surface-container-low rounded-2xl border-2 border-transparent focus:border-primary outline-none font-bold text-primary"
                  value={passenger.phone}
                  onChange={(e) => setPassenger({...passenger, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-3xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-on-surface-variant">Siège :</span>
                <span className="text-2xl font-black text-primary">{selectedSeat ? `#${selectedSeat}` : '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-on-surface-variant">Total :</span>
                <span className="text-2xl font-black text-secondary">{trip.price.toLocaleString('fr-FR')} F</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={!selectedSeat || loading}
              className="w-full bg-primary text-on-primary py-5 rounded-2xl font-black text-lg hover:brightness-110 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin material-symbols-outlined">sync</span>
              ) : (
                <span className="material-symbols-outlined">shopping_cart_checkout</span>
              )}
              {loading ? 'RÉSERVATION EN COURS...' : 'CONFIRMER ET PAYER'}
            </button>
            
            <p className="text-[10px] text-center text-on-surface-variant px-4 leading-relaxed">
              En cliquant sur confirmer, vous recevrez une demande de paiement TMoney ou Flooz sur votre téléphone.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
