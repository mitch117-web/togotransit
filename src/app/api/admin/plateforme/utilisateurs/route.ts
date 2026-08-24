import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'
import { z } from 'zod'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as any
    const q = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const where: any = {}
    if (role && ['voyageur', 'gestionnaire', 'super_admin'].includes(role)) {
      where.role = role
    }
    if (q) {
      where.OR = [
        { nom: { contains: q } },
        { prenom: { contains: q } },
        { telephone: { contains: q } },
        { email: { contains: q } },
      ]
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      take: limit,
      orderBy: [{ id: 'desc' }],
      include: {
        compagnie: { select: { id: true, nom: true, statut: true } },
        _count: {
          select: {
            reservations: true,
            avis: true,
            colis_envoyes: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: utilisateurs.map((u: any) => {
        const { mot_de_passe, ...rest } = u
        return rest
      }),
      total: utilisateurs.length,
    })
  } catch (error) {
    console.error('Plateforme Utilisateurs GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const createUtilisateurSchema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  telephone: z.string().min(8),
  mot_de_passe: z.string().min(6),
  role: z.enum(['gestionnaire', 'super_admin']),
  compagnie_id: z.number().int().positive().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const body = await request.json()
    const parsed = createUtilisateurSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    if (parsed.data.role === 'gestionnaire' && !parsed.data.compagnie_id) {
      return NextResponse.json(
        { error: 'Un gestionnaire doit appartenir à une compagnie' },
        { status: 400 }
      )
    }

    const existing = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { telephone: parsed.data.telephone },
          ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
        ],
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Un utilisateur avec ce téléphone ou email existe déjà' },
        { status: 409 }
      )
    }

    const { mot_de_passe: _mdp, ...utilisateur } = await prisma.utilisateur.create({
      data: {
        nom: parsed.data.nom,
        prenom: parsed.data.prenom,
        email: parsed.data.email || null,
        telephone: parsed.data.telephone,
        mot_de_passe: parsed.data.mot_de_passe,
        role: parsed.data.role,
        compagnie_id: parsed.data.role === 'gestionnaire' ? parsed.data.compagnie_id! : null,
        statut: 'actif',
      },
    })

    return NextResponse.json({
      success: true,
      data: utilisateur,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Plateforme Utilisateurs POST Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflit: cet email ou téléphone existe déjà' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
