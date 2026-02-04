import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { carts, cartItems, seats } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { holdSeats } from '@/db/queries'

const holdSchema = z.object({
  cartId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid(),
  seatIds: z.array(z.string()).min(1),
  ttlMinutes: z.number().int().min(1).max(60).optional(),
  userId: z.string().uuid().nullable().optional(),
})

type SeatLookup = {
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
        foundSeats.push({ seatId: row.seatId, dbId: row.id, price: row.price })
      })
    }

    if (seatCodeIds.length > 0) {
      const rows = await db
        .select({ id: seats.id, seatId: seats.seatId, price: seats.price, sessionId: seats.sessionId })
        .from(seats)
        .where(and(eq(seats.sessionId, parsed.sessionId), inArray(seats.seatId, seatCodeIds)))

      rows.forEach((row) => {
        foundSeats.push({ seatId: row.seatId, dbId: row.id, price: row.price })
      })
    }

    const foundSeatIds = new Set(foundSeats.map((seat) => seat.seatId))
    if (isDev) {
      console.debug('[seats/hold] lookup', { totalRequested: parsed.seatIds.length, found: foundSeats.length })
    }
    const missingSeatIds = parsed.seatIds.filter((id) => !foundSeatIds.has(id))

    if (missingSeatIds.length > 0) {
      if (isDev) {
        console.debug('[seats/hold] missing seats', { missingSeatIds })
      }
      return NextResponse.json(
        { ok: false, error: 'SEAT_NOT_FOUND', missingSeatIds },
        { status: 400 },
      )
    }

    const totalAmount = foundSeats.reduce((sum, seat) => sum + seat.price, 0)
    const now = new Date()
    const heldUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000)

    let cartId = parsed.cartId
    if (!cartId) {
      const [cart] = await db
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

    const [existingCart] = await db
      .select({ id: carts.id, sessionId: carts.sessionId, status: carts.status })
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1)

    if (!existingCart) {
      if (isDev) {
        console.debug('[seats/hold] cart not found', { cartId })
      }
      return NextResponse.json(
        { ok: false, error: 'CART_NOT_FOUND' },
        { status: 404 },
      )
    }

    if (existingCart.status !== 'ACTIVE') {
      if (isDev) {
        console.debug('[seats/hold] cart not active', { cartId, status: existingCart.status })
      }
      return NextResponse.json(
        { ok: false, error: 'CART_NOT_ACTIVE' },
        { status: 200 },
      )
    }
    if (existingCart.sessionId !== parsed.sessionId) {
      if (isDev) {
        console.debug('[seats/hold] cart session mismatch', { cartId, cartSessionId: existingCart.sessionId, sessionId: parsed.sessionId })
      }
      return NextResponse.json(
        { ok: false, error: 'CART_SESSION_MISMATCH' },
        { status: 200 },
      )
    }

    const existingItems = await db
      .select({ seatId: cartItems.seatId })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId))

    const existingSeatIds = new Set(existingItems.map((item) => item.seatId))
    const itemsToInsert = foundSeats
      .filter((seat) => !existingSeatIds.has(seat.dbId))
      .map((seat) => ({
        cartId: cartId as string,
        seatId: seat.dbId,
        price: seat.price,
      }))

    if (itemsToInsert.length > 0) {
      // Avoid ON CONFLICT because the DB may lack the composite unique; we already filtered existing seatIds.
      await db.insert(cartItems).values(itemsToInsert)
    }

    let holdResult
    try {
      holdResult = await holdSeats(cartId, foundSeats.map((seat) => seat.dbId), ttlMinutes, db as unknown as typeof db)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'CART_NOT_FOUND') {
        return NextResponse.json(
          { ok: false, error: 'CART_NOT_FOUND' },
          { status: 404 },
        )
      }
      if (message === 'CART_NOT_ACTIVE') {
        return NextResponse.json(
          { ok: false, error: 'CART_NOT_ACTIVE' },
          { status: 200 },
        )
      }
      if (message === 'NO_SEATS') {
        return NextResponse.json(
          { ok: false, error: 'NO_SEATS' },
          { status: 400 },
        )
      }
      if (message === 'SEAT_OCCUPIED') {
        return NextResponse.json(
          { ok: false, error: 'SEAT_OCCUPIED', failedSeatIds: parsed.seatIds },
          { status: 200 },
        )
      }
      throw error
    }

    const heldIds = new Set(holdResult.heldSeatIds)
    const heldSeatIds = foundSeats
      .filter((seat) => heldIds.has(seat.dbId))
      .map((seat) => seat.seatId)

    if (isDev) {
      console.debug('[seats/hold] success', { heldSeatIds, cartId })
    }

    return NextResponse.json({
      ok: true,
      cartId,
      heldSeatIds,
      failedSeatIds: [],
      heldUntil: holdResult.heldUntil.toISOString(),
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


