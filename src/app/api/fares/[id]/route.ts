import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole, assertCompagnieOwnership } from '@/lib/auth'

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

    const existing = await prisma.fare.findUnique({ where: { id: idNum } })
    if (!existing) {
      return NextResponse.json({ error: 'Fare not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    const data = await request.json()

    const updatedFare = await prisma.fare.update({
      where: { id: idNum },
      data: {
        origin: data.origin,
        destination: data.destination,
        baseFare: parseFloat(data.baseFare),
        pricePerKg: parseFloat(data.pricePerKg),
        category: data.category,
        zone: data.zone,
      }
    })

    return NextResponse.json(updatedFare)
  } catch (error) {
    console.error('Update Fare Error:', error)
    return NextResponse.json({ error: 'Failed to update fare' }, { status: 500 })
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

    const existing = await prisma.fare.findUnique({ where: { id: idNum } })
    if (!existing) {
      return NextResponse.json({ error: 'Fare not found' }, { status: 404 })
    }
    const ownershipError = await assertCompagnieOwnership(auth, existing.compagnie_id)
    if (ownershipError) return ownershipError

    await prisma.fare.delete({
      where: { id: idNum }
    })
    return NextResponse.json({ message: 'Fare deleted successfully' })
  } catch (error) {
    console.error('Delete Fare Error:', error)
    return NextResponse.json({ error: 'Failed to delete fare' }, { status: 500 })
  }
}
