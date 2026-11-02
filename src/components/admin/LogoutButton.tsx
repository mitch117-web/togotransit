'use client'

import React from 'react'
import Link from 'next/link'

export default function LogoutButton() {
  const handleLogout = () => {
    // Supprimer les cookies de session posés à la connexion (jeton, rôle, compagnie) et le profil local ;
    // sans cela le jeton reste valide et le garde /admin laisse repasser l'utilisateur.
    for (const name of ['auth_token', 'auth_role', 'compagnie_id', 'auth']) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
    }
    try {
      localStorage.removeItem('tgt_token')
      localStorage.removeItem('tgt_user')
    } catch {}
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
