/**
 * Projection publique d'un colis, renvoyée à quiconque connaît le numéro de suivi (sans compte).
 * Les numéros étant séquentiels (TRK-1000, TRK-1001…), elle ne contient aucune donnée personnelle :
 * ni noms ni téléphones, ni prix, ni positions GPS, ni signature ou photo de remise.
 *
 * Toute réponse de l'API donnée sans connexion sur un colis passe par cette fonction.
 */

/** Ce que la projection lit dans un colis : rien d'autre n'a besoin d'être chargé depuis la base. */
export type ColisPourSuiviPublic = {
  trackingId: string
  status: string
  origin: string
  destination: string
  weight: number
  deliveryType: string
  paymentStatus: string
  createdAt: Date
  updatedAt: Date
  statusHistory: string | null
  pod?: { deliveredAt: Date } | null
}

/** Colonnes à demander à Prisma pour un suivi public (les autres ne quittent pas la base). */
export const SELECTION_SUIVI_PUBLIC = {
  trackingId: true,
  status: true,
  origin: true,
  destination: true,
  weight: true,
  deliveryType: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
  statusHistory: true,
  pod: { select: { deliveredAt: true } },
} as const

type Etape = { status?: unknown; timestamp?: unknown; location?: unknown; metadata?: unknown }

export function toPublicParcel(parcel: ColisPourSuiviPublic) {
  let etapes: Etape[] = []
  try {
    const lu: unknown = JSON.parse(parcel.statusHistory || '[]')
    if (Array.isArray(lu)) etapes = lu
  } catch {}
  return {
    trackingId: parcel.trackingId,
    status: parcel.status,
    origin: parcel.origin,
    destination: parcel.destination,
    weight: parcel.weight,
    deliveryType: parcel.deliveryType,
    paymentStatus: parcel.paymentStatus,
    createdAt: parcel.createdAt,
    updatedAt: parcel.updatedAt,
    // seules les étapes de statut (sans lieu ni coordonnées) ; les relevés GPS sont écartés
    statusHistory: JSON.stringify(
      etapes
        .filter((e) => !!e && !e.metadata && !String(e.location ?? '').startsWith('GPS Update'))
        .map((e) => ({ status: e.status, timestamp: e.timestamp }))
    ),
    pod: parcel.pod ? { deliveredAt: parcel.pod.deliveredAt } : null,
  }
}
