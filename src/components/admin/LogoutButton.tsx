'use client'

import React from 'react'
import Link from 'next/link'

export default function LogoutButton() {
  const handleLogout = () => {
    // Supprimer le cookie d'authentification
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
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
