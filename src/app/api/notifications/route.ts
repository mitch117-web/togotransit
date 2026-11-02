import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

const notificationSchema = z.object({
  userId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1000),
  type: z.string().trim().max(30).optional(),
  tripId: z.coerce.number().int().positive().nullish(),
})

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    // Toujours ses propres notifications — le paramètre `userId` éventuel est ignoré.
    const notifications = await prisma.notification.findMany({
      where: { userId: auth!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(notifications)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const parsed = notificationSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 })
    }
    const { userId, title, message, type, tripId } = parsed.data

    const destinataire = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { compagnie_id: true },
    })
    if (!destinataire) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
    }

    // Cloisonnement par compagnie : un gestionnaire ne notifie que le personnel de sa compagnie et les
    // voyageurs ayant réservé sur l'un de ses trajets. Le super-administrateur peut diffuser un message de
    // plateforme à n'importe quel compte.
    if (auth!.role === 'gestionnaire') {
      const compagnieId = auth!.compagnieId
      if (!compagnieId) {
        return NextResponse.json({ error: 'Gestionnaire sans compagnie attribuée' }, { status: 403 })
      }
      const clientDeLaCompagnie =
        destinataire.compagnie_id === compagnieId ||
        (await prisma.reservation.count({
          where: { utilisateur_id: userId, trajet: { compagnie_id: compagnieId } },
        })) > 0
      if (!clientDeLaCompagnie) {
        return NextResponse.json(
          { error: 'Accès refusé. Ce destinataire n\'est pas rattaché à votre compagnie.' },
          { status: 403 }
        )
      }
      if (tripId) {
        const trajet = await prisma.trajet.findUnique({ where: { id: tripId }, select: { compagnie_id: true } })
        if (!trajet || trajet.compagnie_id !== compagnieId) {
          return NextResponse.json(
            { error: 'Accès refusé. Ce trajet appartient à une autre compagnie.' },
            { status: 403 }
          )
        }
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'INFO',
        tripId: tripId ?? null,
      },
    })

    return NextResponse.json(notification)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { notificationId, isRead } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    const existing = await prisma.notification.findUnique({ where: { id: Number(notificationId) } })
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    if (existing.userId !== auth!.userId && auth!.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const updated = await prisma.notification.update({
      where: { id: Number(notificationId) },
      data: { isRead: isRead ?? true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
