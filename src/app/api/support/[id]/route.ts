import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, ticketMessages, userSessions, users } from '@/db/schema'
import { asc, eq, and } from 'drizzle-orm'

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null
  const cookieToken = request.cookies.get('session')?.value
  const sessionToken = bearerToken || cookieToken

  if (!sessionToken) return null

  const result = await db
    .select({ user: users, session: userSessions })
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

// GET /api/support/[id] — detalhe do ticket + mensagens
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, user.id)))
      .limit(1)

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const messages = await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(asc(ticketMessages.createdAt))

    return NextResponse.json({ ticket, messages })
  } catch (error) {
    console.error('[support/:id] GET error', error)
    return NextResponse.json({ error: 'Failed to load ticket' }, { status: 500 })
  }
}
