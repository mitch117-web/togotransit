import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  extractAuthFromRequest,
  requireRole,
  assertCompagnieOwnership,
} from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await extractAuthFromRequest(request)
    const { id } = await params
    const compagnieId = parseInt(id, 10)

    const compagnie = await prisma.compagnie.findUnique({
      where: { id: compagnieId },
      include: {
        agences_locales: { include: { ville: true } },
        vehicules: true,
        _count: {
          select: {
            trajets: true,
            avis: true,
          },
        },
      },
    })

    if (!compagnie) {
      return NextResponse.json({ error: 'Compagnie non trouvée' }, { status: 404 })
    }

    if (auth?.role === 'voyageur' && compagnie.statut !== 'actif') {
      return NextResponse.json({ error: 'Compagnie non disponible' }, { status: 403 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, compagnie.id)
    if (ownershipError && auth?.role !== 'voyageur' && auth?.role !== 'super_admin') {
      return ownershipError
    }

    return NextResponse.json(compagnie)
  } catch (error: any) {
    console.error('Compagnie Detail Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la compagnie', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await extractAuthFromRequest(request)
    const { id } = await params
    const compagnieId = parseInt(id, 10)

    if (auth?.role === 'gestionnaire') {
      const ownershipError = await assertCompagnieOwnership(auth, compagnieId)
      if (ownershipError) return ownershipError
    } else {
      const roleError = requireRole(auth, 'super_admin')
      if (roleError) return roleError
    }

    const existing = await prisma.compagnie.findUnique({ where: { id: compagnieId } })
    if (!existing) {
      return NextResponse.json({ error: 'Compagnie non trouvée' }, { status: 404 })
    }

    const data = await request.json()

    const compagnie = await prisma.compagnie.update({
      where: { id: compagnieId },
      data: {
        nom: data.nom ?? existing.nom,
        logo: data.logo !== undefined ? data.logo : existing.logo,
        description: data.description !== undefined ? data.description : existing.description,
        telephone: data.telephone !== undefined ? data.telephone : existing.telephone,
        email: data.email !== undefined ? data.email : existing.email,
        adresse_siege: data.adresse_siege !== undefined ? data.adresse_siege : existing.adresse_siege,
        statut: data.statut ?? existing.statut,
      },
    })

    return NextResponse.json(compagnie)
  } catch (error: any) {
    console.error('Compagnie Update Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la compagnie', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await extractAuthFromRequest(request)
    const roleError = requireRole(auth, 'super_admin')
    if (roleError) return roleError

    const { id } = await params
    const compagnieId = parseInt(id, 10)

    const existing = await prisma.compagnie.findUnique({ where: { id: compagnieId } })
    if (!existing) {
      return NextResponse.json({ error: 'Compagnie non trouvée' }, { status: 404 })
    }

    await prisma.compagnie.delete({ where: { id: compagnieId } })

    return NextResponse.json({ success: true, message: 'Compagnie supprimée' })
  } catch (error: any) {
    console.error('Compagnie Delete Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la compagnie', details: error.message },
      { status: 500 }
    )
  }
}
