'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dictionaries, Locale } from './dictionaries'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof typeof dictionaries['fr']) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('fr')

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('togotransit-locale') as Locale
    if (saved && (saved === 'fr' || saved === 'ee' || saved === 'kbp')) {
      setLocale(saved)
    }
  }, [])

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem('togotransit-locale', newLocale)
  }

  const t = (key: keyof typeof dictionaries['fr']) => {
    return dictionaries[locale][key] || dictionaries['fr'][key] || key
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
