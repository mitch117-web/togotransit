import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { extractAuthFromRequest, requireAnyRole, assertCompagnieOwnership } from '@/lib/auth'

const USER_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  role: true,
  compagnie_id: true,
  date_creation: true,
  statut: true,
} as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: idNum },
      select: USER_SELECT,
    })

    if (!utilisateur) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const ownershipError = await assertCompagnieOwnership(auth, utilisateur.compagnie_id)
    if (ownershipError) return ownershipError

    return NextResponse.json(utilisateur)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)

    const existing = await prisma.utilisateur.findUnique({ where: { id: idNum } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const data = await request.json()

    const updateData: any = {}
    if (data.nom !== undefined) updateData.nom = data.nom
    if (data.prenom !== undefined) updateData.prenom = data.prenom
    if (data.email !== undefined) updateData.email = data.email
    if (data.telephone !== undefined) updateData.telephone = data.telephone
    if (data.statut !== undefined) updateData.statut = data.statut
    // Fallback for English field names
    if (data.name !== undefined && data.nom === undefined) {
      const parts = String(data.name).split(' ')
      updateData.prenom = parts[0] || ''
      updateData.nom = parts.slice(1).join(' ') || ''
    }
    if (data.phone !== undefined && data.telephone === undefined) updateData.telephone = data.phone

    const motDePasseClair = data.password ?? data.mot_de_passe
    if (motDePasseClair !== undefined) {
      updateData.mot_de_passe = await bcrypt.hash(motDePasseClair, 10)
    }

    // Seul un super_admin peut changer le rôle ou déplacer un compte vers une autre compagnie.
    if (auth!.role === 'super_admin') {
      if (data.role !== undefined) updateData.role = data.role
      if (data.compagnie_id !== undefined) updateData.compagnie_id = data.compagnie_id
    }

    const updatedUser = await prisma.utilisateur.update({
      where: { id: idNum },
      data: updateData,
      select: USER_SELECT,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Update User Error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)

    const relatedData = await prisma.utilisateur.findUnique({
      where: { id: idNum },
      include: {
        _count: {
          select: {
            colis_envoyes: true,
            reservations: true,
          },
        },
      },
    })

    if (!relatedData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, relatedData.compagnie_id)
    if (ownershipError) return ownershipError

    if (relatedData._count.colis_envoyes > 0 || relatedData._count.reservations > 0) {
      return NextResponse.json({
        error: "Impossible de supprimer cet utilisateur car il a des expéditions ou réservations liées.",
      }, { status: 400 })
    }

    await prisma.utilisateur.delete({
      where: { id: idNum },
    })
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Delete User Error:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 })
  }
}
