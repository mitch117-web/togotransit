import prisma from './prisma'
import { formatDepartLong } from './trajet-time'

/** Délai laissé pour payer une réservation : au-delà, elle est annulée et ses places sont rendues. */
export const DELAI_PAIEMENT_MS = 30 * 60 * 1000

/** Nombre maximal de places qu'un compte peut tenir sans les avoir payées (par réservation, et au total). */
export const PLACES_MAX_EN_ATTENTE = 10

/** Heure limite de paiement d'une réservation. */
export function echeancePaiement(dateReservation: Date | string): Date {
  return new Date(new Date(dateReservation).getTime() + DELAI_PAIEMENT_MS)
}

/**
 * Annule les réservations restées « en attente » plus de 30 minutes et rend leurs places au trajet.
 *
 * Il n'y a pas de tâche planifiée : la fonction est appelée partout où l'on lit ou prend des places (recherche,
 * détail d'un trajet, réservation, vente au guichet, paiement, plan de sièges). Sans elle, une réservation
 * jamais payée gardait ses places indéfiniment.
 *
 * Chaque annulation est une instruction conditionnelle dans une transaction : si plusieurs requêtes passent en
 * même temps, ou si le paiement arrive au même instant, une seule gagne et les places ne sont rendues qu'une
 * fois. Le travail est borné (25 réservations par appel) pour ne jamais ralentir la requête qui le déclenche.
 */
export async function libererReservationsExpirees(): Promise<number> {
  let liberees = 0
  try {
    const limite = new Date(Date.now() - DELAI_PAIEMENT_MS)
    const perimees = await prisma.reservation.findMany({
      where: { statut: 'en_attente', date_reservation: { lt: limite } },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 25,
    })

    for (const { id } of perimees) {
      const fait = await prisma.$transaction(async (tx) => {
        const prise = await tx.reservation.updateMany({
          where: { id, statut: 'en_attente', date_reservation: { lt: limite } },
          data: { statut: 'annulee' },
        })
        if (prise.count === 0) return false // payée ou annulée entre-temps

        const r = await tx.reservation.findUnique({
          where: { id },
          select: {
            trajet_id: true,
            nombre_places: true,
            utilisateur_id: true,
            trajet: {
              select: {
                date_depart: true,
                heure_depart: true,
                ville_depart: { select: { nom: true } },
                ville_arrivee: { select: { nom: true } },
              },
            },
          },
        })
        if (!r) return false

        await tx.trajet.update({
          where: { id: r.trajet_id },
          data: { places_disponibles: { increment: r.nombre_places } },
        })
        // Un paiement resté en attente ne doit plus pouvoir confirmer cette réservation.
        await tx.paiement.updateMany({ where: { reservation_id: id, statut: 'en_attente' }, data: { statut: 'echoue' } })
        await tx.billet.updateMany({ where: { reservation_id: id }, data: { statut: 'annule' } })

        const trajetTexte = r.trajet
          ? ` (${r.trajet.ville_depart?.nom} → ${r.trajet.ville_arrivee?.nom}, ${formatDepartLong(r.trajet)})`
          : ''
        await tx.notification.create({
          data: {
            userId: r.utilisateur_id,
            tripId: r.trajet_id,
            title: 'Réservation expirée',
            message: `Votre réservation #${id}${trajetTexte} n'a pas été payée dans les 30 minutes : elle est annulée et ses places sont libérées.`,
            type: 'RESERVATION',
            isRead: false,
          },
        })
        return true
      })
      if (fait) liberees++
    }
  } catch (error) {
    // Le ménage ne doit jamais faire échouer la requête qui le déclenche : au pire, des places restent
    // bloquées jusqu'au prochain passage, ce qui ne peut pas provoquer de survente.
    console.error('Libération des réservations expirées impossible :', error)
  }
  return liberees
}
