import type { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { LogoMark } from '@/components/Logo'
import { extractNumeroBillet } from '@/lib/billet-url'
import { departureInstant } from '@/lib/trajet-time'

// Page ouverte quand on scanne le QR code d'un billet avec un appareil photo : elle dit si le billet est valable,
// sans jamais le valider (la validation de l'embarquement se fait avec l'application, par le chauffeur ou l'agent).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vérification de billet · TogoTransit',
  robots: { index: false, follow: false },
}

type Etat = 'valide' | 'utilise' | 'annule' | 'termine' | 'inconnu'

const ETATS: Record<Etat, { titre: string; detail: string; icone: string; bande: string }> = {
  valide: {
    titre: 'Billet valide',
    detail: "Ce billet est authentique et n'a pas encore servi.",
    icone: 'check_circle',
    bande: 'bg-secondary text-on-secondary',
  },
  utilise: {
    titre: 'Billet déjà utilisé',
    detail: "Ce billet a déjà servi à l'embarquement.",
    icone: 'event_available',
    bande: 'bg-tertiary text-on-tertiary',
  },
  annule: {
    titre: 'Billet annulé',
    detail: "Ce billet a été annulé : il n'est plus valable.",
    icone: 'cancel',
    bande: 'bg-error text-on-error',
  },
  termine: {
    titre: 'Trajet terminé',
    detail: 'Le départ de ce billet est passé depuis plus de 24 heures.',
    icone: 'history',
    bande: 'bg-surface-variant text-on-surface-variant',
  },
  inconnu: {
    titre: 'Billet introuvable',
    detail: 'Ce numéro ne correspond à aucun billet TogoTransit. Vérifiez le code, ou renseignez-vous auprès de la compagnie.',
    icone: 'help',
    bande: 'bg-error text-on-error',
  },
}

