'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteUserButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete user')
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Erreur lors de la suppression de l'utilisateur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="text-on-surface-variant hover:text-error p-1 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
      ) : (
        <span className="material-symbols-outlined text-[20px]">delete</span>
      )}
    </button>
  )
}
