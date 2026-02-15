import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm'

import { db } from '@/db'
import { userSessions, users, paymentIntents, sessions, cinemas, carts } from '@/db/schema'
import { orders } from '@/db/admin-schema'

function extractCheckoutSessionIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const candidate = (metadata as { checkout_session_id?: unknown }).checkout_session_id
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

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

    const pendingOrders = await db
      .select({
        id: orders.id,
        cartId: orders.cartId,
        sessionId: orders.sessionId,
        userId: orders.userId,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        paymentReference: orders.paymentReference,
        checkoutSessionId: orders.checkoutSessionId,
        metadata: orders.metadata,
        sessionStartTime: sessions.startTime,
        movieTitle: sessions.movieTitle,
        cinemaName: sessions.cinemaName,
        cinemaAddress: cinemas.address,
      })
      .from(orders)
      .leftJoin(carts, eq(orders.cartId, carts.id))
      .leftJoin(sessions, eq(orders.sessionId, sessions.id))
      .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
      .where(
        and(
          or(
            eq(orders.userId, user.id),
            and(isNull(orders.userId), eq(carts.userId, user.id)),
          ),
          inArray(orders.status, ['PENDING', 'WAITING_PAYMENT']),
        ),
      )
      .orderBy(desc(orders.createdAt))

    const orphanPendingOrderIds = pendingOrders
      .filter((order) => !order.userId)
      .map((order) => order.id)

    if (orphanPendingOrderIds.length > 0) {
      await db
        .update(orders)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(
          and(
            inArray(orders.id, orphanPendingOrderIds),
            isNull(orders.userId),
          ),
        )
    }

    const result = await Promise.all(
      pendingOrders.map(async (order) => {
        let latestPaymentStatus: string | null = null
        if (order.cartId) {
          const [latestPayment] = await db
            .select({
              status: paymentIntents.status,
              checkoutSessionId: paymentIntents.checkoutSessionId,
            })
            .from(paymentIntents)
            .where(eq(paymentIntents.cartId, order.cartId))
            .orderBy(desc(paymentIntents.createdAt))
            .limit(1)

          latestPaymentStatus = latestPayment?.status ?? null
        }

        return {
          orderId: order.id,
          cartId: order.cartId,
          sessionId: order.sessionId,
          totalAmount: order.total,
          status: order.status,
          createdAt: order.createdAt?.toISOString?.() ?? new Date().toISOString(),
          updatedAt: order.updatedAt?.toISOString?.() ?? null,
          sessionTime: order.sessionStartTime?.toISOString?.() ?? null,
          movieTitle: order.movieTitle ?? 'Session',
          cinemaName: order.cinemaName ?? 'Riviera',
          cinemaAddress: order.cinemaAddress ?? null,
          checkoutSessionId:
            order.checkoutSessionId ||
            extractCheckoutSessionIdFromMetadata(order.metadata) ||
            null,
          paymentIntentStatus: latestPaymentStatus,
          paymentReference: order.paymentReference ?? null,
        }
      }),
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar pending payments da conta:', error)
    return NextResponse.json({ error: 'Failed to load pending payments' }, { status: 500 })
  }
}
