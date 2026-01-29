import { db } from '@/db'
import { sessions, tickets, auditoriums } from '@/db/schema'
import { desc, eq, count } from 'drizzle-orm'
import { SessionsTableClient } from './sessions-table-client'

type SearchParams = Promise<{ [key: string]: string | undefined }>

type SessionWithStats = {
  id: string
  movieTitle: string
  movieDuration: number
  startTime: string
  cinemaName: string
  screenType: string
  totalSeats: number
  availableSeats: number
  salesStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED'
  auditoriumName: string | null
  ticketsSold: number
  soldSeats: number
  occupancy: number
}

async function getSessions(): Promise<SessionWithStats[]> {
  const rows = await db
    .select({
      session: sessions,
      auditoriumName: auditoriums.name,
    })
    .from(sessions)
    .leftJoin(auditoriums, eq(sessions.auditoriumId, auditoriums.id))
    .orderBy(desc(sessions.startTime))
    .limit(50)

  const enrichedSessions = await Promise.all(
    rows.map(async ({ session, auditoriumName }) => {
      const [ticketsCount] = await db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.sessionId, session.id))

      const soldSeats = session.totalSeats - session.availableSeats
      const occupancy = session.totalSeats > 0
        ? Math.round((soldSeats / session.totalSeats) * 100)
        : 0

      return {
        id: session.id,
        movieTitle: session.movieTitle,
        movieDuration: session.movieDuration,
        startTime: session.startTime.toISOString(),
        cinemaName: session.cinemaName,
        screenType: session.screenType,
        totalSeats: session.totalSeats,
        availableSeats: session.availableSeats,
        salesStatus: session.salesStatus ?? 'ACTIVE',
        auditoriumName,
        ticketsSold: ticketsCount?.count || 0,
        soldSeats,
        occupancy,
      }
    })
  )

  return enrichedSessions
}

export async function SessionsTable({ searchParams: _ }: { searchParams: SearchParams }) {
  void _
  const allSessions = await getSessions()

  return <SessionsTableClient sessions={allSessions} />
}
