import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { carts, checkoutPurchases, cinemas, sessions, seats, tickets, userSessions, users } from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import type { AccountEvent } from '@/types/account'

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null
  const cookieToken = request.cookies.get('session')?.value
  const sessionToken = bearerToken || cookieToken

  if (!sessionToken) return null

  const result = await db
    .select({
      user: users,
      session: userSessions,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.sessionToken, sessionToken))
    .limit(1)

  if (result.length === 0) return null

  const { user, session } = result[0]
  if (session.expiresAt < new Date()) {
    await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
    return null
  }

  return user
}

function isMissingCheckoutSchemaError(error: unknown) {
  const code = (error as { code?: string })?.code
  const message = error instanceof Error ? error.message : String(error)
  return code === '42703' || code === '42P01' || /checkout_purchases|checkout_session_id/i.test(message)
}

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const userCheckoutCarts = await db
        .select({ cartId: checkoutPurchases.cartId })
        .from(checkoutPurchases)
        .where(
          and(
            eq(checkoutPurchases.userId, user.id),
            inArray(checkoutPurchases.status, ['SUCCEEDED', 'CLAIMED']),
          ),
        )

      if (userCheckoutCarts.length > 0) {
        const cartIds = userCheckoutCarts.map((entry) => entry.cartId)
        await db
          .update(tickets)
          .set({ userId: user.id, updatedAt: new Date() })
          .where(
            and(
              inArray(tickets.cartId, cartIds),
              isNull(tickets.userId),
            ),
          )
      }
    } catch (error) {
      if (!isMissingCheckoutSchemaError(error)) {
        throw error
      }
      if (isDev) {
        console.warn('[account/events] checkout_purchases unavailable; fallbacking to orders only', {
          userId: user.id,
        })
      }
    }

    const userOrderCarts = await db
      .select({ cartId: orders.cartId })
      .from(orders)
      .where(
        and(
          eq(orders.userId, user.id),
          inArray(orders.status, ['PAID', 'CONFIRMED']),
          isNull(orders.refundedAt),
        ),
      )

    if (userOrderCarts.length > 0) {
      const cartIds = userOrderCarts
        .map((entry) => entry.cartId)
        .filter((cartId): cartId is string => Boolean(cartId))

      if (cartIds.length > 0) {
        await db
          .update(tickets)
          .set({ userId: user.id, updatedAt: new Date() })
          .where(
            and(
              inArray(tickets.cartId, cartIds),
              isNull(tickets.userId),
            ),
          )
      }
    }

    const rows = await db
      .select({
        ticketId: tickets.id,
        cartId: tickets.cartId,
        sessionId: tickets.sessionId,
        ticketType: tickets.ticketType,
        ticketPrice: tickets.price,
        barcodeBlurred: tickets.barcodeBlurredPath,
        sessionTime: sessions.startTime,
        movieTitle: sessions.movieTitle,
        cinemaName: sessions.cinemaName,
        cinemaId: sessions.cinemaId,
        cinemaAddress: cinemas.address,
        seatLabel: seats.seatId,
        cartTotal: carts.totalAmount,
        cartStatus: carts.status,
      })
      .from(tickets)
      .leftJoin(seats, eq(tickets.seatId, seats.id))
      .leftJoin(sessions, eq(tickets.sessionId, sessions.id))
      .leftJoin(carts, eq(tickets.cartId, carts.id))
      .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
      .where(
        and(
          eq(tickets.userId, user.id),
          inArray(tickets.status, ['CONFIRMED', 'RESERVED']),
        ),
      )
      .orderBy(desc(tickets.purchaseDate))

    if (isDev) {
      console.info('[account/events] loaded', {
        userId: user.id,
        tickets: rows.length,
      })
    }

    const eventsByKey = new Map<string, AccountEvent & { _seatSet: Set<string> }>()

    for (const row of rows) {
      const key = row.cartId || row.ticketId
      const existing = eventsByKey.get(key)

      if (!existing) {
        const seatSet = new Set<string>()
        if (row.seatLabel) seatSet.add(row.seatLabel)

        eventsByKey.set(key, {
          id: key,
          movieTitle: row.movieTitle || 'Your Event',
          sessionTime: row.sessionTime?.toISOString?.() || new Date().toISOString(),
          cinemaName: row.cinemaName || 'Riviera',
          cinemaAddress: row.cinemaAddress || undefined,
          seatLabels: row.seatLabel ? [row.seatLabel] : [],
          status: row.cartStatus === 'COMPLETED' ? 'paid' : 'reserved',
          amount: row.cartTotal ?? row.ticketPrice ?? 0,
          type: row.ticketType === 'VIP' ? 'VIP' : 'STANDARD',
          barcode: row.barcodeBlurred || undefined,
          _seatSet: seatSet,
        })
      } else {
        if (row.seatLabel && !existing._seatSet.has(row.seatLabel)) {
          existing._seatSet.add(row.seatLabel)
          existing.seatLabels = Array.from(existing._seatSet)
        }
        if (row.ticketType === 'VIP') {
          existing.type = 'VIP'
        }
        if (!existing.barcode && row.barcodeBlurred) {
          existing.barcode = row.barcodeBlurred
        }
        if (row.ticketPrice) {
          if (!existing.amount || existing.amount === 0) {
            existing.amount = row.cartTotal ?? row.ticketPrice
          } else if (!row.cartTotal) {
            existing.amount += row.ticketPrice
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const events = Array.from(eventsByKey.values()).map(({ _seatSet, ...event }) => event)
    return NextResponse.json(events)
  } catch (error) {
    console.error('Erro ao buscar eventos da conta:', error)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}
