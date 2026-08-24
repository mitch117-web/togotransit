import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const where: any = {}
    if (q) {
      where.OR = [
        { nom: { contains: q } },
        { region: { contains: q } },
      ]
    }

    const [villes, total] = await Promise.all([
      prisma.ville.findMany({
        where,
        orderBy: [{ region: 'asc' as any }, { nom: 'asc' as any }],
        take: limit,
      }),
      prisma.ville.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: villes.map((v: any) => ({
        id: v.id,
        nom: v.nom,
        pays: 'Togo',
        region: v.region,
        latitude: null,
        longitude: null,
      })),
      total,
    })
  } catch (err: any) {
    console.error('GET /api/villes error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur interne', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
