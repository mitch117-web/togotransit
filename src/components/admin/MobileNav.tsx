'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { dictionaries } from '@/lib/i18n/dictionaries'

type TranslationKey = keyof typeof dictionaries['fr']

const mobileLinks: { href: string, labelKey: TranslationKey, icon: string }[] = [
  { href: '/admin/dashboard', labelKey: 'dashboard', icon: 'dashboard' },
  { href: '/admin/parcels', labelKey: 'parcels', icon: 'local_shipping' },
  { href: '/admin/bookings', labelKey: 'bookings', icon: 'confirmation_number' },
  { href: '/admin/settings', labelKey: 'settings', icon: 'settings' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant px-4 py-2 flex justify-between items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      <MobileNavLink 
        href="/admin/dashboard" 
        label={t('dashboard')} 
        icon="dashboard" 
        isActive={pathname === '/admin/dashboard'} 
      />
      <MobileNavLink 
        href="/admin/parcels" 
        label={t('parcels')} 
        icon="local_shipping" 
        isActive={pathname.startsWith('/admin/parcels')} 
      />
      
      <Link href="/admin/parcels/new" className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center -mt-10 shadow-lg border-4 border-background hover:scale-110 transition-transform">
        <span className="material-symbols-outlined">add</span>
      </Link>

      <MobileNavLink 
        href="/admin/bookings" 
        label={t('bookings')} 
        icon="confirmation_number" 
        isActive={pathname.startsWith('/admin/bookings')} 
      />
      <MobileNavLink 
        href="/admin/settings" 
        label={t('settings')} 
        icon="settings" 
        isActive={pathname.startsWith('/admin/settings')} 
      />
    </nav>
  )
}

function MobileNavLink({ href, label, icon, isActive }: { href: string, label: string, icon: string, isActive: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center gap-1 transition-colors ${
        isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
      }`}
    >
      <span className={`material-symbols-outlined text-[1.5rem] ${isActive ? 'fill-icon' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
        {icon}
      </span>
      <span className={`text-[0.625rem] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </Link>
  )
}
