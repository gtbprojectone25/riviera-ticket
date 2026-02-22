import { NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { inArray, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/admin/support/count - pendentes (OPEN + IN_REVIEW) para badge */
export async function GET() {
  try {
    await requireAdmin()
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(inArray(supportTickets.status, ['OPEN', 'IN_REVIEW']))
    return NextResponse.json({ pendingCount: Number(row?.count ?? 0) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized'
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: 'Failed to load count' }, { status: 500 })
  }
}
