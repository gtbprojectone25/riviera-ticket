import { SupportTicketDetailClient } from '../_components/support-ticket-detail-client'

type Props = { params: Promise<{ id: string }> }

export default async function SupportTicketDetailPage({ params }: Props) {
  const { id } = await params
  return <SupportTicketDetailClient ticketId={id} />
}
