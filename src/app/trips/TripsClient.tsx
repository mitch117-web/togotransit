'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TripItem {
  id: number
  compagnie: {
    id: number
    nom: string
    telephone?: string
    email?: string
  }
  origin: string
  destination: string
  departureTime: string
  arrivalTime?: string
  price: number
  placesDisponibles: number
  totalSeats: number
  status: string
  vehicle?: {
    id: number
    type: string
    immatriculation: string
  } | null
  rating: number
  reviewsCount: number
  amenities: string[]
  bookingsCount: number
}

export default function TripsClient({ 
  initialTrips, 
  origins, 
  destinations,
  companies,
  initialOrigin,
  initialDestination,
  initialCompany,
}: { 
  initialTrips: TripItem[], 
  origins: string[], 
  destinations: string[],
  companies: string[],
  initialOrigin?: string,
  initialDestination?: string,
  initialCompany?: string,
}) {
  const [origin, setOrigin] = useState(initialOrigin || '')
  const [destination, setDestination] = useState(initialDestination || '')
  const [selectedCompany, setSelectedCompany] = useState(initialCompany || '')
  const [sortBy, setSortBy] = useState<'price_asc' | 'time_asc' | 'rating_desc'>('price_asc')
  const [filterVipOnly, setFilterVipOnly] = useState(false)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (origin) params.set('origin', origin)
    if (destination) params.set('destination', destination)
    if (selectedCompany) params.set('company', selectedCompany)
    router.push(`/trips?${params.toString()}`)
  }

  // Filtrage et tri côté client réactif
  const filteredAndSortedTrips = useMemo(() => {
    let list = [...initialTrips]

    if (selectedCompany) {
      list = list.filter(t => t.compagnie.nom.toLowerCase() === selectedCompany.toLowerCase())
    }

    if (filterVipOnly) {
      list = list.filter(t => t.vehicle?.type.toLowerCase().includes('vip'))
    }

    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price
      if (sortBy === 'time_asc') return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      if (sortBy === 'rating_desc') return b.rating - a.rating
      return 0
    })

    return list
  }, [initialTrips, selectedCompany, filterVipOnly, sortBy])

  // Trouver le tarif le plus bas pour le badge 'Meilleur Prix'
  const lowestPrice = useMemo(() => {
    if (filteredAndSortedTrips.length === 0) return null
    return Math.min(...filteredAndSortedTrips.map(t => t.price))
  }, [filteredAndSortedTrips])

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Moteur de Recherche & Comparateur */}
      <section className="bg-white p-6 md:p-8 rounded-[2rem] border border-outline-variant shadow-lg flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-black uppercase rounded-full w-fit">
            <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
            Comparateur Multi-Compagnies Togo
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-primary">Trouvez et comparez vos billets de bus</h2>
          <p className="text-on-surface-variant text-sm">Comparez en temps réel les horaires et tarifs de Nagodé, SOLIM, LK Transport et plus.</p>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Départ */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase text-outline ml-3">Ville de départ</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-60">trip_origin</span>
              <select 
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none font-bold text-primary text-sm appearance-none transition-all"
              >
                <option value="">Toutes les villes</option>
                {origins.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Arrivée */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase text-outline ml-3">Ville d'arrivée</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary opacity-60">location_on</span>
              <select 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant focus:border-secondary outline-none font-bold text-primary text-sm appearance-none transition-all"
              >
                <option value="">Toutes les destinations</option>
                {destinations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Compagnie */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase text-outline ml-3">Compagnie</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">directions_bus</span>
              <select 
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none font-bold text-primary text-sm appearance-none transition-all"
              >
                <option value="">Toutes les compagnies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Bouton de recherche */}
          <div className="flex flex-col justify-end">
            <button 
              type="submit"
              className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-black text-sm hover:brightness-110 shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              Comparer les offres
            </button>
          </div>
        </form>

        {/* Barre d'options de tri et filtres rapides */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-outline-variant/30 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-on-surface-variant">Trier par :</span>
            <button 
              type="button"
              onClick={() => setSortBy('price_asc')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                sortBy === 'price_asc' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              💰 Prix le plus bas
            </button>
            <button 
              type="button"
              onClick={() => setSortBy('time_asc')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                sortBy === 'time_asc' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              ⏰ Départ le plus proche
            </button>
            <button 
              type="button"
              onClick={() => setSortBy('rating_desc')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                sortBy === 'rating_desc' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              ⭐ Meilleure note
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-primary select-none">
            <input 
              type="checkbox" 
              checked={filterVipOnly} 
              onChange={(e) => setFilterVipOnly(e.target.checked)} 
              className="rounded border-outline text-primary focus:ring-primary w-4 h-4"
            />
            <span>👑 Uniquement les bus VIP</span>
          </label>
        </div>
      </section>

      {/* Liste des résultats comparatifs */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-lg font-black text-primary uppercase tracking-wider">
            {filteredAndSortedTrips.length} Offres de transport disponibles
          </h3>
          <span className="text-xs font-bold text-on-surface-variant">
            Prix direct garanti - Sans frais cachés
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {filteredAndSortedTrips.map((trip) => {
            const seatsLeft = trip.placesDisponibles
            const isFull = seatsLeft <= 0
            const isBestPrice = lowestPrice !== null && trip.price === lowestPrice

            return (
              <div 
                key={trip.id} 
                className="bg-white rounded-2xl border border-outline-variant hover:border-primary/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col lg:flex-row"
              >
                {/* 1. Colonne Compagnie & Logo */}
                <div className="p-6 bg-surface-container-low border-b lg:border-b-0 lg:border-r border-outline-variant/30 flex flex-row lg:flex-col justify-between items-start lg:w-64 shrink-0 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary text-on-primary font-black text-xl flex items-center justify-center shadow-sm">
                      {trip.compagnie.nom.substring(0, 1)}
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-black text-primary text-base leading-tight">{trip.compagnie.nom}</h4>
                      <span className="text-[11px] font-bold text-on-surface-variant">Compagnie Agréée</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-500 text-[18px] fill-icon" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-black text-xs text-on-surface">{trip.rating}</span>
                      <span className="text-[10px] text-on-surface-variant">({trip.reviewsCount} avis)</span>
                    </div>
                    {isBestPrice && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-black uppercase rounded-full w-fit">
                        🏆 Meilleur Tarif
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Colonne Trajet & Horaires */}
                <div className="p-6 flex-1 flex flex-col justify-center gap-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Heure et Ville de Départ */}
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-primary">
                        {new Date(trip.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-bold text-sm text-on-surface">{trip.origin}</span>
                      <span className="text-[10px] text-on-surface-variant">Gare Centrale</span>
                    </div>

                    {/* Indicateur de trajet */}
                    <div className="flex-1 flex flex-col items-center px-4 max-w-[200px]">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Direct</span>
                      <div className="w-full flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></div>
                        <div className="h-0.5 flex-1 bg-outline-variant relative">
                          <span className="material-symbols-outlined text-[16px] text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                            directions_bus
                          </span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0"></div>
                      </div>
                      <span className="text-[10px] font-medium text-on-surface-variant mt-1">
                        {new Date(trip.departureTime).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    {/* Arrivée */}
                    <div className="flex flex-col text-right">
                      <span className="text-2xl font-black text-secondary">
                        {trip.arrivalTime 
                          ? new Date(trip.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                          : 'Arrivée'}
                      </span>
                      <span className="font-bold text-sm text-on-surface">{trip.destination}</span>
                      <span className="text-[10px] text-on-surface-variant">Gare Routière</span>
                    </div>
                  </div>

                  {/* Services & Véhicule */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="px-2.5 py-1 bg-surface-container-high rounded-md text-[11px] font-bold text-on-surface-variant">
                      🚌 {trip.vehicle?.type}
                    </span>
                    {trip.amenities.map((am, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-md">
                        ✓ {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Colonne Prix & Action */}
                <div className="p-6 bg-surface-container-lowest lg:border-l border-outline-variant/30 flex flex-row lg:flex-col justify-between items-center lg:items-end lg:justify-center gap-4 lg:w-56 shrink-0">
                  <div className="flex flex-col lg:text-right">
                    <span className="text-[10px] font-black uppercase text-outline tracking-wider">Tarif par passager</span>
                    <span className="text-3xl font-black text-primary leading-tight">
                      {trip.price.toLocaleString('fr-FR')} <span className="text-sm font-bold text-secondary">FCFA</span>
                    </span>
                    <span className={`text-[11px] font-bold mt-1 ${seatsLeft <= 5 ? 'text-error font-black' : 'text-green-700'}`}>
                      {isFull ? 'COMPLET' : `🔥 ${seatsLeft} places restantes`}
                    </span>
                  </div>

                  <button 
                    onClick={() => router.push(`/trips/${trip.id}`)}
                    disabled={isFull}
                    className={`w-full lg:w-full py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isFull 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-primary text-on-primary hover:brightness-110 hover:shadow-md'
                    }`}
                  >
                    <span>{isFull ? 'Indisponible' : 'Choisir Siège'}</span>
                    {!isFull && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredAndSortedTrips.length === 0 && (
          <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-outline-variant flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-4xl">search_off</span>
            </div>
            <h4 className="text-xl font-black text-primary">Aucun trajet trouvé pour cette sélection</h4>
            <p className="text-on-surface-variant text-sm max-w-md">
              Modifiez vos critères de recherche ou réinitialisez les filtres pour voir tous les départs disponibles au Togo.
            </p>
            <button 
              onClick={() => { setOrigin(''); setDestination(''); setSelectedCompany(''); setFilterVipOnly(false); }}
              className="mt-2 px-6 py-2.5 bg-secondary text-on-secondary font-black rounded-xl text-xs uppercase tracking-wider shadow-sm hover:brightness-110 transition-all"
            >
              Afficher tous les trajets
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
