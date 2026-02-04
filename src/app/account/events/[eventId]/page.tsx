import EventDetailPageClient from './EventDetailPageClient'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  return <EventDetailPageClient eventId={eventId} />
}
