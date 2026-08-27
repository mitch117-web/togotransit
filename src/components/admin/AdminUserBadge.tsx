'use client'

import React, { useEffect, useState } from 'react'

export default function AdminUserBadge() {
  const [user, setUser] = useState<{ nom: string; prenom: string; role: string; compagnie?: { nom: string } } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tgt_user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {}
  }, [])

  const initials = user
    ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'TG'
    : 'TG'

  const displayName = user
    ? `${user.prenom} ${user.nom}`
    : 'Komi (Super Admin)'

  const displayRole = user
    ? user.role === 'super_admin'
      ? '👑 Super-Admin Plateforme'
      : user.compagnie?.nom
        ? `🏢 ${user.compagnie.nom}`
        : 'Gestionnaire Compagnie'
    : 'Super-Admin Plateforme'

  return (
    <div className="flex items-center gap-3 px-2">
      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-black text-xs border border-outline-variant shadow-sm shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p title={displayName} className="font-bold text-xs text-primary leading-snug line-clamp-2 break-words">{displayName}</p>
        <p title={displayRole} className="text-[0.625rem] text-on-surface-variant font-bold truncate opacity-80">{displayRole}</p>
      </div>
    </div>
  )
}
