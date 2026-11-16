'use client'

import React from 'react'
import Link from 'next/link'

export default function LogoutButton() {
  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault()
    // Le cookie de session est HttpOnly : la page ne peut pas l'effacer, c'est le serveur qui le fait.
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    try {
      localStorage.removeItem('tgt_token')
      localStorage.removeItem('tgt_user')
    } catch {}
    // Chargement complet de la page de connexion : les pages du portail gardées en mémoire par le
    // navigateur sont ainsi abandonnées.
    window.location.assign('/login')
  }

  return (
    <Link
      href="/login"
      onClick={handleLogout}
      className="w-10 h-10 rounded-full hover:bg-error/10 flex items-center justify-center text-error transition-colors"
      title="Déconnexion"
    >
      <span className="material-symbols-outlined">logout</span>
    </Link>
  )
}
