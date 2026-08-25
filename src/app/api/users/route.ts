import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

const roleMap: Record<string, any> = {
  CLIENT: 'voyageur',
  DRIVER: 'voyageur',
  ADMIN: 'super_admin',
  voyageur: 'voyageur',
  gestionnaire: 'gestionnaire',
  super_admin: 'super_admin',
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const data = await request.json()

    const telephone = data.phone ?? data.telephone ?? ''
    const email = data.email || null
    let role = roleMap[data.role] ?? data.role ?? 'voyageur'

    // Un gestionnaire ne peut créer que du personnel de sa propre compagnie,
    // jamais un compte super_admin ni un compte rattaché à une autre compagnie.
    const compagnie_id = auth!.role === 'gestionnaire' ? auth!.compagnieId : (data.compagnie_id ?? null)
    if (auth!.role === 'gestionnaire' && role === 'super_admin') {
      return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 403 })
    }

    const nom = data.nom ?? (data.name ? String(data.name).split(' ').slice(1).join(' ') : '') ?? ''
    const prenom = data.prenom ?? (data.name ? String(data.name).split(' ')[0] : '') ?? ''
    const motDePasseClair = data.password ?? data.mot_de_passe ?? 'password123'
    const mot_de_passe = await bcrypt.hash(motDePasseClair, 10)

    const existingUser = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { telephone },
          email ? { email } : undefined,
        ].filter(Boolean) as any,
      },
    })

    if (existingUser) {
      // Un gestionnaire ne doit pas pouvoir sonder l'existence d'un compte d'une autre compagnie.
      if (auth!.role === 'gestionnaire' && existingUser.compagnie_id !== auth!.compagnieId) {
        return NextResponse.json({ error: 'Un compte existe déjà avec ces informations' }, { status: 409 })
      }
      const { mot_de_passe: _pw, ...safeExisting } = existingUser
      return NextResponse.json(safeExisting)
    }

    const newUser = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        mot_de_passe,
        role,
        compagnie_id,
        statut: 'actif',
      } as any,
    })

    const { mot_de_passe: _pw2, ...safeUser } = newUser
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const where =
      auth!.role === 'super_admin'
        ? {}
        : { compagnie_id: auth!.compagnieId ?? -1 }

    const users = await prisma.utilisateur.findMany({
      where,
      orderBy: { date_creation: 'desc' } as any,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        compagnie_id: true,
        date_creation: true,
        statut: true,
      },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
