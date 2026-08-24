import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const newFare = await prisma.fare.create({
      data: {
        origin: data.origin,
        destination: data.destination,
        baseFare: parseFloat(data.baseFare),
        pricePerKg: parseFloat(data.pricePerKg),
        category: data.category || 'STANDARD',
        zone: data.zone || 'ZONE_A',
      }
    })

    return NextResponse.json(newFare)
  } catch (error) {
    console.error('Create Fare Error:', error)
    return NextResponse.json({ error: 'Failed to create fare' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const fares = await prisma.fare.findMany({
      orderBy: { origin: 'asc' }
    })
    return NextResponse.json(fares)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch fares' }, { status: 500 })
  }
}
