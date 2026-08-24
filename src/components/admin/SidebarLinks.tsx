'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { dictionaries } from '@/lib/i18n/dictionaries'

type TranslationKey = keyof typeof dictionaries['fr']

interface NavLink {
  href: string
  labelKey: TranslationKey
  icon: string
  superAdminOnly?: boolean
}

const allLinks: NavLink[] = [
  { href: '/admin/dashboard', labelKey: 'dashboard', icon: 'dashboard' },
  { href: '/admin/companies', labelKey: 'companies', icon: 'domain', superAdminOnly: true },
  { href: '/admin/parcels', labelKey: 'parcels', icon: 'local_shipping' },
  { href: '/admin/bookings', labelKey: 'bookings', icon: 'confirmation_number' },
  { href: '/admin/fleet', labelKey: 'fleet', icon: 'directions_bus' },
  { href: '/admin/users', labelKey: 'users', icon: 'group' },
  { href: '/admin/settings', labelKey: 'settings', icon: 'settings' },
]

export default function SidebarLinks() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tgt_user')
      if (stored) {
        const u = JSON.parse(stored)
        setRole(u.role)
      }
    } catch {}
  }, [])

  const visibleLinks = allLinks.filter(l => !l.superAdminOnly || role === 'super_admin' || !role)

  return (
    <div className="flex flex-col gap-1 flex-grow">
      {visibleLinks.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/admin/dashboard' && pathname.startsWith(link.href))
        
        return (
          <Link 
            key={link.href}
            href={link.href} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-label-md transition-all ${
              isActive 
                ? 'bg-secondary-container text-on-secondary-container font-bold shadow-sm' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {link.icon}
            </span>
            {t(link.labelKey)}
          </Link>
        )
      })}
    </div>
  )
}
