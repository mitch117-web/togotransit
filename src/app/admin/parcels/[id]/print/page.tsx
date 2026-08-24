import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PrintParcelClient from '@/app/admin/parcels/[id]/print/PrintParcelClient'

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

  return <PrintParcelClient parcel={parcel as any} />
}
