import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, ticketMessages, userSessions, users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

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

const messageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
})

// POST /api/support/[id]/message — adiciona mensagem ao ticket
export async function POST(
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
    if (ticket.status === 'RESOLVED') {
      return NextResponse.json({ error: 'Cannot reply to a resolved ticket' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const [msg] = await db
      .insert(ticketMessages)
      .values({ ticketId: id, sender: 'user', message: parsed.data.message })
      .returning()

    await db
      .update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, id))

    return NextResponse.json(msg, { status: 201 })
  } catch (error) {
    console.error('[support/:id/message] POST error', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
