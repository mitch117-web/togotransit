import { NextResponse } from 'next/server'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

interface DeliveryPoint {
  id: string
  name: string
  address: string
  priority: 'normal' | 'high' | 'express'
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { deliveryPoints }: { deliveryPoints: DeliveryPoint[] } = await request.json()

    // Algorithme simple d'optimisation : tri par priorité + distance approximative
    const optimized = [...deliveryPoints].sort((a, b) => {
      const priorityOrder: Record<string, number> = { express: 0, high: 1, normal: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      // Si même priorité, trier par nom (simulation d'optimisation de distance)
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      optimizedRoute: optimized,
      totalEstimatedTime: `${optimized.length * 30} minutes`,
      notes: 'Route optimisée par priorité et ordre approximatif'
    })
  } catch (error) {
    console.error('Route Optimization Error:', error)
    return NextResponse.json(
      { error: 'Erreur d\'optimisation de route' },
      { status: 500 }
    )
  }
}
