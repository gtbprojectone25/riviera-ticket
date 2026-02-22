import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, users } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { desc, eq, inArray, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/support
 * Lista todos os tickets (admin). Query: status=OPEN|IN_REVIEW|RESOLVED (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const hasStatusFilter =
      statusFilter && ['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(statusFilter)

    const baseSelect = {
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
    }

    const ticketsWithUser = hasStatusFilter
      ? await db
          .select(baseSelect)
          .from(supportTickets)
          .leftJoin(users, eq(supportTickets.userId, users.id))
          .where(eq(supportTickets.status, statusFilter as 'OPEN' | 'IN_REVIEW' | 'RESOLVED'))
          .orderBy(desc(supportTickets.updatedAt))
      : await db
          .select(baseSelect)
          .from(supportTickets)
          .leftJoin(users, eq(supportTickets.userId, users.id))
          .orderBy(desc(supportTickets.updatedAt))

    const pendingCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(inArray(supportTickets.status, ['OPEN', 'IN_REVIEW']))

    const pending = Number(pendingCount[0]?.count ?? 0)

    return NextResponse.json({
      tickets: ticketsWithUser,
      pendingCount: pending,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized'
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 })
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 })
    console.error('[admin/support] GET', err)
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }
}
