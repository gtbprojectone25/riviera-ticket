import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { carts, cinemas, sessions, userSessions, users } from '@/db/schema'
import { and, desc, eq, inArray, gt, lt } from 'drizzle-orm'

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

    const now = new Date()

    // Expire stale carts for this user to avoid showing outdated pendents
    await db
      .update(carts)
      .set({ status: 'EXPIRED', updatedAt: now })
      .where(
        and(
          eq(carts.userId, user.id),
          eq(carts.status, 'ACTIVE'),
          lt(carts.expiresAt, now),
        ),
      )

    const pendingCarts = await db
      .select({
        id: carts.id,
        sessionId: carts.sessionId,
        totalAmount: carts.totalAmount,
        status: carts.status,
        createdAt: carts.createdAt,
        expiresAt: carts.expiresAt,
        sessionTime: sessions.startTime,
        movieTitle: sessions.movieTitle,
        cinemaName: sessions.cinemaName,
        cinemaAddress: cinemas.address,
      })
      .from(carts)
      .innerJoin(sessions, eq(carts.sessionId, sessions.id))
      .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
      .where(
        and(
          eq(carts.userId, user.id),
          inArray(carts.status, ['ACTIVE']),
          gt(carts.expiresAt, now),
        ),
      )
      .orderBy(desc(carts.createdAt))

    return NextResponse.json(pendingCarts)
  } catch (error) {
    console.error('Erro ao buscar pendentes da conta:', error)
    return NextResponse.json({ error: 'Failed to load pendents' }, { status: 500 })
  }
}
