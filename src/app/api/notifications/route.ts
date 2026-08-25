import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

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

    const { userId, title, message, type, tripId } = await request.json()

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId: Number(userId),
        title,
        message,
        type: type || 'INFO',
        tripId: tripId || null
      }
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
