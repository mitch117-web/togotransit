import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const user = await prisma.utilisateur.findUnique({
      where: { id: auth!.userId },
      include: {
        compagnie: { select: { id: true, nom: true, logo: true, statut: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.statut === 'bloque') {
      return NextResponse.json({ error: 'Compte bloqué' }, { status: 403 })
    }

    const { mot_de_passe: _, ...userWithoutPassword } = user
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Auth Me Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Mise à jour du profil de l'utilisateur connecté (self-service).
 * Ne permet jamais de changer son propre rôle, sa compagnie ou son statut —
 * ces champs restent réservés à la gestion admin (/api/users/[id]).
 */
export async function PATCH(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const data = await request.json()
    const updateData: any = {}

    if (data.nom !== undefined) updateData.nom = String(data.nom).trim()
    if (data.prenom !== undefined) updateData.prenom = String(data.prenom).trim()
    if (data.email !== undefined) updateData.email = data.email ? String(data.email).trim() : null
    if (data.telephone !== undefined) updateData.telephone = String(data.telephone).trim()
    if (data.notifications_enabled !== undefined) updateData.notifications_enabled = !!data.notifications_enabled

    if (data.nouveau_mot_de_passe) {
      if (!data.mot_de_passe_actuel) {
        return NextResponse.json(
          { error: 'Mot de passe actuel requis pour le changer.' },
          { status: 400 }
        )
      }
      const current = await prisma.utilisateur.findUnique({ where: { id: auth!.userId } })
      if (!current) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      }
      const valid = await bcrypt.compare(data.mot_de_passe_actuel, current.mot_de_passe)
      if (!valid) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 })
      }
      if (String(data.nouveau_mot_de_passe).length < 6) {
        return NextResponse.json(
          { error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' },
          { status: 400 }
        )
      }
      updateData.mot_de_passe = await bcrypt.hash(data.nouveau_mot_de_passe, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour.' }, { status: 400 })
    }

    const updated = await prisma.utilisateur.update({
      where: { id: auth!.userId },
      data: updateData,
      include: {
        compagnie: { select: { id: true, nom: true, logo: true, statut: true } },
      },
    })

    const { mot_de_passe: _, ...userWithoutPassword } = updated
    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Cet email ou ce numéro de téléphone est déjà utilisé par un autre compte.' },
        { status: 409 }
      )
    }
    console.error('Update Me Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
