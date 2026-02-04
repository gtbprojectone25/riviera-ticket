import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { seats, tickets } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD'

type SeatResponse = {
  id: string
  row: string
  number: number
  type: string
  status: SeatStatus
  heldUntil?: string | null
  heldByCartId?: string | null
}

type RowResponse = {
  label: string
  seats: SeatResponse[]
}

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
    const ensure = searchParams.get('ensure') === 'true'
    const isDev = process.env.NODE_ENV === 'development'

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (isDev) {
      console.warn('[seats]', { raw, id, len: id.length, ensure, url: request.url })
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

    if (ensure && dbSeats.length === 0) {
      // verify session exists before generating seats
      const [sessionExists] = await db
        .select({ id: seats.sessionId })
        .from(seats)
        .where(eq(seats.sessionId, id))
        .limit(1)

      if (!sessionExists) {
        // check session existence via a lightweight query
        const sessionCheck = await db
          .select({ id: sql`id` })
          .from(sql`sessions`)
          .where(eq(sql`id`, id as any))
          .limit(1) as Array<{ id: string }>

        if (!sessionCheck || sessionCheck.length === 0) {
          return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 })
        }
      }

      try {
        const result = await generateSeatsForSession(id)
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

    // Fallbacks: tickets confirmados tornam o assento SOLD, tickets reservados o tornam HELD
    const soldTickets = await db
      .select({ seatId: tickets.seatId })
      .from(tickets)
      .where(and(eq(tickets.sessionId, id), eq(tickets.status, 'CONFIRMED')))

    const reservedTickets = await db
      .select({
        seatId: tickets.seatId,
        cartId: tickets.cartId,
        expiresAt: tickets.expiresAt,
      })
      .from(tickets)
      .where(and(eq(tickets.sessionId, id), eq(tickets.status, 'RESERVED')))

    const soldSeatIds = new Set(soldTickets.map((t) => t.seatId))
    const reservedBySeatId = new Map(reservedTickets.map((t) => [t.seatId, t]))

    const seatMap = new Map<string, SeatResponse[]>()
    const now = new Date()

    for (const seat of dbSeats) {
      const rowLabel = seat.row
      if (!seatMap.has(rowLabel)) {
        seatMap.set(rowLabel, [])
      }

      const reservedTicket = reservedBySeatId.get(seat.id)
      const reservedActive = Boolean(
        reservedTicket &&
          (!reservedTicket.expiresAt || reservedTicket.expiresAt > now),
      )

      const isSold =
        seat.status === 'SOLD' ||
        Boolean(seat.soldAt) ||
        Boolean(seat.soldCartId) ||
        soldSeatIds.has(seat.id)

      const isHeldActive =
        seat.status === 'HELD' &&
        seat.heldUntil &&
        seat.heldUntil > now &&
        Boolean(seat.heldByCartId)

      const status: SeatStatus = isSold
        ? 'SOLD'
        : reservedActive || isHeldActive
          ? 'HELD'
          : 'AVAILABLE'

      const heldUntil = reservedActive
        ? reservedTicket?.expiresAt ?? seat.heldUntil
        : seat.heldUntil

      const heldByCartId = reservedActive
        ? reservedTicket?.cartId ?? seat.heldByCartId ?? null
        : seat.heldByCartId ?? null

      seatMap.get(rowLabel)!.push({
        id: seat.seatId,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status,
        heldUntil: heldUntil ? heldUntil.toISOString() : null,
        heldByCartId,
      })
    }

    const rows: RowResponse[] = Array.from(seatMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rowSeats]) => ({
        label,
        seats: rowSeats.sort(
          (a, b) => Number(a.number) - Number(b.number),
        ),
      }))

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
