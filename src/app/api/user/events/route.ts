// API Route: GET /api/user/events
// Lista eventos/tickets do usuário autenticado

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tickets, sessions, userSessions, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 },
      )
    }

    const userTickets = await db
      .select({
        ticket: tickets,
        session: sessions,
      })
      .from(tickets)
      .innerJoin(sessions, eq(sessions.id, tickets.sessionId))
      .where(eq(tickets.userId, user.id))

    const events = userTickets.reduce((acc: Record<string, { session: typeof sessions.$inferSelect; tickets: typeof tickets.$inferSelect[] }>, item: { session: typeof sessions.$inferSelect; ticket: typeof tickets.$inferSelect }) => {
      const sessionId = item.session.id
      if (!acc[sessionId]) {
        acc[sessionId] = {
          session: item.session,
          tickets: [],
        }
      }
      acc[sessionId].tickets.push(item.ticket)
      return acc
    }, {} as Record<string, { session: typeof sessions.$inferSelect; tickets: typeof tickets.$inferSelect[] }>)

    return NextResponse.json({
      events: Object.values(events),
    })
  } catch (error) {
    console.error('Error fetching user events:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500 },
    )
  }
}
