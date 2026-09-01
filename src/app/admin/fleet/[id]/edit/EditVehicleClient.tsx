'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Vehicle {
  id: string
  plateNumber: string
  type: string
  capacity: number
  status: string
}

export default function EditVehicleClient({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    plateNumber: vehicle.plateNumber,
    type: vehicle.type,
    capacity: vehicle.capacity,
    status: vehicle.status
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch(`/api/fleet/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('Véhicule mis à jour avec succès !')
        router.push('/admin/fleet')
        router.refresh()
      } else {
        throw new Error('Failed to update vehicle')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la mise à jour du véhicule")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/fleet/${vehicle.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Véhicule supprimé avec succès !')
        router.push('/admin/fleet')
        router.refresh()
      } else {
        throw new Error('Failed to delete vehicle')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la suppression du véhicule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-lg text-headline-lg text-primary">Modifier le Véhicule</h2>
        </div>
        <button 
          onClick={handleDelete}
          disabled={loading}
          className="text-error hover:bg-error/10 p-2 rounded-lg flex items-center gap-2 transition-colors font-label-md text-label-md"
        >
          <span className="material-symbols-outlined">delete</span>
          Supprimer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-lg flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Immatriculation</label>
          <input 
            type="text" 
            required
            placeholder="Ex: TG-1234-A"
            disabled={loading}
            className="px-4 py-3 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50 font-bold"
            value={formData.plateNumber}
            onChange={(e) => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Type de véhicule</label>
            <select 
              disabled={loading}
              className="px-4 py-3 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="Classique">Classique</option>
              <option value="VIP">VIP</option>
              <option value="Camion">Camion Logistique</option>
              <option value="Minibus">Minibus</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Capacité (Places)</label>
            <input 
              type="number" 
              required
              min="1"
              disabled={loading}
              className="px-4 py-3 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Statut</label>
          <select 
            disabled={loading}
            className="px-4 py-3 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
          >
            <option value="AVAILABLE">Disponible / Prêt</option>
            <option value="MAINTENANCE">En maintenance</option>
            <option value="OUT_OF_SERVICE">Hors service</option>
          </select>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          {loading ? (
            <span className="animate-spin material-symbols-outlined">sync</span>
          ) : (
            <span className="material-symbols-outlined">save</span>
          )}
          {loading ? 'Mise à jour...' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
