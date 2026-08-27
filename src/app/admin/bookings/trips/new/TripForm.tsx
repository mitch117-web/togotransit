'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tripSchema, TripFormValues } from '@/lib/schemas'

export default function TripForm({ vehicles, drivers, cities }: { vehicles: any[], drivers: any[], cities: string[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      status: 'PLANNED',
      price: 5000
    }
  })

  const onSubmit = async (data: TripFormValues) => {
    setLoading(true)
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        router.push('/admin/bookings')
        router.refresh()
      } else {
        const err = await response.json()
        alert(err.details ? `${err.error}: ${err.details}` : (err.error || 'Erreur lors de la création'))
      }
    } catch (error) {
      alert('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trajet */}
        <div className="flex flex-col gap-4">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">route</span>
            Itinéraire
          </h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant">Ville de départ</label>
            <select 
              {...register('origin')}
              className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
            >
              <option value="">Sélectionner une ville</option>
              {cities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
            {errors.origin && <span className="text-[0.625rem] text-error font-bold">{errors.origin.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant">Destination</label>
            <select 
              {...register('destination')}
              className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
            >
              <option value="">Sélectionner une ville</option>
              {cities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
            {errors.destination && <span className="text-[0.625rem] text-error font-bold">{errors.destination.message}</span>}
          </div>
        </div>

        {/* Logistique */}
        <div className="flex flex-col gap-4">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">bus_alert</span>
            Logistique
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant">Véhicule assigné</label>
            <select 
              {...register('vehicleId')}
              className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
            >
              <option value="">Sélectionner un véhicule</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} ({v.type} - {v.capacity} places)
                </option>
              ))}
            </select>
            {errors.vehicleId && <span className="text-[0.625rem] text-error font-bold">{errors.vehicleId.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant">Chauffeur</label>
            <select 
              {...register('driverId')}
              className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
            >
              <option value="">Assigner plus tard</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant">Prix du ticket (F CFA)</label>
            <input 
              type="number"
              {...register('price', { valueAsNumber: true })}
              className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
            />
            {errors.price && <span className="text-[0.625rem] text-error font-bold">{errors.price.message}</span>}
          </div>
        </div>

        {/* Temps */}
        <div className="flex flex-col gap-4 md:col-span-2">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">schedule</span>
            Horaires
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Départ prévu</label>
              <input 
                type="datetime-local"
                {...register('departureTime')}
                className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
              />
              {errors.departureTime && <span className="text-[0.625rem] text-error font-bold">{errors.departureTime.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Arrivée estimée (Optionnel)</label>
              <input 
                type="datetime-local"
                {...register('arrivalTime')}
                className="bg-surface-container-low p-3 rounded-xl border border-outline-variant outline-none focus:border-primary transition-all font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-outline-variant">
        <button 
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-6 py-3 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          Annuler
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-on-primary px-6 py-3 rounded-xl font-black text-lg hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'CRÉATION...' : 'PLANIFIER LE VOYAGE'}
        </button>
      </div>
    </form>
  )
}
