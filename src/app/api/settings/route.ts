import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' }
    })

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'global' }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth, 'super_admin')
    if (blocked) return blocked

    const data = await request.json()

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        companyName: data.companyName,
        currency: data.currency,
        smsEnabled: data.smsEnabled,
        maintenance: data.maintenance,
      },
      create: {
        id: 'global',
        companyName: data.companyName,
        currency: data.currency,
        smsEnabled: data.smsEnabled,
        maintenance: data.maintenance,
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings Update Error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
