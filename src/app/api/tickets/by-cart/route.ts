import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tickets, seats, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cartId = searchParams.get('cartId')

    if (!cartId) {
      return NextResponse.json({ error: 'cartId is required' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!uuidRegex.test(cartId)) {
      return NextResponse.json({ error: 'cartId invalid' }, { status: 400 })
    }

    const rows = await db
      .select({
        ticket: tickets,
        seat: seats,
        session: sessions,
      })
      .from(tickets)
      .innerJoin(seats, eq(seats.id, tickets.seatId))
      .innerJoin(sessions, eq(sessions.id, tickets.sessionId))
      .where(eq(tickets.cartId, cartId))

    if (rows.length === 0) {
      return NextResponse.json({ tickets: [] }, { status: 200 })
    }

    const session = rows[0]?.session ?? null
    const mappedTickets = rows.map((row) => ({
      id: row.ticket.id,
      type: row.ticket.ticketType,
      price: row.ticket.price,
      seatId: row.seat.seatId,
      sessionId: row.ticket.sessionId,
    }))

    return NextResponse.json({
      session,
      tickets: mappedTickets,
    })
  } catch (error) {
    console.error('Erro ao buscar tickets por cartId:', error)
    return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 })
  }
}
