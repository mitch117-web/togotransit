'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkParcelPaidButton({ parcelId }: { parcelId: string | number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!confirm('Confirmer que ce colis a bien été payé ?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/parcels/${parcelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Échec de la mise à jour')
      }
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erreur lors de l'enregistrement du paiement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-primary text-on-primary font-bold py-2 rounded-lg mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        <span className="animate-spin material-symbols-outlined text-[1.125rem]">sync</span>
      ) : null}
      {loading ? 'Enregistrement...' : 'Enregistrer Paiement'}
    </button>
  )
}
