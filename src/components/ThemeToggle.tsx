'use client'

import React from 'react'
import { useTheme } from '@/lib/theme/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      style={{
        backgroundColor: colors.surfaceContainer,
        border: `1px solid ${colors.outlineVariant}`,
        color: colors.onSurface
      }}>
      <span className="text-2xl">{theme === 'light' ? '🌙' : '☀️'}</span>
    </button>
  )
}
