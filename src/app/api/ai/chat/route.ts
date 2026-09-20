import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import prisma from '@/lib/prisma'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const HEURES_OUVERTURE = 'Nos agences sont ouvertes du lundi au samedi de 6h à 19h (fermé le dimanche, sauf agence de Lomé-Gare ouverte jusqu\'à 13h).'
const CONTACT = 'Vous pouvez nous joindre au +228 22 21 00 00 ou par email à contact@togotransit.tg.'

type ChatContext = {
  parcel: { trackingId: string; status: string; senderName: string; receiverName: string; origin: string; destination: string; weight: number; price: number } | null
  trips: { origin: string; dest: string; departure: string; prix: number; vehicule: string }[]
  fares: { origin: string; destination: string; baseFare: number; pricePerKg: number }[]
}

/** Repère un numéro de suivi (ex: "TRK-1042") écrit directement dans le message,
 * pour ne pas dépendre uniquement du champ `trackingId` — que le client mobile
 * n'envoie jamais — et permettre "suis mon colis TRK-1042" en une seule phrase. */
function extraireTrackingId(message: string): string | null {
  const match = message.toUpperCase().match(/TRK-?\s?(\d{2,})/)
  return match ? `TRK-${match[1]}` : null
}

/** Cherche dans le texte le nom d'une ville togolaise connue (trajets/tarifs). */
function villesMentionnees(message: string, villes: string[]): string[] {
  const m = message.toLowerCase()
  const trouvees = new Set<string>()
  for (const v of villes) {
    if (v && m.includes(v.toLowerCase())) trouvees.add(v)
  }
  return Array.from(trouvees)
}

const STATUT_COLIS_LABEL: Record<string, string> = {
  PENDING: 'en attente de dépôt',
  IN_AGENCY: 'enregistré en agence, en attente de départ',
  IN_TRANSIT: 'en transit',
  OUT_FOR_DELIVERY: 'en cours de livraison',
  DELIVERED: 'livré',
  CANCELLED: 'annulé',
}

/**
 * Assistant de secours basé sur des règles, sans dépendance à une API
 * payante : garantit des réponses utiles et fondées sur les vraies données
 * (trajets, tarifs, colis) même si OPENAI_API_KEY n'est pas configurée, au
 * lieu d'un texte générique tiré au hasard.
 */
