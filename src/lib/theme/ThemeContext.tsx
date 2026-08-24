'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  colors: typeof lightColors
}

const lightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceContainer: '#f1f5f9',
  surfaceContainerLow: '#f8fafc',
  surfaceContainerHigh: '#e2e8f0',
  primary: '#3b82f6',
  primaryContainer: '#dbeafe',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#1e40af',
  secondary: '#8b5cf6',
  secondaryContainer: '#ede9fe',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#5b21b6',
  error: '#ef4444',
  errorContainer: '#fee2e2',
  onError: '#ffffff',
  onErrorContainer: '#7f1d1d',
  onSurface: '#0f172a',
  onSurfaceVariant: '#64748b',
  outline: '#94a3b8',
  outlineVariant: '#cbd5e1'
}

const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceContainer: '#334155',
  surfaceContainerLow: '#1e293b',
  surfaceContainerHigh: '#475569',
  primary: '#60a5fa',
  primaryContainer: '#1e3a5f',
  onPrimary: '#0f172a',
  onPrimaryContainer: '#dbeafe',
  secondary: '#a78bfa',
  secondaryContainer: '#3b2c5a',
  onSecondary: '#0f172a',
  onSecondaryContainer: '#ede9fe',
  error: '#f87171',
  errorContainer: '#450a0a',
  onError: '#450a0a',
  onErrorContainer: '#fee2e2',
  onSurface: '#f1f5f9',
  onSurfaceVariant: '#94a3b8',
  outline: '#475569',
  outlineVariant: '#334155'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = localStorage.getItem('togotransit-theme') as Theme
    if (saved) {
      setTheme(saved)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('togotransit-theme', newTheme)
  }

  const toggleTheme = () => {
    handleSetTheme(theme === 'light' ? 'dark' : 'light')
  }

  const colors = theme === 'light' ? lightColors : darkColors

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme, colors }}>
      <div style={{ 
        backgroundColor: colors.background, 
        color: colors.onSurface, 
        minHeight: '100vh',
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
