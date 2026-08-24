import React from 'react'

export default function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <div className="flex flex-col items-center gap-1">
        <h3 className="font-headline-sm text-headline-sm text-primary animate-pulse">Chargement...</h3>
        <p className="text-on-surface-variant text-sm font-medium">TogoTransit prépare vos données</p>
      </div>
    </div>
  )
}
