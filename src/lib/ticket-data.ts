import { departureInstant } from './trajet-time'

/** Libellé du mode de paiement tel qu'il apparaît sur le billet imprimé. */
export function libelleMethode(methode?: string | null, reference?: string | null): string | null {
  if (reference?.startsWith('GUICHET')) return 'Payé au guichet'
  switch (methode) {
    case 'flooz': return 'Payé par Flooz'
    case 'tmoney': return 'Payé par T-Money'
    case 'carte': return 'Payé par carte'
    default: return methode ? 'Paiement enregistré' : null
  }
}

/** Ce que l'impression du billet lit dans une réservation chargée avec ses passagers, billets, paiements et son trajet. */
interface ReservationPourBillet {
  trajet?: {
    date_depart: Date | string
    heure_depart?: Date | string | null
    compagnie?: { nom: string } | null
  } | null
  passagers?: { nom_complet: string; numero_siege?: string | null; telephone?: string | null }[]
  billets?: { numero_billet: string; statut: string }[]
  paiements?: { statut: string; methode: string; reference_transaction?: string | null }[]
}

export function ticketFields(r: ReservationPourBillet) {
  const paiement = (r.paiements ?? []).find((p) => p.statut === 'reussi') ?? null
  return {
    company: r.trajet?.compagnie?.nom ?? 'TogoTransit',
    departureAt: r.trajet ? departureInstant(r.trajet).toISOString() : null,
    passengers: (r.passagers ?? []).map((p) => ({ name: p.nom_complet, seat: p.numero_siege ?? null, phone: p.telephone ?? null })),
    tickets: (r.billets ?? []).map((b) => ({ numero: b.numero_billet, statut: b.statut })),
    paymentLabel: paiement ? libelleMethode(paiement.methode, paiement.reference_transaction) : null,
  }
}
