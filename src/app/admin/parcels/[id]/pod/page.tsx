import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PODClient from '@/app/admin/parcels/[id]/pod/PODClient'

export default async function PODPage({
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

  return <PODClient parcel={parcel as any} />
}
