import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const { latitude, longitude } = await request.json()

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordinates required' }, { status: 400 })
    }

    // Find parcel by ID or trackingId
    const parcel = await prisma.parcel.findFirst({
      where: {
        OR: [
          { id: isNaN(idNum) ? undefined : idNum },
          { trackingId: id }
        ].filter((x: any) => x.id !== undefined || x.trackingId !== undefined) as any
      }
    })

    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
    }

    // Update statusHistory with new coordinates
    const history = JSON.parse(parcel.statusHistory || '[]')
    
    // We only keep the last few GPS updates to avoid bloating the DB
    // but we ensure the LATEST one is at the end
    const newEntry = {
      status: parcel.status, // Keep current status
      timestamp: new Date().toISOString(),
      location: `GPS Update: ${latitude}, ${longitude}`,
      metadata: { latitude, longitude }
    }

    history.push(newEntry)

    const updatedParcel = await prisma.parcel.update({
      where: { id: parcel.id },
      data: {
        statusHistory: JSON.stringify(history)
      }
    })

    return NextResponse.json({ success: true, entry: newEntry })
  } catch (error) {
    console.error('Failed to update location', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