function reponseParMotsCles(message: string, ctx: ChatContext): string {
  const m = message.toLowerCase()

  // Suivi de colis — priorité absolue si un colis a été identifié (via
  // trackingId explicite OU numéro détecté dans le texte du message).
  if (ctx.parcel) {
    const label = STATUT_COLIS_LABEL[ctx.parcel.status] || ctx.parcel.status
    return `📦 Votre colis ${ctx.parcel.trackingId} (${ctx.parcel.origin} → ${ctx.parcel.destination}) est actuellement ${label}. Destinataire : ${ctx.parcel.receiverName}.`
  }
  if (/\bTRK-?\s?\d/i.test(message)) {
    return "Je ne trouve aucun colis correspondant à ce numéro de suivi. Vérifiez qu'il est bien orthographié (format TRK-XXXX) ou consultez l'onglet « Colis » de l'application."
  }
  if (/\b(suivre|suivi|tracking|localiser|o[uù].*colis|colis.*o[uù])\b/.test(m)) {
    return "Pour suivre votre colis, indiquez son numéro de suivi (ex : TRK-1000) ou consultez l'onglet « Colis » de l'application, qui affiche l'historique et la position en direct."
  }

  // Envoyer un colis
  if (/envoyer|exp[ée]dier|d[ée]poser/.test(m) && /colis/.test(m)) {
    return "Pour envoyer un colis : ouvrez l'onglet « Colis » → « Nouvel envoi » → renseignez l'expéditeur, le destinataire et une photo du colis → validez. Déposez ensuite le colis à l'agence indiquée, le tarif définitif est confirmé après pesée."
  }

  // Trajets / horaires de bus — vérifié avant les tarifs génériques pour que
  // "combien coûte un trajet Lomé Kara" tombe sur les vrais trajets plutôt
  // que sur les tarifs colis.
  const villesTrajets = villesMentionnees(m, ctx.trips.flatMap((t) => [t.origin, t.dest]))
  const parleDeVoyage = /trajet|horaire|d[ée]part|itin[ée]raire|\bbus\b|voyage|billet|ticket|r[ée]server|r[ée]servation/.test(m)
  if (parleDeVoyage || villesTrajets.length > 0) {
    const correspondants = villesTrajets.length >= 2
      ? ctx.trips.filter((t) => villesTrajets.includes(t.origin) && villesTrajets.includes(t.dest))
      : villesTrajets.length === 1
        ? ctx.trips.filter((t) => villesTrajets.includes(t.origin) || villesTrajets.includes(t.dest))
        : ctx.trips
    if (correspondants.length > 0) {
      const lignes = correspondants
        .slice(0, 5)
        .map((t) => `• ${t.origin} → ${t.dest} — départ ${t.departure} — ${t.prix} F (${t.vehicule})`)
        .join('\n')
      return `Voici ${villesTrajets.length > 0 ? 'les trajets correspondants' : 'des trajets disponibles'} :\n${lignes}\n\nRecherchez et comparez toutes les compagnies depuis l'accueil de l'application.`
    }
    if (/r[ée]server|r[ée]servation/.test(m)) {
      return "Pour réserver : recherchez votre trajet depuis l'accueil → choisissez une compagnie → « Réserver » → renseignez les passagers → payez par Flooz ou T-Money. Votre billet avec QR code apparaît ensuite dans l'onglet « Tickets »."
    }
    return villesTrajets.length > 0
      ? `Je ne trouve pas de trajet planifié pour ${villesTrajets.join(' / ')} en ce moment. Vérifiez les dates dans l'application, l'offre change régulièrement.`
      : "Recherchez votre trajet depuis l'accueil de l'application : indiquez la ville de départ, la ville d'arrivée et la date, puis comparez les compagnies disponibles."
  }

  // Tarifs (colis)
  if (/tarif|prix|combien|co[uû]te/.test(m)) {
    const villesFares = villesMentionnees(m, ctx.fares.flatMap((f) => [f.origin, f.destination]))
    const correspondants = villesFares.length > 0
      ? ctx.fares.filter((f) => villesFares.includes(f.origin) || villesFares.includes(f.destination))
      : ctx.fares
    if (correspondants.length > 0) {
      const lignes = correspondants
        .slice(0, 5)
        .map((f) => `• ${f.origin} → ${f.destination} : à partir de ${f.baseFare} F (+${f.pricePerKg} F/kg)`)
        .join('\n')
      return `Voici ${villesFares.length > 0 ? 'le tarif correspondant' : 'quelques tarifs de livraison de colis'} :\n${lignes}\n\nLe prix exact dépend du poids et de la catégorie du colis.`
    }
    return "Les tarifs de livraison dépendent de la destination et du poids du colis — le prix exact est confirmé à la pesée en agence. Pour les billets de voyage, comparez les prix directement dans l'application selon votre trajet."
  }

  // Paiement
  if (/paiement|payer|flooz|tmoney|t-money|mobile money/.test(m)) {
    return "Le paiement se fait directement dans l'application via Flooz (Moov Money) ou T-Money (Togocom). Entrez le numéro à débiter au moment de payer votre réservation."
  }

  // Horaires d'ouverture / contact
  if (/heure.*ouvert|ouvert.*heure|horaire.*agence|quand.*ouvert/.test(m)) {
    return `🕒 ${HEURES_OUVERTURE}`
  }
  if (/contact|t[ée]l[ée]phone|joindre|appeler|email/.test(m)) {
    return `📞 ${CONTACT}`
  }

  // Salutations
  if (/^(bonjour|salut|bonsoir|hello|coucou|bonne? (journ[ée]e|soir[ée]e))\b/.test(m)) {
    return "Bonjour ! Je suis l'assistant TogoTransit 👋 Je peux vous aider à suivre un colis, comparer les trajets, connaître nos tarifs ou vous expliquer comment réserver. Que souhaitez-vous savoir ?"
  }

  // Remerciements / au revoir
  if (/merci/.test(m)) {
    return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. 😊"
  }
  if (/^(au revoir|bye|a\+|à\+|ciao)\b/.test(m)) {
    return "À bientôt sur TogoTransit ! 👋"
  }

  // Aucune règle ne correspond : on évite de répéter le même message générique
  // en boucle — on répète la question posée pour montrer qu'elle a été lue,
  // et on oriente vers des sujets concrets plutôt qu'une liste figée.
  const extrait = message.trim().length > 60 ? `${message.trim().slice(0, 57)}...` : message.trim()
  return `Je n'ai pas toutes les informations pour répondre précisément à « ${extrait} ». Je peux vous aider sur : le suivi d'un colis (donnez son numéro TRK-...), les trajets et horaires entre deux villes, les tarifs, la réservation ou le paiement. Que souhaitez-vous savoir parmi ça ?`
}

