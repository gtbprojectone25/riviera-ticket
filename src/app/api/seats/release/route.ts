import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { carts, cartItems, seats } from '@/db/schema'
import { and, eq, inArray, or } from 'drizzle-orm'

const releaseSchema = z.object({
  cartId: z.string().uuid(),
  sessionId: z.string().uuid(),
  seatIds: z.array(z.string()).min(1),
  userId: z.string().uuid().nullable().optional(),
})

type SeatLookup = {
  requestId: string
  seatId: string
  dbId: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = releaseSchema.parse(body)

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    const uuidSeatIds = parsed.seatIds.filter((id) => uuidRegex.test(id))
    const seatCodeIds = parsed.seatIds.filter((id) => !uuidRegex.test(id))

    const foundSeats: SeatLookup[] = []

    if (uuidSeatIds.length > 0) {
      const rows = await db
        .select({ id: seats.id, seatId: seats.seatId })
        .from(seats)
        .where(and(eq(seats.sessionId, parsed.sessionId), inArray(seats.id, uuidSeatIds)))

      rows.forEach((row) => {
        foundSeats.push({ requestId: row.id, seatId: row.seatId, dbId: row.id })
      })
    }

    if (seatCodeIds.length > 0) {
      const rows = await db
        .select({ id: seats.id, seatId: seats.seatId })
        .from(seats)
        .where(and(eq(seats.sessionId, parsed.sessionId), inArray(seats.seatId, seatCodeIds)))

      rows.forEach((row) => {
        foundSeats.push({ requestId: row.seatId, seatId: row.seatId, dbId: row.id })
      })
    }

    const dedupedByDbId = Array.from(
      new Map(foundSeats.map((seat) => [seat.dbId, seat])).values(),
    )
    const foundRequestIds = new Set(foundSeats.map((seat) => seat.requestId))
    const missingSeatIds = parsed.seatIds.filter((id) => !foundRequestIds.has(id))

    if (missingSeatIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'SEAT_NOT_FOUND', missingSeatIds },
        { status: 400 },
      )
    }

    const [existingCart] = await db
      .select({ id: carts.id, sessionId: carts.sessionId, status: carts.status })
      .from(carts)
      .where(eq(carts.id, parsed.cartId))
      .limit(1)

    if (!existingCart) {
      return NextResponse.json(
        { ok: false, error: 'CART_NOT_FOUND' },
        { status: 404 },
      )
    }

    const dbSeatIds = dedupedByDbId.map((seat) => seat.dbId)

    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, parsed.cartId), inArray(cartItems.seatId, dbSeatIds)))

    const now = new Date()

    const releaseConditions = [
      and(eq(seats.status, 'HELD'), eq(seats.heldByCartId, parsed.cartId)),
    ]

    if (parsed.userId) {
      releaseConditions.push(and(eq(seats.status, 'HELD'), eq(seats.heldBy, parsed.userId)))
    }

    const releasedSeats = await db
      .update(seats)
      .set({
        status: 'AVAILABLE',
        heldUntil: null,
        heldBy: null,
        heldByCartId: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(seats.sessionId, parsed.sessionId),
          inArray(seats.id, dbSeatIds),
          or(...releaseConditions),
        ),
      )
      .returning({ id: seats.id })

    const releasedIds = new Set(releasedSeats.map((seat) => seat.id))
    const releasedSeatIds = dedupedByDbId
      .filter((seat) => releasedIds.has(seat.dbId))
      .map((seat) => seat.seatId)

    return NextResponse.json({
      ok: true,
      releasedSeatIds,
    })
  } catch (error) {
    console.error('Erro ao liberar assentos:', error)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
