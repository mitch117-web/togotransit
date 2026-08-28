'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/fleet/${vehicleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete vehicle')
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Erreur lors de la suppression du véhicule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="px-3 bg-surface-container-highest hover:bg-error/20 hover:text-error text-on-surface-variant border border-outline-variant rounded-xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
    >
      {loading ? (
        <span className="animate-spin material-symbols-outlined">sync</span>
      ) : (
        <span className="material-symbols-outlined">delete</span>
      )}
    </button>
  )
}
