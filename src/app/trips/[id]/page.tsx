import { redirect } from 'next/navigation'

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/trips/${id}/book`)
}
