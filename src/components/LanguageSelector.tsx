'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { Locale } from '@/lib/i18n/dictionaries'

export default function LanguageSelector() {
  const { locale, setLocale } = useTranslation()

  const languages = [
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'ee', label: 'EE', name: 'Ewe' },
    { code: 'kbp', label: 'KB', name: 'Kabyè' },
  ]

  return (
    <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-full border border-outline-variant shadow-sm">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code as Locale)}
          className={`px-3 py-1 rounded-full text-[0.625rem] font-black transition-all ${
            locale === lang.code 
              ? 'bg-primary text-on-primary shadow-sm scale-105' 
              : 'text-on-surface-variant hover:bg-surface-container-highest'
          }`}
          title={lang.name}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