export async function POST(request: Request) {
  try {
    // Widget public (visible sur tout le site) : on limite l'abus plutôt que
    // d'exiger une connexion, pour ne pas casser le support pour les visiteurs.
    const ip = getClientIp(request)
    // Limite relevée par rapport au défaut (5/min) : une vraie conversation
    // échange plusieurs messages par minute, contrairement à une tentative
    // de connexion — le défaut faisait déclencher le blocage trop vite.
    const { limited, retryAfterSec } = await isRateLimited(`chat:${ip}`, 20)
    if (limited) {
      return NextResponse.json(
        { message: `Trop de messages envoyés. Réessayez dans ${retryAfterSec} secondes.` },
        { status: 429 }
      )
    }

    const { message, trackingId, history } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }
    // L'appli mobile n'a pas toujours de trackingId de contexte (le widget de
    // chat est global, pas lié à un colis précis) — on le retrouve dans le
    // texte lui-même si l'utilisateur l'a tapé, plutôt que de l'exiger en champ séparé.
    const trackingIdEffectif = trackingId || extraireTrackingId(message)
    const historique: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(history)
      ? history
          .filter((h: any) => h && typeof h.content === 'string' && (h.role === 'user' || h.role === 'assistant'))
          .slice(-6)
      : []

    const ctx: ChatContext = { parcel: null, trips: [], fares: [] }

    if (trackingIdEffectif) {
      const parcel = await prisma.parcel.findFirst({ where: { trackingId: trackingIdEffectif } })
      if (parcel) {
        ctx.parcel = {
          trackingId: parcel.trackingId,
          status: parcel.status,
          senderName: parcel.senderName,
          receiverName: parcel.receiverName,
          origin: parcel.origin,
          destination: parcel.destination,
          weight: parcel.weight,
          price: parcel.price,
        }
      }
    }

    const trips = await prisma.trajet.findMany({
      where: { statut: 'planifie' as any },
      include: { vehicule: true, ville_depart: true, ville_arrivee: true },
      take: 10,
    })
    ctx.trips = trips.map((trip: any) => ({
      origin: trip.ville_depart?.nom || '?',
      dest: trip.ville_arrivee?.nom || '?',
      departure: trip.date_depart ? new Date(trip.date_depart).toLocaleString('fr-FR') : 'inconnu',
      prix: trip.prix ?? 0,
      vehicule: trip.vehicule?.type || trip.vehicule?.immatriculation || '?',
    }))

    const fares = await prisma.fare.findMany({ take: 10 })
    ctx.fares = fares.map((f: any) => ({
      origin: f.origin,
      destination: f.destination,
      baseFare: f.baseFare,
      pricePerKg: f.pricePerKg,
    }))

    const reponseSecours = () => reponseParMotsCles(message, ctx)

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json({ message: reponseSecours() })
    }

    try {
      let contextTexte = ''
      if (ctx.parcel) {
        contextTexte += `\nInformations sur le colis (${ctx.parcel.trackingId}):\n- Statut: ${ctx.parcel.status}\n- Expéditeur: ${ctx.parcel.senderName}\n- Destinataire: ${ctx.parcel.receiverName}\n- Origine: ${ctx.parcel.origin}\n- Destination: ${ctx.parcel.destination}\n- Poids: ${ctx.parcel.weight}kg\n- Prix: ${ctx.parcel.price} F\n`
      }
      if (ctx.trips.length > 0) {
        contextTexte += `\nTrajets disponibles :\n${ctx.trips.map((t) => `- ${t.origin} → ${t.dest} | Départ: ${t.departure} | Prix: ${t.prix} F | Véhicule: ${t.vehicule}`).join('\n')}\n`
      }
      if (ctx.fares.length > 0) {
        contextTexte += `\nTarifs de livraison :\n${ctx.fares.map((f) => `- ${f.origin} → ${f.destination} | Tarif de base: ${f.baseFare} F | Prix/kg: ${f.pricePerKg} F`).join('\n')}\n`
      }
      contextTexte += `\n${HEURES_OUVERTURE}\n${CONTACT}`

      const systemPrompt = `
        Tu es l'assistant de support pour TogoTransit, une plateforme de gestion de colis et de transport au Togo.
        Réponds en français, de façon claire, concise (5 phrases maximum) et amicale.
        Tu peux aider avec : le suivi de colis (utilise le trackingId si fourni), les trajets disponibles,
        les tarifs, la réservation de billets, l'envoi de colis, le paiement (Flooz/T-Money) et les questions générales.
        Base tes réponses UNIQUEMENT sur le contexte fourni ci-dessous — n'invente jamais de prix, trajet ou statut.
        Si l'information demandée n'est pas dans le contexte, dis-le clairement et oriente vers l'application.

        Contexte actuel :${contextTexte}
      `

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          // Historique récent inclus pour permettre les questions de suivi
          // ("et pour demain ?") sans que l'utilisateur répète tout le contexte.
          ...historique,
          { role: 'user', content: message },
        ],
        temperature: 0.5,
        max_tokens: 500,
      })

      const aiMessage = response.choices[0].message.content || reponseSecours()
      return NextResponse.json({ message: aiMessage })
    } catch (openaiError) {
      console.error('OpenAI error:', openaiError)
      return NextResponse.json({ message: reponseSecours() })
    }
  } catch (error) {
    console.error('Chatbot error:', error)
    return NextResponse.json(
      { message: "Désolé, une erreur est survenue. Réessayez dans un instant ou contactez-nous au +228 22 21 00 00." }
    )
  }
}
