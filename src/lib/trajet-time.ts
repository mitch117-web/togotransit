/**
 * Instant de départ d'un trajet.
 *
 * `date_depart` porte le jour et `heure_depart` l'heure : selon l'origine du trajet, `heure_depart` est soit
 * une date complète (formulaire d'administration, jeu de démonstration), soit une heure rattachée à 1970
 * (ancienne route `/api/trajets`). On recompose donc le jour de `date_depart` et l'heure de `heure_depart`.
 * Le Togo est à UTC+0 toute l'année : la lecture se fait en UTC.
 */
export function departureInstant(t: { date_depart: Date | string; heure_depart?: Date | string | null }): Date {
  const jour = new Date(t.date_depart)
  const heure = t.heure_depart ? new Date(t.heure_depart) : jour
  return new Date(
    Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth(), jour.getUTCDate(), heure.getUTCHours(), heure.getUTCMinutes())
  )
}

const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const heureCourte = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })

/** Départ en toutes lettres pour un message : « mercredi 4 novembre à 07h30 ». */
export function formatDepartLong(t: { date_depart: Date | string; heure_depart?: Date | string | null }): string {
  const d = departureInstant(t)
  return `${jourLong.format(d)} à ${heureCourte.format(d).replace(':', 'h')}`
}

/** Vrai si l'heure de départ du trajet est déjà passée. */
export function hasDeparted(
  t: { date_depart: Date | string; heure_depart?: Date | string | null },
  now: Date = new Date()
): boolean {
  return departureInstant(t).getTime() < now.getTime()
}
