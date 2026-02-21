import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums, carts, sessions, seats, tickets, userSessions, users } from '@/db/schema'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import type { AccountEvent } from '../../../../types/account'
import { buildExpectedSeatsFromLayout } from '@/server/seats/expectedSeats'

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
    const isDev = process.env.NODE_ENV !== 'production'
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
        barcodeBlurred: tickets.qrCode,
        sessionTime: sessions.startTime,
        movieTitle: sessions.movieTitle,
        cinemaName: sessions.cinemaName,
        auditoriumId: sessions.auditoriumId,
        basePrice: sessions.basePrice,
        vipPrice: sessions.vipPrice,
        seatLabel: seats.seatId,
        cartTotal: carts.totalAmount,
        cartStatus: carts.status,
      })
      .from(tickets)
      .leftJoin(seats, eq(tickets.seatId, seats.id))
      .leftJoin(sessions, eq(tickets.sessionId, sessions.id))
      .leftJoin(carts, eq(tickets.cartId, carts.id))
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

    // Normalizar tipo do ticket pelo ID do assento (seatLabel) usando o layout do auditório.
    // Isso corrige casos onde tickets antigos foram gravados com ticketType errado.
    const seatTypeBySessionAndSeatId = new Map<string, Map<string, string>>()

    const uniqueAuditoriumIds = Array.from(
      new Set(rows.map((r) => r.auditoriumId).filter((id): id is string => Boolean(id))),
    )

    if (uniqueAuditoriumIds.length > 0) {
      const auds = await db
        .select({ id: auditoriums.id, layout: auditoriums.layout, seatMapConfig: auditoriums.seatMapConfig })
        .from(auditoriums)
        .where(inArray(auditoriums.id, uniqueAuditoriumIds))

      const audById = new Map(auds.map((a) => [a.id, a]))

      for (const row of rows) {
        if (!row.auditoriumId) continue
        if (!row.seatLabel) continue
        if (seatTypeBySessionAndSeatId.has(row.sessionId)) continue

        const aud = audById.get(row.auditoriumId)
        if (!aud) continue

        const layout = (aud.seatMapConfig ?? aud.layout) as unknown
        const expected = buildExpectedSeatsFromLayout(
          layout as any,
          row.basePrice ?? 0,
          row.vipPrice ?? 0,
        )

        const map = new Map<string, string>()
        for (const seat of expected) {
          map.set(seat.seatId, seat.type)
        }
        seatTypeBySessionAndSeatId.set(row.sessionId, map)
      }
    }

    const normalizedTicketType = (row: (typeof rows)[number]): 'VIP' | 'STANDARD' => {
      const sessionMap = seatTypeBySessionAndSeatId.get(row.sessionId)
      const expected = row.seatLabel && sessionMap ? sessionMap.get(row.seatLabel) : undefined
      // Tratamos apenas VIP como VIP; todo resto vira STANDARD (inclui PREMIUM/WHEELCHAIR etc.)
      if (expected === 'VIP') return 'VIP'
      if (row.ticketType === 'VIP') return 'VIP'
      return 'STANDARD'
    }

    // Criar um evento separado para cada ticket individual usando o ticketId como ID único
    const events: AccountEvent[] = rows.map((row) => ({
      id: row.ticketId, // Usar o ID do ticket individual como identificador único
      movieTitle: row.movieTitle || 'Your Event',
      sessionTime: row.sessionTime?.toISOString?.() || new Date().toISOString(),
      cinemaName: row.cinemaName || 'Riviera',
      cinemaAddress: undefined,
      seatLabels: row.seatLabel ? [row.seatLabel] : [],
      status: row.cartStatus === 'COMPLETED' ? 'paid' : 'reserved',
      amount: row.ticketPrice ?? 0,
      type: normalizedTicketType(row),
      barcode: row.barcodeBlurred || undefined,
    }))
    return NextResponse.json(events)
  } catch (error) {
    console.error('Erro ao buscar eventos da conta:', error)
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}

