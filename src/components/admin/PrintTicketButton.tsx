'use client'

import React, { useState } from 'react'
import { imprimable, imprimerBillets, type BookingImprimable } from '@/lib/ticket-print'

interface PrintTicketButtonProps {
  booking: BookingImprimable
}

export default function PrintTicketButton({ booking }: PrintTicketButtonProps) {
  const [enCours, setEnCours] = useState(false)
  const possible = imprimable(booking)

  const imprimer = async () => {
    if (enCours || !possible) return
    setEnCours(true)
    try {
      await imprimerBillets(booking)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <button
      onClick={imprimer}
      disabled={!possible || enCours}
      className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      title={possible ? 'Imprimer le billet' : 'Aucun billet à imprimer (réservation non confirmée ou annulée)'}
    >
      <span className="material-symbols-outlined text-[1.125rem]">{enCours ? 'hourglass_top' : 'print'}</span>
      <span className="text-[0.625rem] font-bold uppercase hidden group-hover:inline">Billet</span>
    </button>
  )
}
