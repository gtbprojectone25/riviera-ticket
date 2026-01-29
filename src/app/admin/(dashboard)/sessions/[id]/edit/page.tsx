import { notFound } from 'next/navigation'
import { db } from '@/db'
import { auditoriums, cinemas, sessions } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'
import { SessionForm } from '../../_components/session-form'

export const metadata = {
  title: 'Editar Sessao | Admin Riviera',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditSessionPage({ params }: PageProps) {
  const { id } = await params

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1)

  if (!session) {
    notFound()
  }

  const cinemasRows = await db
    .select({ id: cinemas.id, name: cinemas.name })
    .from(cinemas)
    .orderBy(asc(cinemas.name))

  const auditoriumsRows = await db
    .select({ id: auditoriums.id, name: auditoriums.name, cinemaId: auditoriums.cinemaId, type: auditoriums.type })
    .from(auditoriums)
    .orderBy(asc(auditoriums.name))

  const initialData = {
    ...session,
    startTime: session.startTime.toISOString(),
    salesStatus: session.salesStatus ?? 'ACTIVE',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Editar Sessao</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ajuste horarios, precos e vendas
        </p>
      </div>

      <SessionForm cinemas={cinemasRows} auditoriums={auditoriumsRows} initialData={initialData} />
    </div>
  )
}
