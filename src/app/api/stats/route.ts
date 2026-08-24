import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const totalParcels = await prisma.parcel.count()
    const inTransitParcels = await prisma.parcel.count({
      where: { status: 'IN_TRANSIT' }
    })
    const totalTrips = await prisma.trajet.count()
    
    // Revenue simulation (sum of paid parcels)
    const revenue = await prisma.parcel.aggregate({
      _sum: {
        price: true
      },
      where: {
        paymentStatus: 'PAID'
      }
    })

    return NextResponse.json({
      totalParcels,
      inTransitParcels,
      totalTrips,
      revenue: revenue._sum.price || 0
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
