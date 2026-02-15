import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { seats, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'
import { toSeatStateRows } from '@/server/seats/seatStateDTO'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RowResponse = ReturnType<typeof toSeatStateRows>[number]

type CachedSeats = {
  rows: RowResponse[]
  at: number
}

const seatCache = new Map<string, CachedSeats>()
const STALE_MS = 60 * 1000

type Params = { sessionId: string }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const raw = (await params).sessionId as string
    const id = decodeURIComponent(raw ?? '').trim()
    const { searchParams } = new URL(request.url)
    const forceEnsure = searchParams.get('ensure') === 'true'
    const isDev = process.env.NODE_ENV === 'development'

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (isDev) {
      console.warn('[seats]', { raw, id, len: id.length, forceEnsure, url: request.url })
    }

    if (!isUuid) {
      return NextResponse.json(
        {
          error: 'INVALID_SESSION_ID',
          raw,
          id,
          rawLength: raw?.length ?? 0,
          idLength: id?.length ?? 0,
          url: request.url,
        },
        { status: 400 },
      )
    }

    const fetchSeats = async () =>
      db
        .select()
        .from(seats)
        .where(eq(seats.sessionId, id))

    let dbSeats = await fetchSeats()

    if (dbSeats.length === 0 || forceEnsure) {
      const [sessionExists] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1)

      if (!sessionExists) {
        return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 })
      }

      try {
        const result = await ensureSeatsForSession(id)
        if (isDev) {
          console.debug('[seats] auto-generate seats', { id, created: result.created, skipped: result.skipped })
        }
        dbSeats = await fetchSeats()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar assentos'
        if (isDev) console.error('[seats] error', err)
        return NextResponse.json(
          { error: 'SEATS_ENDPOINT_FAILED', message },
          { status: 500 },
        )
      }
    }

    const rows: RowResponse[] = toSeatStateRows(dbSeats)

    seatCache.set(id, { rows, at: Date.now() })

    if (isDev) {
      console.debug('[seats] response', { id, rows: rows.length, seats: dbSeats.length })
    }
    return NextResponse.json(rows)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[seats] error', error)
    }

    // Try to serve stale cache if available
    const raw = (await params).sessionId as string
    const id = decodeURIComponent(raw ?? '').trim()
    const cached = seatCache.get(id)
    if (cached && Date.now() - cached.at <= STALE_MS) {
      return NextResponse.json(cached.rows, {
        status: 200,
        headers: { 'x-cache': 'stale' },
      })
    }

    const message = error instanceof Error ? error.message : 'Erro ao buscar assentos da sessão. Banco indisponível no momento.'
    return NextResponse.json(
      { error: 'SEATS_ENDPOINT_FAILED', message },
      { status: 500 },
    )
  }
}

