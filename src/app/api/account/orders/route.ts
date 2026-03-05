import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/db'
import { users, userSessions, carts, sessions, cinemas } from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { isTransientDbError } from '@/lib/db-error'

const SESSION_CACHE = new Map<string, { user: (typeof users.$inferSelect); session: (typeof userSessions.$inferSelect); cachedAt: number }>()
const CACHE_TTL_MS = 60_000

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  const cookieToken = request.cookies.get('session')?.value
  const sessionToken = bearerToken || cookieToken

  if (!sessionToken) return null

  const cached = SESSION_CACHE.get(sessionToken)
  if (cached && cached.session.expiresAt > new Date() && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.user
  }

  let result: Array<{ user: typeof users.$inferSelect; session: typeof userSessions.$inferSelect }> = []
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await db
        .select({
          user: users,
          session: userSessions,
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(eq(userSessions.sessionToken, sessionToken))
        .limit(1)
      break
    } catch (err) {
      const transient = isTransientDbError(err)
      if (!transient || attempt === 2) {
        // fallback: usar cache se houver e estiver valido
        if (cached && cached.session.expiresAt > new Date()) {
          return cached.user
        }
        throw err
      }
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }
  }

  if (result.length === 0) return null

  const { user, session } = result[0]
  if (session.expiresAt < new Date()) {
    await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
    return null
  }

  SESSION_CACHE.set(sessionToken, { user, session, cachedAt: Date.now() })
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
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        cartId: orders.cartId,
        status: orders.status,
        total: orders.total,
        subtotal: orders.subtotal,
        discount: orders.discount,
        serviceFee: orders.serviceFee,
        paymentMethod: orders.paymentMethod,
        paymentReference: orders.paymentReference,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        sessionId: orders.sessionId,
        movieTitle: sessions.movieTitle,
        sessionStartTime: sessions.startTime,
        cinemaName: sessions.cinemaName,
        cinemaAddress: cinemas.address,
      })
      .from(orders)
      .leftJoin(carts, eq(orders.cartId, carts.id))
      .leftJoin(sessions, eq(orders.sessionId, sessions.id))
      .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
      .where(
        or(
          eq(orders.userId, user.id),
          and(isNull(orders.userId), eq(carts.userId, user.id)),
        ),
      )
      .orderBy(desc(orders.createdAt))

    const data = rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber ?? null,
      status: r.status,
      totalAmount: r.total,
      subtotal: r.subtotal ?? null,
      discount: r.discount ?? null,
      serviceFee: r.serviceFee ?? null,
      paymentMethod: r.paymentMethod ?? null,
      createdAt: r.createdAt?.toISOString?.() ?? null,
      paidAt: r.paidAt?.toISOString?.() ?? null,
      movieTitle: r.movieTitle ?? null,
      sessionTime: r.sessionStartTime?.toISOString?.() ?? null,
      cinemaName: r.cinemaName ?? null,
    }))

    return NextResponse.json({ orders: data })
  } catch {
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
