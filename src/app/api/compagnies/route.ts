import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  extractAuthFromRequest,
  requireRole,
  buildCompagnieScope,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await extractAuthFromRequest(request)
    const roleError = requireRole(auth, 'super_admin')
    if (roleError) return roleError

    const data = await request.json()
    const compagnie = await prisma.compagnie.create({
      data: {
        nom: data.nom,
        logo: data.logo || null,
        description: data.description || null,
        telephone: data.telephone || null,
        email: data.email || null,
        adresse_siege: data.adresse_siege || null,
        statut: data.statut || 'en_attente',
      },
    })

    return NextResponse.json(compagnie, { status: 201 })
  } catch (error: any) {
    console.error('Compagnie Creation Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la compagnie', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await extractAuthFromRequest(request)
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let where: Record<string, unknown> = {}

    if (statut) where.statut = statut

    const scope = buildCompagnieScope(auth)
    if (scope) where = { ...where, ...scope }

    if (auth?.role === 'voyageur') {
      where.statut = 'actif'
    }

    const [compagnies, total] = await Promise.all([
      prisma.compagnie.findMany({
        where,
        include: {
          _count: {
            select: {
              vehicules: true,
              trajets: true,
              utilisateurs: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nom: 'asc' },
      }),
      prisma.compagnie.count({ where }),
    ])

    return NextResponse.json({
      data: compagnies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Compagnies Fetch Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des compagnies', details: error.message },
      { status: 500 }
    )
  }
}
