'use client'

import React from 'react'
import { ThemeProvider } from '@/lib/theme/ThemeContext'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