const formatJour = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC', // le Togo est à UTC+0 toute l'année
})
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })
const heureCourte = (d: Date) => formatHeure.format(d).replace(':', 'h')
// « mercredi 4 novembre 2026 » → « Mercredi 4 novembre 2026 » (majuscule au seul premier mot)
const jourComplet = (d: Date) => {
  const s = formatJour.format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** « Michel ANAKPA » → « Michel A. » : la page est publique, on n'y affiche pas les noms en entier. */
function nomAbrege(nomComplet: string): string {
  const mots = nomComplet.trim().split(/\s+/).filter(Boolean)
  if (mots.length < 2) return mots[0] ?? ''
  return `${mots[0]} ${mots[mots.length - 1][0].toUpperCase()}.`
}

async function chargerBillet(brut: string) {
  const numero = extractNumeroBillet(brut)

  // Page publique : on ne charge que ce qu'elle affiche (jamais téléphone, e-mail, prix ni compte du client).
  const billet = numero
    ? await prisma.billet.findUnique({
        where: { numero_billet: numero },
        select: {
          numero_billet: true,
          statut: true,
          reservation: {
            select: {
              statut: true,
              nombre_places: true,
              passagers: { select: { nom_complet: true, numero_siege: true }, orderBy: { id: 'asc' } },
              trajet: {
                select: {
                  date_depart: true,
                  heure_depart: true,
                  compagnie: { select: { nom: true } },
                  vehicule: { select: { type: true, immatriculation: true } },
                  ville_depart: { select: { nom: true } },
                  ville_arrivee: { select: { nom: true } },
                },
              },
            },
          },
        },
      })
    : null

  const reservation = billet?.reservation
  const trajet = reservation?.trajet
  const depart = trajet ? departureInstant(trajet) : null

  const maintenant = new Date()
  let etat: Etat = 'inconnu'
  if (billet) {
    if (billet.statut === 'annule' || reservation?.statut === 'annulee') etat = 'annule'
    else if (billet.statut === 'utilise') etat = 'utilise'
    else if (depart && depart.getTime() + 24 * 3600 * 1000 < maintenant.getTime()) etat = 'termine'
    else etat = 'valide'
  }
  return { numero, billet, reservation, trajet, depart, etat, maintenant }
}

export default async function BilletPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero: brut } = await params
  const { numero, billet, reservation, trajet, depart, etat, maintenant } = await chargerBillet(brut)
  const cfg = ETATS[etat]

  const passagers = reservation?.passagers ?? []
  const sieges = passagers.map((p) => p.numero_siege).filter((s): s is string => !!s)

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-md flex items-center gap-3 mb-6">
        <LogoMark size={40} />
        <div>
          <p className="text-xl font-black tracking-tight text-primary leading-none">TogoTransit</p>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mt-1">
            Vérification de billet
          </p>
        </div>
      </header>

      <main className="w-full max-w-md flex flex-col gap-4">
        <section role="status" className={`rounded-3xl p-6 flex flex-col items-center text-center gap-2 ${cfg.bande}`}>
          <span className="material-symbols-outlined !text-[3.5rem] leading-none" aria-hidden="true">
            {cfg.icone}
          </span>
          <h1 className="text-2xl font-black tracking-tight">{cfg.titre}</h1>
          <p className="text-sm font-medium opacity-90">{cfg.detail}</p>
        </section>

        {billet && trajet && depart && (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-dashed border-outline-variant">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant">Compagnie</p>
              <p className="text-base font-black text-on-surface">{trajet.compagnie?.nom ?? 'TogoTransit'}</p>
            </div>

            <div className="px-6 py-5 flex gap-4 border-b border-dashed border-outline-variant">
              <div className="flex flex-col items-center pt-1.5" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="flex-1 w-px border-l-2 border-dotted border-outline my-1" />
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant">Départ</p>
                  <p className="text-2xl font-black leading-tight text-on-surface">{trajet.ville_depart?.nom}</p>
                </div>
                <div>
                  <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant">Arrivée</p>
                  <p className="text-2xl font-black leading-tight text-on-surface">{trajet.ville_arrivee?.nom}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-dashed border-outline-variant">
              <div>
                <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant">Date</p>
                <p className="text-sm font-bold text-on-surface">{jourComplet(depart)}</p>
                <p className="text-2xl font-black text-primary leading-tight mt-1">{heureCourte(depart)}</p>
              </div>
              <div>
                <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant">
                  {sieges.length > 1 ? 'Sièges' : 'Siège'}
                </p>
                {sieges.length ? (
                  <p className="text-2xl font-black text-primary leading-tight">{sieges.map((s) => `#${s}`).join(' ')}</p>
                ) : (
                  <p className="text-sm font-bold text-on-surface">Placement libre</p>
                )}
                <p className="text-xs text-on-surface-variant mt-1">
                  {reservation?.nombre_places ?? 1} place{(reservation?.nombre_places ?? 1) > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-b border-dashed border-outline-variant">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Passager{passagers.length > 1 ? 's' : ''}
              </p>
              <ul className="flex flex-col gap-1">
                {passagers.length ? (
                  passagers.map((p, i) => (
                    <li key={i} className="text-base font-bold text-on-surface">
                      {nomAbrege(p.nom_complet)}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-on-surface-variant">Non renseigné</li>
                )}
              </ul>
              {trajet.vehicule?.immatriculation && (
                <p className="text-xs text-on-surface-variant mt-3">
                  Véhicule : {trajet.vehicule.type ? `${trajet.vehicule.type} · ` : ''}
                  {trajet.vehicule.immatriculation}
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-surface-container-low">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-on-surface-variant">N° de billet</p>
              <p className="font-mono text-sm font-bold tracking-wider text-on-surface break-all">{billet.numero_billet}</p>
            </div>
          </section>
        )}

        {!billet && numero && (
          <p className="text-center text-xs text-on-surface-variant">
            Numéro recherché : <span className="font-mono font-bold break-all">{numero}</span>
          </p>
        )}

        <p className="text-xs text-on-surface-variant text-center leading-relaxed">
          Cette vérification ne valide pas l&apos;embarquement. Chauffeur ou agent de la compagnie : validez le billet
          avec l&apos;application TogoTransit.
        </p>
        <p className="text-[0.6875rem] text-outline text-center">
          Vérifié le {formatJour.format(maintenant)} à {heureCourte(maintenant)} (heure de Lomé)
        </p>
      </main>
    </div>
  )
}
