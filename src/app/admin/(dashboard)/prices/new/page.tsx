import { db } from '@/db'
import { auditoriums, cinemas, sessions } from '@/db/schema'
import { asc, desc } from 'drizzle-orm'
import { PriceRuleForm } from '../_components/price-rule-form'

export const metadata = {
  title: 'Nova Regra de Preco | Admin Riviera',
}

export default async function NewPriceRulePage() {
  const cinemasRows = await db
    .select({ id: cinemas.id, name: cinemas.name })
    .from(cinemas)
    .orderBy(asc(cinemas.name))

  const auditoriumsRows = await db
    .select({ id: auditoriums.id, name: auditoriums.name, cinemaId: auditoriums.cinemaId })
    .from(auditoriums)
    .orderBy(asc(auditoriums.name))

  const sessionsRows = await db
    .select({
      id: sessions.id,
      movieTitle: sessions.movieTitle,
      startTime: sessions.startTime,
      cinemaId: sessions.cinemaId,
      auditoriumId: sessions.auditoriumId,
    })
    .from(sessions)
    .orderBy(desc(sessions.startTime))
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nova Regra de Preco</h1>
        <p className="text-gray-400 text-sm mt-1">
          Defina regras de preco com prioridade
        </p>
      </div>

      <PriceRuleForm
        cinemas={cinemasRows}
        auditoriums={auditoriumsRows}
        sessions={sessionsRows}
      />
    </div>
  )
}
