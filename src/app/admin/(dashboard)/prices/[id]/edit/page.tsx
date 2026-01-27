import { notFound } from 'next/navigation'
import { db } from '@/db'
import { auditoriums, cinemas, priceRules, sessions } from '@/db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import { PriceRuleForm } from '../../_components/price-rule-form'

export const metadata = {
  title: 'Editar Regra de Preco | Admin Riviera',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditPriceRulePage({ params }: PageProps) {
  const { id } = await params

  const [rule] = await db
    .select()
    .from(priceRules)
    .where(eq(priceRules.id, id))
    .limit(1)

  if (!rule) {
    notFound()
  }

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
        <h1 className="text-2xl font-bold text-white">Editar Regra de Preco</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ajuste prioridade e escopo
        </p>
      </div>

      <PriceRuleForm
        cinemas={cinemasRows}
        auditoriums={auditoriumsRows}
        sessions={sessionsRows}
        initialData={rule}
      />
    </div>
  )
}
