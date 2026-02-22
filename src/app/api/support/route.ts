import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, ticketMessages, userSessions, users } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
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

// GET /api/support — lista tickets do usuário logado
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, user.id))
      .orderBy(desc(supportTickets.createdAt))

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('[support] GET error', error)
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }
}

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.enum(['BUG', 'QUESTION', 'FINANCIAL', 'SUGGESTION']),
  description: z.string().trim().min(10).max(5000),
})

// POST /api/support — abre novo chamado
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { subject, category, description } = parsed.data
    const now = new Date()

    const [ticket] = await db
      .insert(supportTickets)
      .values({ userId: user.id, subject, category, description, status: 'OPEN', updatedAt: now })
      .returning()

    // primeira mensagem = descrição do chamado
    await db.insert(ticketMessages).values({
      ticketId: ticket.id,
      sender: 'user',
      message: description,
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('[support] POST error', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
