import { NextResponse } from 'next/server'
import prisma from './prisma'

/**
 * Mode maintenance, activé par le super-administrateur dans les Paramètres du portail.
 *
 * Quand il est actif, les actions des voyageurs sont suspendues : inscription, nouvelle réservation,
 * paiement et envoi de colis depuis l'application. Le portail des compagnies reste ouvert (ventes au
 * guichet, colis déposés en agence, embarquement), ainsi que la consultation (recherche, billets, suivi).
 */
export async function enMaintenance(): Promise<boolean> {
  try {
    const reglages = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
      select: { maintenance: true },
    })
    return !!reglages?.maintenance
  } catch {
    // Si les réglages sont illisibles, on ne bloque pas les voyageurs.
    return false
  }
}

export function reponseMaintenance() {
  return NextResponse.json(
    {
      error:
        'TogoTransit est en maintenance : les inscriptions, réservations, paiements et envois de colis sont suspendus pour le moment. Réessayez un peu plus tard.',
      code: 'MAINTENANCE',
    },
    { status: 503 }
  )
}
