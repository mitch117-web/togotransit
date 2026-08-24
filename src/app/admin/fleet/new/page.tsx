'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema, type VehicleFormData } from '@/lib/schemas'

export default function NewVehiclePage() {
  const router = useRouter()
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: '',
      type: 'Classique',
      capacity: 60,
      status: 'disponible'
    }
  })

  const onSubmit = async (data: VehicleFormData) => {
    try {
      const response = await fetch('/api/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        alert('Véhicule ajouté avec succès !')
        router.push('/admin/fleet')
        router.refresh()
      } else {
        throw new Error('Failed to create vehicle')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de l'ajout du véhicule")
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="font-headline-lg text-headline-lg text-primary">Ajouter un Véhicule</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-lg flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Immatriculation</label>
          <input 
            {...register('plateNumber')}
            type="text" 
            placeholder="Ex: TG-1234-A"
            disabled={isSubmitting}
            className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 font-bold ${errors.plateNumber ? 'border-error' : 'border-outline-variant'}`}
            onChange={(e) => setValue('plateNumber', e.target.value.toUpperCase())}
          />
          {errors.plateNumber && <span className="text-error text-xs">{errors.plateNumber.message}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Type de véhicule</label>
            <select 
              {...register('type')}
              disabled={isSubmitting}
              className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.type ? 'border-error' : 'border-outline-variant'}`}
            >
              <option value="Classique">Classique</option>
              <option value="VIP">VIP</option>
              <option value="Camion">Camion Logistique</option>
              <option value="Minibus">Minibus</option>
            </select>
            {errors.type && <span className="text-error text-xs">{errors.type.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Capacité (Places)</label>
            <input 
              {...register('capacity', { valueAsNumber: true })}
              type="number" 
              min="1"
              disabled={isSubmitting}
              className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.capacity ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.capacity && <span className="text-error text-xs">{errors.capacity.message}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Statut initial</label>
          <select 
            {...register('status')}
            disabled={isSubmitting}
            className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.status ? 'border-error' : 'border-outline-variant'}`}
          >
            <option value="disponible">Disponible / Prêt</option>
            <option value="en_maintenance">En maintenance</option>
            <option value="hors_service">Hors service</option>
          </select>
          {errors.status && <span className="text-error text-xs">{errors.status.message}</span>}
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          {isSubmitting ? (
            <span className="animate-spin material-symbols-outlined">sync</span>
          ) : (
            <span className="material-symbols-outlined">save</span>
          )}
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer le véhicule'}
        </button>
      </form>
    </div>
  )
}
