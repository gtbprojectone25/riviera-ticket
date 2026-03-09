import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'

import { db } from '@/db'
import { seats, sessions, tickets } from '@/db/schema'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'
import { toSeatStateRows } from '@/server/seats/seatStateDTO'
import { enforceConfirmedSeatsAsSold } from '@/server/seats/confirmedSeatGuard'
import { withDbRetry } from '@/lib/db-retry'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Params = { sessionId: string }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const raw = (await params).sessionId as string
    const sessionId = decodeURIComponent(raw ?? '').trim()
    const { searchParams } = new URL(request.url)
    const forceEnsure = searchParams.get('ensure') === 'true'

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
    if (!isUuid) {
      return NextResponse.json({ error: 'INVALID_SESSION_ID' }, { status: 400 })
    }

    const fetchSeats = async () =>
      withDbRetry(() =>
        db
          .select()
          .from(seats)
          .where(eq(seats.sessionId, sessionId)),
      )

    let dbSeats = await fetchSeats()

    if (dbSeats.length === 0 || forceEnsure) {
      const [sessionExists] = await withDbRetry(() =>
        db
          .select({ id: sessions.id })
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1),
      )

      if (!sessionExists) {
        return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 })
      }

      await ensureSeatsForSession(sessionId)
      dbSeats = await fetchSeats()
    }

    const confirmedTicketSeats = await withDbRetry(() =>
      db
        .select({ seatId: tickets.seatId })
        .from(tickets)
        .where(
          and(
            eq(tickets.sessionId, sessionId),
            ne(tickets.status, 'CANCELLED'),
          ),
        ),
    )

    const normalizedSeats = enforceConfirmedSeatsAsSold(
      dbSeats,
      confirmedTicketSeats.map((t) => t.seatId),
    )

    const rows = toSeatStateRows(normalizedSeats)
    const rowsWithBlocked = rows.map((row) => ({
      label: row.label,
      seats: row.seats.map((seat) => ({
        ...seat,
        blocked: seat.status === 'SOLD' || seat.status === 'HELD',
      })),
    }))

    const purchasedSeatIds = rowsWithBlocked
      .flatMap((row) => row.seats)
      .filter((seat) => seat.status === 'SOLD')
      .map((seat) => seat.seatId)

    const blockedSeatIds = rowsWithBlocked
      .flatMap((row) => row.seats)
      .filter((seat) => seat.blocked)
      .map((seat) => seat.seatId)

    return NextResponse.json({
      sessionId,
      rows: rowsWithBlocked,
      purchasedSeatIds,
      blockedSeatIds,
      summary: {
        total: rowsWithBlocked.flatMap((row) => row.seats).length,
        purchased: purchasedSeatIds.length,
        blocked: blockedSeatIds.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load seat map'
    return NextResponse.json(
      { error: 'SEAT_MAP_FAILED', message },
      { status: 500 },
    )
  }
}
