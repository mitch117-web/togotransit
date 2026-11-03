'use client'

import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { billetUrl } from '@/lib/billet-url'
import { buildTicketPdf, type TicketPdfData } from '@/lib/ticket-pdf'

interface PrintTicketButtonProps {
  booking: any
}

/** Dessine le QR code hors de la page et le rend en PNG : rien n'est calculé tant qu'on n'imprime pas. */
async function qrEnPng(valeur: string): Promise<string | null> {
  const hote = document.createElement('div')
  const racine = createRoot(hote)
  flushSync(() => racine.render(<QRCodeCanvas value={valeur} size={512} level="M" marginSize={2} />))
  await new Promise((resolve) => setTimeout(resolve, 0)) // laisse l'effet qui dessine le canvas s'exécuter
  const png = hote.querySelector('canvas')?.toDataURL('image/png') ?? null
  racine.unmount()
  return png
}

export default function PrintTicketButton({ booking }: PrintTicketButtonProps) {
  const [enCours, setEnCours] = useState(false)

  // Un billet par passager quand la réservation en compte plusieurs ; les billets annulés ne s'impriment pas.
  const billets: { numero: string; statut: string }[] = (booking.tickets ?? []).filter(
    (t: { statut: string }) => t.statut !== 'annule'
  )
  const imprimable = booking.status === 'CONFIRMED' && billets.length > 0 && !!booking.departureAt

  const imprimer = async () => {
    if (enCours || !imprimable) return
    setEnCours(true)
    try {
      const passagers: { name: string; seat: string | null; phone?: string | null }[] = booking.passengers?.length
        ? booking.passengers
        : [{ name: booking.user?.name || 'Passager', seat: null, phone: booking.user?.phone }]
      // Avec autant de billets que de passagers, chaque billet porte le nom du passager de même rang.
      const unParBillet = billets.length > 1 && passagers.length === billets.length

      // Le QR code encode l'adresse du site telle que l'agent la voit : la page de vérification du billet.
      const origine = window.location.origin
      const pages: TicketPdfData[] = []
      for (const [i, b] of billets.entries()) {
        const url = billetUrl(b.numero, origine)
        const liste = unParBillet ? [passagers[i]] : passagers
        pages.push({
          numero: b.numero,
          url,
          compagnie: booking.company,
          depart: booking.trip?.origin ?? '',
          arrivee: booking.trip?.destination ?? '',
          departAt: booking.departureAt,
          passagers: liste.map((p) => ({ nom: p.name, siege: p.seat })),
          telephone: liste[0]?.phone || booking.user?.phone,
          prix: booking.price / billets.length,
          paiement: booking.paymentLabel,
          qrDataUrl: await qrEnPng(url),
        })
      }
      buildTicketPdf(pages).save(`Billet_${billets[0].numero}${billets.length > 1 ? `_x${billets.length}` : ''}.pdf`)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <button
      onClick={imprimer}
      disabled={!imprimable || enCours}
      className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      title={imprimable ? 'Imprimer le billet' : 'Aucun billet à imprimer (réservation non confirmée ou annulée)'}
    >
      <span className="material-symbols-outlined text-[1.125rem]">{enCours ? 'hourglass_top' : 'print'}</span>
      <span className="text-[0.625rem] font-bold uppercase hidden group-hover:inline">Billet</span>
    </button>
  )
}
