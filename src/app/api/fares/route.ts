import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked
    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const data = await request.json()
    // Un gestionnaire ne peut créer un tarif que pour sa propre compagnie.
    const compagnie_id = auth!.role === 'gestionnaire' ? auth!.compagnieId : (data.compagnie_id ?? null)

    const newFare = await prisma.fare.create({
      data: {
        origin: data.origin,
        destination: data.destination,
        baseFare: parseFloat(data.baseFare),
        pricePerKg: parseFloat(data.pricePerKg),
        category: data.category || 'STANDARD',
        zone: data.zone || 'ZONE_A',
        compagnie_id,
      }
    })

    return NextResponse.json(newFare)
  } catch (error) {
    console.error('Create Fare Error:', error)
    return NextResponse.json({ error: 'Failed to create fare' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const where = auth!.role === 'super_admin' ? {} : { compagnie_id: auth!.compagnieId ?? -1 }

    const fares = await prisma.fare.findMany({
      where,
      orderBy: { origin: 'asc' }
    })
    return NextResponse.json(fares)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch fares' }, { status: 500 })
  }
}
