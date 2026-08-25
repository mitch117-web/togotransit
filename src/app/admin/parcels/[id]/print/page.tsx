import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PrintParcelClient from '@/app/admin/parcels/[id]/print/PrintParcelClient'
import { getSessionContext } from '@/lib/session'

export default async function PrintParcelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = parseInt(id, 10)

  const parcel = await prisma.parcel.findUnique({
    where: { id: idNum },
  })

  if (!parcel) {
    notFound()
  }

  const session = await getSessionContext()
  if (session?.role === 'gestionnaire' && parcel.compagnie_id !== session.compagnieId) {
    notFound()
  }

  return <PrintParcelClient parcel={parcel as any} />
}
