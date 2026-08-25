import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const parcelFilter = auth!.role === 'super_admin' ? {} : { compagnie_id: auth!.compagnieId ?? -1 }

    const totalParcels = await prisma.parcel.count({ where: parcelFilter })
    const inTransitParcels = await prisma.parcel.count({
      where: { ...parcelFilter, status: 'IN_TRANSIT' }
    })
    const totalTrips = await prisma.trajet.count({ where: parcelFilter })

    const revenue = await prisma.parcel.aggregate({
      _sum: {
        price: true
      },
      where: {
        ...parcelFilter,
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
