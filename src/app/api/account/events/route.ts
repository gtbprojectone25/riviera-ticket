import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { carts, cinemas, sessions, seats, tickets, userSessions, users } from '@/db/schema'
import { and, desc, eq, inArray } from 'drizzle-orm'
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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .innerJoin(seats, eq(tickets.seatId, seats.id))
      .innerJoin(sessions, eq(tickets.sessionId, sessions.id))
      .leftJoin(carts, eq(tickets.cartId, carts.id))
      .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
      .where(
        and(
          eq(tickets.userId, user.id),
          inArray(tickets.status, ['CONFIRMED', 'RESERVED']),
        ),
      )
      .orderBy(desc(tickets.purchaseDate))

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
          // If cartTotal is missing, accumulate by ticket price; otherwise keep cart total
          if (!existing.amount || existing.amount === 0) {
            existing.amount = row.cartTotal ?? row.ticketPrice
          } else if (!row.cartTotal) {
            existing.amount += row.ticketPrice
          }
        }
      }
    }

    // Remove _seatSet (usado apenas internamente para deduplicação)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const events = Array.from(eventsByKey.values()).map(({ _seatSet, ...event }) => event)
    return NextResponse.json(events)
  } catch (error) {
    console.error('Erro ao buscar eventos da conta:', error)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}
