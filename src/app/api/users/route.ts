import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const roleMap: Record<string, any> = {
  CLIENT: 'voyageur',
  DRIVER: 'gestionnaire',
  ADMIN: 'super_admin',
  voyageur: 'voyageur',
  gestionnaire: 'gestionnaire',
  super_admin: 'super_admin',
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const telephone = data.phone ?? data.telephone ?? ''
    const email = data.email || null
    const role = roleMap[data.role] ?? data.role ?? 'voyageur'

    const nom = data.nom ?? (data.name ? String(data.name).split(' ').slice(1).join(' ') : '') ?? ''
    const prenom = data.prenom ?? (data.name ? String(data.name).split(' ')[0] : '') ?? ''
    const mot_de_passe = data.password ?? data.mot_de_passe ?? 'password123'

    // Check if user already exists by phone
    const existingUser = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { telephone },
          email ? { email } : undefined
        ].filter(Boolean) as any
      }
    })

    if (existingUser) {
      return NextResponse.json(existingUser) // Return existing user if found
    }

    const newUser = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        mot_de_passe,
        role,
        compagnie_id: data.compagnie_id ?? null,
        statut: 'actif',
      } as any
    })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const users = await prisma.utilisateur.findMany({
      orderBy: { date_creation: 'desc' } as any
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
