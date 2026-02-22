import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, ticketMessages } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const messageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
})

/**
 * POST /api/admin/support/[id]/message
 * Admin envia resposta no ticket (sender = 'admin').
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1)

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

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
      .values({
        ticketId: id,
        sender: 'admin',
        message: parsed.data.message,
      })
      .returning()

    await db
      .update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, id))

    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized'
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
