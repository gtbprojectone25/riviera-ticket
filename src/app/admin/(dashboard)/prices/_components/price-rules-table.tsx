import { db } from '@/db'
import { auditoriums, cinemas, priceRules, sessions } from '@/db/schema'
import { desc, eq, asc } from 'drizzle-orm'
import { PriceRulesTableClient } from './price-rules-table-client'

type PriceRuleRow = typeof priceRules.$inferSelect

type PriceRuleWithMeta = {
  rule: PriceRuleRow
  cinemaName: string | null
  auditoriumName: string | null
  sessionTitle: string | null
  sessionStart: Date | null
}

async function getPriceRules(): Promise<PriceRuleWithMeta[]> {
  const rows = await db
    .select({
      rule: priceRules,
      cinemaName: cinemas.name,
      auditoriumName: auditoriums.name,
      sessionTitle: sessions.movieTitle,
      sessionStart: sessions.startTime,
    })
    .from(priceRules)
    .leftJoin(cinemas, eq(priceRules.cinemaId, cinemas.id))
    .leftJoin(auditoriums, eq(priceRules.auditoriumId, auditoriums.id))
    .leftJoin(sessions, eq(priceRules.sessionId, sessions.id))
    .orderBy(desc(priceRules.priority), desc(priceRules.updatedAt))

  return rows
}

async function getFilterData() {
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

  return { cinemasRows, auditoriumsRows, sessionsRows }
}

export async function PriceRulesTable() {
  const [rules, filters] = await Promise.all([getPriceRules(), getFilterData()])

  return (
    <PriceRulesTableClient
      rules={rules}
      cinemas={filters.cinemasRows}
      auditoriums={filters.auditoriumsRows}
      sessions={filters.sessionsRows}
    />
  )
}
