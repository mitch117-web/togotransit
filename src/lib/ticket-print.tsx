import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { billetUrl } from './billet-url'
import { buildTicketPdf, type TicketPdfData } from './ticket-pdf'

/**
 * Impression du billet depuis le navigateur de l'agent (portail) : liste des réservations, historique et
 * confirmation d'une vente au guichet passent toutes par ici, donc par le même PDF.
 *
 * `booking` est la réservation telle que les pages du portail la préparent (voir `ticketFields`) :
 * { id, status, price, company, departureAt, trip: { origin, destination }, user: { name, phone },
 *   passengers: [{ name, seat, phone }], tickets: [{ numero, statut }], paymentLabel }.
 */

export interface BookingImprimable {
  id?: number
  status: string
  price: number
  company: string
  departureAt?: string | null
  trip?: { origin: string; destination: string } | null
  user?: { name?: string | null; phone?: string | null } | null
  passengers?: { name: string; seat: string | null; phone?: string | null }[]
  tickets?: { numero: string; statut: string }[]
  paymentLabel?: string | null
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

/** Les billets annulés ne s'impriment pas. */
function billetsAImprimer(booking: BookingImprimable): { numero: string; statut: string }[] {
  return (booking.tickets ?? []).filter((t) => t.statut !== 'annule')
}

export function imprimable(booking: BookingImprimable): boolean {
  return booking.status === 'CONFIRMED' && billetsAImprimer(booking).length > 0 && !!booking.departureAt
}

/** Construit et télécharge le PDF des billets d'une réservation : un billet par page, un QR code par billet. */
export async function imprimerBillets(booking: BookingImprimable): Promise<void> {
  const billets = billetsAImprimer(booking)
  const depart = booking.departureAt
  if (!billets.length || !depart) return

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
      departAt: depart,
      passagers: liste.map((p) => ({ nom: p.name, siege: p.seat })),
      telephone: liste[0]?.phone || booking.user?.phone,
      prix: booking.price / billets.length,
      paiement: booking.paymentLabel,
      qrDataUrl: await qrEnPng(url),
    })
  }
  buildTicketPdf(pages).save(`Billet_${billets[0].numero}${billets.length > 1 ? `_x${billets.length}` : ''}.pdf`)
}
