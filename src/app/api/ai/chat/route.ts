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

  // Suivi de colis
  if (ctx.parcel) {
    const label = STATUT_COLIS_LABEL[ctx.parcel.status] || ctx.parcel.status
    return `📦 Votre colis ${ctx.parcel.trackingId} (${ctx.parcel.origin} → ${ctx.parcel.destination}) est actuellement ${label}. Destinataire : ${ctx.parcel.receiverName}.`
  }
  if (/\b(suivre|suivi|tracking|localiser)\b/.test(m) || /\bcolis\b.*\b(o[uù]|statut|arriv[ée])\b/.test(m)) {
    return "Pour suivre votre colis, indiquez son numéro de suivi (ex : TRK-1000) ou consultez l'onglet « Colis » de l'application, qui affiche l'historique et la position en direct."
  }

  // Envoyer un colis
  if (/envoyer|exp[ée]dier/.test(m) && /colis/.test(m)) {
    return "Pour envoyer un colis : ouvrez l'onglet « Colis » → « Nouvel envoi » → renseignez l'expéditeur, le destinataire et une photo du colis → validez. Déposez ensuite le colis à l'agence indiquée, le tarif définitif est confirmé après pesée."
  }

  // Tarifs
  if (/tarif|prix|combien|co[uû]te/.test(m)) {
    if (ctx.fares.length > 0) {
      const lignes = ctx.fares
        .slice(0, 5)
        .map((f) => `• ${f.origin} → ${f.destination} : à partir de ${f.baseFare} F (+${f.pricePerKg} F/kg)`)
        .join('\n')
      return `Voici quelques tarifs de livraison de colis :\n${lignes}\n\nLe prix exact dépend du poids et de la catégorie du colis.`
    }
    return "Les tarifs de livraison dépendent de la destination et du poids du colis — le prix exact est confirmé à la pesée en agence. Pour les billets de voyage, comparez les prix directement dans l'application selon votre trajet."
  }

  // Trajets / horaires de bus
  if (/trajet|horaire|d[ée]part|itin[ée]raire|\bbus\b|voyage/.test(m)) {
    if (ctx.trips.length > 0) {
      const lignes = ctx.trips
        .slice(0, 5)
        .map((t) => `• ${t.origin} → ${t.dest} — départ ${t.departure} — ${t.prix} F (${t.vehicule})`)
        .join('\n')
      return `Voici des trajets disponibles :\n${lignes}\n\nRecherchez et comparez toutes les compagnies depuis l'accueil de l'application.`
    }
    return "Recherchez votre trajet depuis l'accueil de l'application : indiquez la ville de départ, la ville d'arrivée et la date, puis comparez les compagnies disponibles."
  }

  // Réservation / billet
  if (/r[ée]server|r[ée]servation|billet|ticket/.test(m)) {
    return "Pour réserver : recherchez votre trajet depuis l'accueil → choisissez une compagnie → « Réserver » → renseignez les passagers → payez par Flooz ou T-Money. Votre billet avec QR code apparaît ensuite dans l'onglet « Tickets »."
  }

  // Paiement
  if (/paiement|payer|flooz|tmoney|t-money|mobile money/.test(m)) {
    return "Le paiement se fait directement dans l'application via Flooz (Moov Money) ou T-Money (Togocom). Entrez le numéro à débiter au moment de payer votre réservation."
  }

  // Horaires d'ouverture / contact
  if (/heure.*ouvert|ouvert.*heure|horaire.*agence/.test(m)) {
    return `🕒 ${HEURES_OUVERTURE}`
  }
  if (/contact|t[ée]l[ée]phone|joindre|appeler|email/.test(m)) {
    return `📞 ${CONTACT}`
  }

  // Salutations
  if (/^(bonjour|salut|bonsoir|hello|coucou)\b/.test(m)) {
    return "Bonjour ! Je suis l'assistant TogoTransit 👋 Je peux vous aider à suivre un colis, comparer les trajets, connaître nos tarifs ou vous expliquer comment réserver. Que souhaitez-vous savoir ?"
  }

  // Remerciements
  if (/merci/.test(m)) {
    return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. 😊"
  }

  return "Je peux vous renseigner sur le suivi de colis, les tarifs, les trajets disponibles, la réservation de billets ou le paiement. Pouvez-vous préciser votre question, ou choisir une suggestion ci-dessous ?"
}

export async function POST(request: Request) {
  try {
    // Widget public (visible sur tout le site) : on limite l'abus plutôt que
    // d'exiger une connexion, pour ne pas casser le support pour les visiteurs.
    const ip = getClientIp(request)
    const { limited, retryAfterSec } = await isRateLimited(`chat:${ip}`)
    if (limited) {
      return NextResponse.json(
        { message: `Trop de messages envoyés. Réessayez dans ${retryAfterSec} secondes.` },
        { status: 429 }
      )
    }

    const { message, trackingId } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const ctx: ChatContext = { parcel: null, trips: [], fares: [] }

    if (trackingId) {
      const parcel = await prisma.parcel.findFirst({ where: { trackingId } })
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
