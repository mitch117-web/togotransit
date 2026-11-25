import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Liste lue à chaque appel : une compagnie suspendue ou réactivée doit apparaître ou disparaître aussitôt.
export const dynamic = 'force-dynamic'

/**
 * Compagnies en activité, pour que le voyageur choisisse à qui confier un colis depuis l'application.
 * Route publique : seuls l'identifiant et le nom sont renvoyés (ils figurent déjà dans la recherche de trajets).
 */
export async function GET() {
  try {
    const compagnies = await prisma.compagnie.findMany({
      where: { statut: 'actif' },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    })
    return NextResponse.json({ success: true, data: compagnies })
  } catch (error) {
    console.error('Compagnies GET Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
