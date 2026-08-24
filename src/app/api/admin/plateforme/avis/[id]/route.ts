import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireRole } from '@/lib/auth'

type RouteParams = Promise<{ id: string }>

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireRole(auth!, 'super_admin')
    if (blocked) return blocked

    const { id } = await params
    const avisId = parseInt(id, 10)
    if (isNaN(avisId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const existing = await prisma.avis.findUnique({ where: { id: avisId } })
    if (!existing) {
      return NextResponse.json({ error: 'Avis non trouvé' }, { status: 404 })
    }

    await prisma.avis.delete({ where: { id: avisId } })

    return NextResponse.json({
      success: true,
      message: 'Avis supprimé (modération)',
    })
  } catch (error) {
    console.error('Plateforme Avis DELETE Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
