import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { movies, sessions } from '@/db/schema'
import { and, eq, gt, or, ilike, sql } from 'drizzle-orm'

type SessionRow = typeof sessions.$inferSelect

type SessionWithMovie = SessionRow & { movieTitle: string }

const lastSessionsByCinema = new Map<string, { data: SessionWithMovie[]; at: number }>()
const STALE_MS = 5 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cinemaId = searchParams.get('cinemaId')
    const auditoriumId = searchParams.get('auditoriumId')
    const isDev = process.env.NODE_ENV !== 'production'

    const now = new Date()

    // Buscar sessões - se cinemaId fornecido, buscar por cinemaId OU cinemaName
    // (para compatibilidade com dados antigos que usam cinemaName)
    if (isDev) {
      console.debug('[sessions] request', { cinemaId, auditoriumId })
    }

    let rows: Array<{ session: SessionRow; movieTitle: string }>
    try {
      rows = await db
        .select({
          session: sessions,
          movieTitle: sql<string>`coalesce(${movies.title}, ${sessions.movieTitle})`.as('movie_title'),
        })
        .from(sessions)
        .leftJoin(movies, eq(sessions.movieId, movies.id))
        .where(
          and(
            gt(sessions.startTime, now),
            cinemaId
              ? or(
                  eq(sessions.cinemaId, cinemaId),
                  ilike(sessions.cinemaName, `%${cinemaId.replace(/-/g, ' ')}%`),
                )
              : undefined,
            auditoriumId ? eq(sessions.auditoriumId, auditoriumId) : undefined,
          ),
        )
    } catch (error) {
      const code = (error as { code?: string }).code
      const message = error instanceof Error ? error.message : ''
      if (code === '42703' || message.includes('movie_id')) {
        if (isDev) {
          console.debug('[sessions] fallback without movie_id', { code, message })
        }
        const fallbackRows = await db
          .select()
          .from(sessions)
          .where(
            and(
              gt(sessions.startTime, now),
              cinemaId
                ? or(
                    eq(sessions.cinemaId, cinemaId),
                    ilike(sessions.cinemaName, `%${cinemaId.replace(/-/g, ' ')}%`),
                  )
                : undefined,
              auditoriumId ? eq(sessions.auditoriumId, auditoriumId) : undefined,
            ),
          )
        return NextResponse.json(
          fallbackRows.map((row) => ({
            ...row,
            movieTitle: row.movieTitle ?? '',
          })),
          { headers: { 'x-fallback': 'sessions-without-movie' } },
        )
      }
      throw error
    }

    const data = rows.map((row) => ({
      ...row.session,
      movieTitle: row.movieTitle,
    }))

    if (isDev) {
      const invalidIds = data.filter((s) => (s.id?.length ?? 0) !== 36)
      if (invalidIds.length > 0) {
        console.warn('[sessions] invalid id length from DB', invalidIds.map((s) => ({ id: s.id, length: s.id?.length ?? 0 })))
      }
    }

    if (cinemaId) {
      lastSessionsByCinema.set(cinemaId, { data, at: Date.now() })
    }

    if (isDev) {
      console.debug('[sessions] response', { count: data.length })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao listar sessions:', error)

    const { searchParams } = new URL(request.url)
    const cinemaId = searchParams.get('cinemaId')

    if (cinemaId) {
      const cached = lastSessionsByCinema.get(cinemaId)
      if (cached && Date.now() - cached.at <= STALE_MS) {
        return NextResponse.json(cached.data, {
          status: 200,
          headers: { 'x-cache': 'stale' },
        })
      }
    }

    return NextResponse.json(
      { error: 'Erro ao listar sessões. Banco indisponível no momento.' },
      { status: 503 },
    )
  }
}
