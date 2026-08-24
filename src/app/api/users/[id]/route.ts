import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: idNum }
    })
    
    if (!utilisateur) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)
    const data = await request.json()
    
    const updateData: any = {}
    if (data.nom !== undefined) updateData.nom = data.nom
    if (data.prenom !== undefined) updateData.prenom = data.prenom
    if (data.email !== undefined) updateData.email = data.email
    if (data.telephone !== undefined) updateData.telephone = data.telephone
    if (data.role !== undefined) updateData.role = data.role
    if (data.compagnie_id !== undefined) updateData.compagnie_id = data.compagnie_id
    if (data.statut !== undefined) updateData.statut = data.statut
    if (data.mot_de_passe !== undefined) updateData.mot_de_passe = data.mot_de_passe
    // Fallback for English field names
    if (data.name !== undefined && data.nom === undefined) {
      const parts = String(data.name).split(' ')
      updateData.prenom = parts[0] || ''
      updateData.nom = parts.slice(1).join(' ') || ''
    }
    if (data.phone !== undefined && data.telephone === undefined) updateData.telephone = data.phone
    if (data.password !== undefined && data.mot_de_passe === undefined) updateData.mot_de_passe = data.password

    const updatedUser = await prisma.utilisateur.update({
      where: { id: idNum },
      data: updateData
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Update User Error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params
    const idNum = parseInt(id, 10)

    // Vérifier si l'utilisateur a des colis ou réservations
    const relatedData = await prisma.utilisateur.findUnique({
      where: { id: idNum },
      include: {
        _count: {
          select: {
            colis_envoyes: true,
            reservations: true
          }
        }
      }
    })

    if (relatedData && (relatedData._count.colis_envoyes > 0 || relatedData._count.reservations > 0)) {
      return NextResponse.json({ 
        error: "Impossible de supprimer cet utilisateur car il a des expéditions ou réservations liées." 
      }, { status: 400 })
    }

    await prisma.utilisateur.delete({
      where: { id: idNum }
    })
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Delete User Error:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 })
  }
}
