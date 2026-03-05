import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, seats, paymentIntents, carts, webhookLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/admin-auth'
import { orders, waitlist } from '@/db/admin-schema'
import { isTransientDbError } from '@/lib/db-error'

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === maxAttempts) break
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }
  throw lastError
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 1. Clear references in non-cascading tables
    // Seats: release held/reserved seats
    await withDbRetry(() =>
      db
        .update(seats)
        .set({ heldBy: null, reservedBy: null })
        .where(eq(seats.heldBy, id)),
    )

    await withDbRetry(() =>
      db
        .update(seats)
        .set({ reservedBy: null })
        .where(eq(seats.reservedBy, id)),
    )

    // PaymentIntents: anonymize
    await withDbRetry(() =>
      db
        .update(paymentIntents)
        .set({ userId: null })
        .where(eq(paymentIntents.userId, id)),
    )

    // Carts: anonymize
    await withDbRetry(() =>
      db
        .update(carts)
        .set({ userId: null })
        .where(eq(carts.userId, id)),
    )

    // Orders: anonymize to avoid FK restriction on user delete
    await withDbRetry(() =>
      db
        .update(orders)
        .set({ userId: null })
        .where(eq(orders.userId, id)),
    )

    // Waitlist: anonymize to avoid FK restriction on user delete
    await withDbRetry(() =>
      db
        .update(waitlist)
        .set({ userId: null })
        .where(eq(waitlist.userId, id)),
    )

    // WebhookLogs: anonymize
    await withDbRetry(() =>
      db
        .update(webhookLogs)
        .set({ userId: null })
        .where(eq(webhookLogs.userId, id)),
    )

    // 2. Delete user (cascades to sessions, tickets, support tickets)
    await withDbRetry(() => db.delete(users).where(eq(users.id, id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)

    if ((error as { code?: string })?.code === '23503') {
      return NextResponse.json(
        { error: 'Nao foi possivel excluir o usuario porque ainda existem registros vinculados.' },
        { status: 409 },
      )
    }

    if (isTransientDbError(error)) {
      return NextResponse.json(
        { error: 'Servico temporariamente indisponivel. Tente novamente.' },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
