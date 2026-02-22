import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, ticketMessages, users } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/** GET /api/admin/support/[id] - detalhe + mensagens */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const [ticket] = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        category: supportTickets.category,
        description: supportTickets.description,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userEmail: users.email,
        userName: users.name,
        userSurname: users.surname,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.id, id))
      .limit(1)
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    const messages = await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(asc(ticketMessages.createdAt))
    return NextResponse.json({ ticket, messages })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    return NextResponse.json({ error: 'Failed to load ticket' }, { status: 500 })
  }
}

const patchSchema = z.object({ status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']) })

/** PATCH /api/admin/support/[id] - atualiza status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const [updated] = await db
      .update(supportTickets)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning()
    if (!updated) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized'
    if (msg === 'Unauthorized') return NextResponse.json({ error: msg }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
