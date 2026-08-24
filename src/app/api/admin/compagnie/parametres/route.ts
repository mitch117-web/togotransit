import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole, assertCompagnieOwnership } from '@/lib/auth'
import { z } from 'zod'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    if (!auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const compagnie = await prisma.compagnie.findUnique({
      where: { id: auth!.compagnieId },
      include: {
        agences_locales: {
          include: { ville: true },
          orderBy: [{ id: 'asc' }],
        },
      },
    })

    if (!compagnie) {
      return NextResponse.json({ error: 'Compagnie non trouvée' }, { status: 404 })
    }

    const stats = await prisma.$transaction([
      prisma.trajet.count({ where: { compagnie_id: compagnie.id } }),
      prisma.reservation.count({ where: { trajet: { compagnie_id: compagnie.id } } }),
      prisma.vehicule.count({ where: { compagnie_id: compagnie.id } }),
      prisma.utilisateur.count({ where: { compagnie_id: compagnie.id } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        compagnie: {
          id: compagnie.id,
          nom: compagnie.nom,
          logo: compagnie.logo,
          description: compagnie.description,
          telephone: compagnie.telephone,
          email: compagnie.email,
          adresse_siege: compagnie.adresse_siege,
          statut: compagnie.statut,
          date_inscription: compagnie.date_inscription,
        },
        agences_locales: compagnie.agences_locales,
        statistiques: {
          trajets_count: stats[0],
          reservations_count: stats[1],
          vehicules_count: stats[2],
          utilisateurs_count: stats[3],
        },
      },
    })
  } catch (error) {
    console.error('Admin Compagnie Parametres GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const updateParametresSchema = z.object({
  nom: z.string().min(2).optional(),
  logo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  adresse_siege: z.string().optional().nullable(),
  couleur_theme: z.string().optional().nullable(),
  agences_locales: z.array(
    z.object({
      id: z.number().int().positive().optional(),
      ville_id: z.number().int().positive(),
      nom_agence: z.string().min(2),
      adresse: z.string().optional().nullable(),
      telephone: z.string().optional().nullable(),
    })
  ).optional(),
})

export async function PUT(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'gestionnaire')
    if (blocked) return blocked

    if (!auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const compagnie = await prisma.compagnie.findUnique({
      where: { id: auth!.compagnieId },
    })
    if (!compagnie) {
      return NextResponse.json({ error: 'Compagnie non trouvée' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateParametresSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const data: any = {}
      if (parsed.data.nom !== undefined) data.nom = parsed.data.nom
      if (parsed.data.logo !== undefined) data.logo = parsed.data.logo
      if (parsed.data.description !== undefined) data.description = parsed.data.description
      if (parsed.data.telephone !== undefined) data.telephone = parsed.data.telephone
      if (parsed.data.email !== undefined) data.email = parsed.data.email
      if (parsed.data.adresse_siege !== undefined) data.adresse_siege = parsed.data.adresse_siege

      const updatedCompagnie = await tx.compagnie.update({
        where: { id: auth!.compagnieId },
        data,
      })

      if (parsed.data.agences_locales !== undefined) {
        await tx.agenceLocale.deleteMany({
          where: { compagnie_id: auth!.compagnieId },
        })
        for (const ag of parsed.data.agences_locales) {
          await tx.agenceLocale.create({
            data: {
              compagnie_id: auth!.compagnieId!,
              ville_id: ag.ville_id,
              nom_agence: ag.nom_agence,
              adresse: ag.adresse ?? null,
              telephone: ag.telephone ?? null,
            },
          })
        }
      }

      return updatedCompagnie
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Paramètres mis à jour',
    })
  } catch (error) {
    console.error('Admin Compagnie Parametres PUT Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
