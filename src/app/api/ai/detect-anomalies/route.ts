import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked
    const compagnieFilter = auth!.role === 'super_admin' ? {} : { compagnie_id: auth!.compagnieId ?? -1 }

    const anomalies: any[] = []

    // Détection 1: Colis en transit depuis plus de 7 jours
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const delayedParcels = await prisma.parcel.findMany({
      where: {
        ...compagnieFilter,
        status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        createdAt: { lt: sevenDaysAgo }
      }
    })

    delayedParcels.forEach(parcel => {
      anomalies.push({
        type: 'DELAYED_PARCEL',
        severity: 'high',
        parcelId: parcel.id,
        trackingId: parcel.trackingId,
        message: `Colis ${parcel.trackingId} en retard depuis plus de 7 jours`,
        createdAt: parcel.createdAt
      })
    })

    // Détection 2: Chauffeurs avec plus de 5 colis non livrés
    const drivers = await prisma.utilisateur.findMany({
      where: { role: 'gestionnaire' as any, ...compagnieFilter }
    })

    for (const driver of drivers) {
      const undelivered = await prisma.parcel.count({
        where: { 
          driverId: driver.id, 
          status: { notIn: ['DELIVERED', 'CANCELLED'] } 
        } as any
      })
      const driverName = `${driver.prenom ?? ''} ${driver.nom ?? ''}`.trim() || 'Chauffeur'
      if (undelivered > 5) {
        anomalies.push({
          type: 'OVERLOADED_DRIVER',
          severity: 'medium',
          driverId: driver.id,
          driverName,
          undeliveredCount: undelivered,
          message: `Chauffeur ${driverName} a ${undelivered} colis en attente`
        })
      }
    }

    // Détection 3: Paiements en attente depuis plus de 3 jours
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const pendingPayments = await prisma.parcel.findMany({
      where: {
        ...compagnieFilter,
        paymentStatus: 'PENDING',
        createdAt: { lt: threeDaysAgo }
      }
    })

    pendingPayments.forEach((parcel: any) => {
      anomalies.push({
        type: 'PENDING_PAYMENT',
        severity: 'low',
        parcelId: parcel.id,
        trackingId: parcel.trackingId,
        amount: parcel.price,
        message: `Paiement en attente pour le colis ${parcel.trackingId}`
      })
    })

    return NextResponse.json({
      anomalies,
      summary: {
        total: anomalies.length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      }
    })
  } catch (error) {
    console.error('Anomaly Detection Error:', error)
    return NextResponse.json(
      { error: 'Erreur de détection d\'anomalies' },
      { status: 500 }
    )
  }
}
