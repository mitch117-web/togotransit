'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SeatSelectionClient({ trip, users }: { trip: any, users: any[] }) {
  const router = useRouter()
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', phone: '' })
  const [localUsers, setLocalUsers] = useState(users)

  const filteredUsersList = localUsers.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.phone.includes(userSearch)
  )

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, role: 'CLIENT', password: 'password123' })
      })
      if (response.ok) {
        const created = await response.json()
        setLocalUsers([created, ...localUsers])
        setSelectedUser(created.id)
        setShowUserModal(false)
        setNewUser({ name: '', phone: '' })
      } else {
        alert("Erreur lors de la création du client")
      }
    } catch (error) {
      alert("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  const takenSeats = trip.bookings.map((b: any) => b.seatNumber)
  const capacity = trip.vehicle?.capacity || 45

  const handleBooking = async () => {
    if (!selectedSeat || !selectedUser) {
      alert("Veuillez sélectionner un siège et un client.")
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          userId: selectedUser,
          seatNumber: selectedSeat,
          paymentMethod: 'CASH' // Par défaut pour l'agent
        })
      })

      if (response.ok) {
        alert(`Réservation confirmée pour le siège #${selectedSeat} !`)
        router.refresh()
        setSelectedSeat(null)
        setSelectedUser('')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la réservation')
      }
    } catch (error: any) {
      alert(error.message || "Erreur lors de la réservation")
    } finally {
      setLoading(false)
    }
  }

  // Génération du plan de bus (2+2 avec allée)
  const renderSeats = () => {
    const seats = []
    for (let i = 1; i <= capacity; i++) {
      const booking = trip.bookings.find((b: any) => b.seatNumber === i)
      const isTaken = !!booking
      const isSelected = selectedSeat === i
      
      seats.push(
        <div key={i} className="relative group">
          <button
            disabled={isTaken || loading}
            onClick={() => setSelectedSeat(i)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2 ${
              isTaken 
                ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
                : isSelected
                  ? 'bg-secondary-container border-secondary text-on-secondary-container shadow-md'
                  : 'bg-white border-outline-variant text-primary hover:border-primary'
            }`}
          >
            {i}
          </button>
          {isTaken && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-on-surface text-surface text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg font-bold">
              {booking.user.name}
            </div>
          )}
        </div>
      )
    }
    return seats
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Sélection de Sièges</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {trip.origin} → {trip.destination} • {new Date(trip.departureTime).toLocaleString('fr-FR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Bus Map */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant shadow-lg flex flex-col items-center h-fit">
          <div className="w-full max-w-sm flex flex-col gap-6">
            {/* Avant du bus */}
            <div className="w-full h-12 bg-gray-100 rounded-t-[40px] border-x-2 border-t-2 border-gray-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400">directions_bus</span>
            </div>

            {/* Grille des sièges */}
            <div className="grid grid-cols-4 gap-x-4 gap-y-3 px-4">
              {renderSeats()}
            </div>

            {/* Légende */}
            <div className="flex justify-center gap-6 mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-outline-variant rounded"></div>
                <span className="text-[10px] font-bold uppercase text-gray-500">Libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded"></div>
                <span className="text-[10px] font-bold uppercase text-gray-500">Occupé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-secondary-container border-2 border-secondary rounded"></div>
                <span className="text-[10px] font-bold uppercase text-gray-500">Sélectionné</span>
              </div>
            </div>
          </div>
        </div>

        {/* Passengers List & Booking Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* List of current passengers */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-md flex flex-col gap-4">
            <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">group</span>
              Liste des Passagers ({trip.bookings.length})
            </h3>
            
            <div className="max-h-[300px] overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
              {trip.bookings.length > 0 ? (
                trip.bookings.sort((a: any, b: any) => a.seatNumber - b.seatNumber).map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-black text-xs">
                        #{booking.seatNumber}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface leading-tight">{booking.user.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{booking.user.phone}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 uppercase">
                      Confirmé
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-on-surface-variant italic opacity-50">
                  Aucun passager pour le moment.
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-md flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm text-primary">Nouvelle Réservation</h3>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Passager</label>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm opacity-50">search</span>
                  <input 
                    type="text" 
                    placeholder="Chercher par nom ou tél..."
                    className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary outline-none text-xs"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <select 
                  className="px-4 py-3 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none text-sm"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Sélectionner un client...</option>
                  {filteredUsersList.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                  ))}
                </select>
              </div>
              <button 
                type="button"
                onClick={() => setShowUserModal(true)}
                className="text-primary text-[11px] font-bold mt-1 hover:underline text-left"
              >
                + Créer un nouveau client
              </button>
            </div>

            <div className="bg-primary-container/20 p-4 rounded-lg flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Siège sélectionné :</span>
                <span className="font-bold text-primary">{selectedSeat ? `#${selectedSeat}` : 'Aucun'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Prix du ticket :</span>
                <span className="font-bold text-primary">{trip.price.toLocaleString('fr-FR')} F</span>
              </div>
            </div>

            <button 
              disabled={!selectedSeat || !selectedUser || loading}
              onClick={handleBooking}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin material-symbols-outlined">sync</span>
              ) : (
                <span className="material-symbols-outlined">confirmation_number</span>
              )}
              {loading ? 'Réservation...' : 'Confirmer la réservation'}
            </button>
          </div>
        </div>
      </div>

      {/* User Creation Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-headline-sm text-headline-sm text-primary font-bold">Nouveau Client</h4>
              <button onClick={() => setShowUserModal(false)} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Nom Complet</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Koffi Mensah"
                  className="px-4 py-3 bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-medium"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Téléphone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">+228</span>
                  <input 
                    type="tel" 
                    required 
                    placeholder="90000000"
                    className="w-full pl-14 pr-4 py-3 bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-medium"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold mt-2 shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-spin material-symbols-outlined">sync</span> : 'ENREGISTRER LE CLIENT'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
