'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Fare {
  id: number
  compagnie_id: number | null
  origin: string
  destination: string
  pricePerKg: number
  baseFare: number
  category: string
  zone: string
}

export default function FaresManagement({ initialFares }: { initialFares: Fare[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingFare, setEditingFare] = useState<Fare | null>(null)
  
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    baseFare: 0,
    pricePerKg: 0,
    category: 'STANDARD',
    zone: 'ZONE_A'
  })

  const openAddModal = () => {
    setError(null)
    setEditingFare(null)
    setFormData({
      origin: '',
      destination: '',
      baseFare: 0,
      pricePerKg: 0,
      category: 'STANDARD',
      zone: 'ZONE_A'
    })
    setShowModal(true)
  }

  const openEditModal = (fare: Fare) => {
    setError(null)
    setEditingFare(fare)
    setFormData({
      origin: fare.origin,
      destination: fare.destination,
      baseFare: fare.baseFare,
      pricePerKg: fare.pricePerKg,
      category: fare.category,
      zone: fare.zone
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const url = editingFare ? `/api/fares/${editingFare.id}` : '/api/fares'
      const method = editingFare ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowModal(false)
        router.refresh()
      } else {
        const err = await response.json()
        setError(err.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (error: any) {
      console.error(error)
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number | string) => {
    if (!confirm('Supprimer ce tarif ?')) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/fares/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const err = await response.json()
        setError(err.error || 'Erreur lors de la suppression')
      }
    } catch (error: any) {
      console.error(error)
      setError("Erreur de connexion lors de la suppression")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm relative">
      {loading && (
        <div className="absolute inset-0 bg-background/70 z-10 flex items-center justify-center">
          <span className="animate-spin material-symbols-outlined text-primary text-3xl">sync</span>
        </div>
      )}
      
      <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
        <h3 className="font-headline-md text-headline-md text-primary">Grille Tarifaire (Colis)</h3>
        <div className="flex items-center gap-4">
          {error && <span className="text-[0.625rem] font-bold text-error uppercase">{error}</span>}
          <button 
            onClick={openAddModal}
            className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[1.125rem]">add</span>
            Ajouter un tarif
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Trajet</th>
              <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Base (F)</th>
              <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Prix / kg (F)</th>
              <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Zone</th>
              <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {initialFares.map((fare) => (
              <tr key={fare.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-1 font-body-sm text-body-sm font-medium">
                    <span>{fare.origin}</span>
                    <span className="material-symbols-outlined text-[0.875rem] text-outline">arrow_forward</span>
                    <span>{fare.destination}</span>
                  </div>
                </td>
                <td className="p-4 font-body-sm text-body-sm">{fare.baseFare.toLocaleString('fr-FR')} F</td>
                <td className="p-4 font-body-sm text-body-sm font-bold text-primary">{fare.pricePerKg.toLocaleString('fr-FR')} F</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-surface-container-highest text-on-surface border border-outline-variant">
                    {fare.zone}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => openEditModal(fare)}
                      className="text-on-surface-variant hover:text-primary p-1"
                    >
                      <span className="material-symbols-outlined text-[1.25rem]">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(fare.id)}
                      className="text-on-surface-variant hover:text-error p-1"
                    >
                      <span className="material-symbols-outlined text-[1.25rem]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-headline-sm text-headline-sm text-primary">
                {editingFare ? 'Modifier le tarif' : 'Ajouter un tarif'}
              </h4>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Origine</label>
                  <input 
                    type="text" 
                    required 
                    className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                    value={formData.origin}
                    onChange={(e) => setFormData({...formData, origin: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Destination</label>
                  <input 
                    type="text" 
                    required 
                    className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                    value={formData.destination}
                    onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Frais de base (F)</label>
                  <input 
                    type="number" 
                    required 
                    className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                    value={formData.baseFare}
                    onChange={(e) => setFormData({...formData, baseFare: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Prix par kg (F)</label>
                  <input 
                    type="number" 
                    required 
                    className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({...formData, pricePerKg: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Zone</label>
                  <select 
                    className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                    value={formData.zone}
                    onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  >
                    <option value="ZONE_A">Zone A (Maritime)</option>
                    <option value="ZONE_B">Zone B (Plateaux)</option>
                    <option value="ZONE_C">Zone C (Centrale)</option>
                    <option value="ZONE_D">Zone D (Kara)</option>
                    <option value="ZONE_E">Zone E (Savanes)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Catégorie</label>
                  <select 
                    className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="FRAGILE">Fragile</option>
                    <option value="DOCUMENTS">Documents</option>
                    <option value="PERISHABLE">Périssable</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl mt-4 hover:brightness-110 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Traitement...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
