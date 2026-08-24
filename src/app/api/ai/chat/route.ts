import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import prisma from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { message, trackingId } = await request.json()

    // Récupérer des informations contextuelles
    let context = ''
    
    // Récupérer les colis si trackingId fourni
    if (trackingId) {
      const parcel = await prisma.parcel.findFirst({
        where: { trackingId }
      })
      if (parcel) {
        context += `
          Informations sur le colis (${parcel.trackingId}):
          - Statut: ${parcel.status}
          - Expéditeur: ${parcel.senderName} (${parcel.senderPhone})
          - Destinataire: ${parcel.receiverName} (${parcel.receiverPhone})
          - Origine: ${parcel.origin}
          - Destination: ${parcel.destination}
          - Poids: ${parcel.weight}kg
          - Prix: ${parcel.price} F
        `
      }
    }

    // Récupérer les trajets disponibles
    const trips = await prisma.trajet.findMany({
      where: { statut: 'planifie' as any },
      include: { vehicule: true, ville_depart: true, ville_arrivee: true },
      take: 10
    })
    if (trips.length > 0) {
      context += `\n\nTrajets disponibles :\n`
      trips.forEach((trip: any) => {
        const origin = trip.ville_depart?.nom || '?'
        const dest = trip.ville_arrivee?.nom || '?'
        const departure = trip.date_depart ? new Date(trip.date_depart).toLocaleString('fr-FR') : 'inconnu'
        const prix = trip.prix ?? 0
        const vehicule = trip.vehicule?.type || trip.vehicule?.immatriculation || '?'
        context += `- ${origin} → ${dest} | Départ: ${departure} | Prix: ${prix} F | Véhicule: ${vehicule}\n`
      })
    }

    // Récupérer les tarifs
    const fares = await prisma.fare.findMany({ take: 10 })
    if (fares.length > 0) {
      context += `\n\nTarifs de livraison :\n`
      fares.forEach((fare: any) => {
        context += `- ${fare.origin} → ${fare.destination} | Tarif de base: ${fare.baseFare} F | Prix/kg: ${fare.pricePerKg} F\n`
      })
    }

    // Always return a demo/fallback response
    const fallbackResponses = [
      `Bonjour ! Je suis votre assistant TogoTransit. Votre message : "${message}" - N'hésitez pas à nous contacter directement pour plus d'informations !`,
      `Merci pour votre message ! Pour toute question urgente, veuillez appeler notre service client.`,
      `Bien reçu ! Notre équipe est disponible pour vous aider.`,
      `Bonjour ! Je peux vous aider avec vos réservations de voyage et l'envoi de colis. Posez-moi votre question !`
    ]
    const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]

    // If no API key, return fallback
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json({ 
        message: randomFallback
      })
    }

    try {
      const systemPrompt = `
        Tu es un assistant de support pour TogoTransit, une plateforme de gestion de colis et de transport au Togo.
        Réponds en français de façon claire, concise et amicale.
        Tu peux aider avec :
        - Suivi de colis (utilise le trackingId si fourni)
        - Informations sur les trajets disponibles et leur réservation
        - Informations sur les tarifs et services d'expédition de colis
        - Aide à la création de colis et de réservations de voyage
        - Résolution de problèmes simples
        
        Si tu as besoin de plus d'informations (ex: numéro de suivi, origine/destination), demande-le poliment.
        
        ${context ? 'Contexte actuel : ' + context : ''}
      `

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      })

      const aiMessage = response.choices[0].message.content || randomFallback
      return NextResponse.json({ message: aiMessage })
    } catch (openaiError) {
      console.error('OpenAI error:', openaiError)
      // Fallback to demo response if OpenAI fails
      return NextResponse.json({ message: randomFallback })
    }
  } catch (error) {
    console.error('Chatbot error:', error)
    return NextResponse.json(
      { message: 'Bonjour ! Je suis votre assistant TogoTransit. Comment puis-je vous aider aujourd\'hui ?' }
    )
  }
}
