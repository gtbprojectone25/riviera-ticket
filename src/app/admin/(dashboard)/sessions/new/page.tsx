import { db } from '@/db'
import { auditoriums, cinemas } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { SessionForm } from '../_components/session-form'

export const metadata = {
  title: 'Nova Sessao | Admin Riviera',
}

export default async function NewSessionPage() {
  const cinemasRows = await db
    .select({ id: cinemas.id, name: cinemas.name })
    .from(cinemas)
    .orderBy(asc(cinemas.name))

  const auditoriumsRows = await db
    .select({ id: auditoriums.id, name: auditoriums.name, cinemaId: auditoriums.cinemaId, type: auditoriums.type })
    .from(auditoriums)
    .orderBy(asc(auditoriums.name))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nova Sessao</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure horarios, precos e salas
        </p>
      </div>

      <SessionForm cinemas={cinemasRows} auditoriums={auditoriumsRows} />
    </div>
  )
}
