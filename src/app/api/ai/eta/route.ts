import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Distance approximative entre villes togolaises (km)
const cityDistances: Record<string, Record<string, number>> = {
  'Lomé': { 'Atakpamé': 160, 'Sokodé': 340, 'Kara': 410, 'Dapaong': 630 },
  'Atakpamé': { 'Lomé': 160, 'Sokodé': 180, 'Kara': 250, 'Dapaong': 470 },
  'Sokodé': { 'Lomé': 340, 'Atakpamé': 180, 'Kara': 70, 'Dapaong': 290 },
  'Kara': { 'Lomé': 410, 'Atakpamé': 250, 'Sokodé': 70, 'Dapaong': 220 },
  'Dapaong': { 'Lomé': 630, 'Atakpamé': 470, 'Sokodé': 290, 'Kara': 220 }
}

const AVERAGE_SPEED_KMH = 50 // Vitesse moyenne en km/h

export async function POST(request: Request) {
  try {
    const { origin, destination, parcelId } = await request.json()

    const distance = cityDistances[origin]?.[destination] || 200

    const baseTimeHours = distance / AVERAGE_SPEED_KMH

    const now = new Date()
    const estimatedArrival = new Date(now.getTime() + baseTimeHours * 60 * 60 * 1000)

    // Ajustements en fonction de l'heure
    const hour = now.getHours()
    let multiplier = 1
    if (hour >= 7 && hour <= 9) multiplier = 1.3 // Heure de pointe matin
    if (hour >= 17 && hour <= 19) multiplier = 1.4 // Heure de pointe soir
    if (hour >= 22 || hour <= 5) multiplier = 0.8 // Nuit, moins de circulation

    const finalArrival = new Date(now.getTime() + (baseTimeHours * multiplier) * 60 * 60 * 1000)

    return NextResponse.json({
      distance,
      estimatedHours: Math.round(baseTimeHours * 10) / 10,
      estimatedArrival: finalArrival.toISOString(),
      formattedArrival: finalArrival.toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    })
  } catch (error) {
    console.error('ETA Prediction Error:', error)
    return NextResponse.json(
      { error: 'Erreur de prédiction ETA' },
      { status: 500 }
    )
  }
}
