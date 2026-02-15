import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sessions, seats, tickets } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'

type Params = { sessionId: string }

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const sessionId = decodeURIComponent((await params).sessionId ?? '').trim()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)

    if (!isUuid) {
      return NextResponse.json({ error: 'INVALID_SESSION_ID' }, { status: 400 })
    }

    const [session] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!session) {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 })
    }

    const [soldSeat] = await db
      .select({ id: seats.id })
      .from(seats)
      .where(and(eq(seats.sessionId, sessionId), eq(seats.status, 'SOLD')))
      .limit(1)

    const [issuedTicket] = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(eq(tickets.sessionId, sessionId))
      .limit(1)

    if (soldSeat || issuedTicket) {
      return NextResponse.json(
        { error: 'SESSION_HAS_SOLD_SEATS' },
        { status: 409 },
      )
    }

    const result = await ensureSeatsForSession(sessionId)

    return NextResponse.json({ ok: true, created: result.created, skipped: result.skipped })
  } catch (error) {
    console.error('Error generating seats for session:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
