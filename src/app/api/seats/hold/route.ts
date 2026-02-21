import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { carts, cartItems, seats } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { bindActiveQueueEntryToCart, holdSeats } from '@/db/queries'
import type { HoldSeatsResult } from '@/lib/seat-reservation'

const QUEUE_SCOPE_KEY = 'the-odyssey-global'

const holdSchema = z.object({
  cartId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid(),
  seatIds: z.array(z.string()).min(1),
  ttlMinutes: z.number().int().min(1).max(60).optional(),
  userId: z.string().uuid().nullable().optional(),
})

type SeatLookup = {
  requestId: string
  seatId: string
  dbId: string
  price: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = holdSchema.parse(body)

    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) {
      console.debug('[seats/hold] request', {
        cartId: parsed.cartId ?? null,
        sessionId: parsed.sessionId,
        seatIds: parsed.seatIds,
        userId: parsed.userId ?? null,
      })
    }

    const ttlMinutes = parsed.ttlMinutes ?? 10

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    const uuidSeatIds = parsed.seatIds.filter((id) => uuidRegex.test(id))
    const seatCodeIds = parsed.seatIds.filter((id) => !uuidRegex.test(id))

    const foundSeats: SeatLookup[] = []

    if (uuidSeatIds.length > 0) {
      const rows = await db
        .select({ id: seats.id, seatId: seats.seatId, price: seats.price, sessionId: seats.sessionId })
        .from(seats)
        .where(and(eq(seats.sessionId, parsed.sessionId), inArray(seats.id, uuidSeatIds)))

      rows.forEach((row) => {
        foundSeats.push({ requestId: row.id, seatId: row.seatId, dbId: row.id, price: row.price })
      })
    }

    if (seatCodeIds.length > 0) {
      const rows = await db
        .select({ id: seats.id, seatId: seats.seatId, price: seats.price, sessionId: seats.sessionId })
        .from(seats)
        .where(and(eq(seats.sessionId, parsed.sessionId), inArray(seats.seatId, seatCodeIds)))

      rows.forEach((row) => {
        foundSeats.push({ requestId: row.seatId, seatId: row.seatId, dbId: row.id, price: row.price })
      })
    }

    const dedupedByDbId = Array.from(
      new Map(foundSeats.map((seat) => [seat.dbId, seat])).values(),
    )
    const foundRequestIds = new Set(foundSeats.map((seat) => seat.requestId))
    if (isDev) {
      console.debug('[seats/hold] lookup', { totalRequested: parsed.seatIds.length, found: dedupedByDbId.length })
    }
    const missingSeatIds = parsed.seatIds.filter((id) => !foundRequestIds.has(id))

    if (missingSeatIds.length > 0) {
      if (isDev) {
        console.debug('[seats/hold] missing seats', { missingSeatIds })
      }
      return NextResponse.json(
        { ok: false, error: 'SEAT_NOT_FOUND', missingSeatIds },
        { status: 400 },
      )
    }

    const totalAmount = dedupedByDbId.reduce((sum, seat) => sum + seat.price, 0)
    const runHold = async (tx: typeof db) => {
      const now = new Date()
      const heldUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000)

      let cartId = parsed.cartId
      if (!cartId) {
        const [cart] = await tx
          .insert(carts)
          .values({
            sessionId: parsed.sessionId,
            userId: parsed.userId ?? null,
            totalAmount,
            status: 'ACTIVE',
            expiresAt: heldUntil,
          })
          .returning()

        cartId = cart.id
      }

      const [existingCart] = await tx
        .select({ id: carts.id, sessionId: carts.sessionId, status: carts.status })
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1)

      if (!existingCart) {
        throw new Error('CART_NOT_FOUND')
      }

      if (existingCart.status !== 'ACTIVE') {
        throw new Error('CART_NOT_ACTIVE')
      }
      if (existingCart.sessionId !== parsed.sessionId) {
        throw new Error('CART_SESSION_MISMATCH')
      }

      const existingItems = await tx
        .select({ seatId: cartItems.seatId })
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId))

      const existingSeatIds = new Set(existingItems.map((item) => item.seatId))
      const itemsToInsert = dedupedByDbId
        .filter((seat) => !existingSeatIds.has(seat.dbId))
        .map((seat) => ({
          cartId: cartId as string,
          seatId: seat.dbId,
          price: seat.price,
        }))

      if (itemsToInsert.length > 0) {
        await tx.insert(cartItems).values(itemsToInsert)
      }

      const result = await holdSeats(cartId, dedupedByDbId.map((seat) => seat.dbId), ttlMinutes, tx)
      return { cartId, hold: result }
    }

    const holdResult = await db
      .transaction(async (tx) => runHold(tx as unknown as typeof db))
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('No transactions support in neon-http driver')) {
          return runHold(db)
        }
        throw error
      })
      .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      if (message === 'CART_NOT_FOUND') {
        return { ok: false as const, error: 'CART_NOT_FOUND', status: 404 }
      }
      if (message === 'CART_NOT_ACTIVE') {
        return { ok: false as const, error: 'CART_NOT_ACTIVE', status: 409 }
      }
      if (message === 'CART_SESSION_MISMATCH') {
        return { ok: false as const, error: 'CART_SESSION_MISMATCH', status: 409 }
      }
      if (message === 'NO_SEATS') {
        return { ok: false as const, error: 'NO_SEATS', status: 400 }
      }
      if (message === 'SEAT_OCCUPIED') {
        return { ok: false as const, error: 'SEAT_OCCUPIED', status: 409 }
      }
      throw error
      })

    if ('ok' in holdResult && holdResult.ok === false) {
      return NextResponse.json(
        { ok: false, error: holdResult.error, failedSeatIds: parsed.seatIds },
        { status: holdResult.status },
      )
    }

    const successHold = holdResult as { cartId: string; hold: HoldSeatsResult }
    const heldIds = new Set(successHold.hold.heldSeatIds)
    const heldSeatIds = dedupedByDbId
      .filter((seat) => heldIds.has(seat.dbId))
      .map((seat) => seat.seatId)

    const visitorToken = request.cookies.get('rt_visit_id')?.value
    if (visitorToken) {
      try {
        await bindActiveQueueEntryToCart({
          scopeKey: QUEUE_SCOPE_KEY,
          visitorToken,
          cartId: successHold.cartId,
          userId: parsed.userId ?? null,
        })
      } catch (error) {
        // Non-blocking: queue binding should not break seat hold flow.
        console.warn('[seats/hold] failed to bind queue entry to cart', error)
      }
    }

    if (isDev) {
      console.debug('[seats/hold] success', { heldSeatIds, cartId: successHold.cartId })
    }

    return NextResponse.json({
      ok: true,
      cartId: successHold.cartId,
      heldSeatIds,
      failedSeatIds: [],
      heldUntil: (successHold.hold.heldUntil ?? new Date()).toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_INPUT', issues: error.issues },
        { status: 400 },
      )
    }
    console.error('Erro ao segurar assentos:', error)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
