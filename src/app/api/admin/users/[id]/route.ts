import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, seats, paymentIntents, carts, webhookLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/admin-auth'

export async function DELETE(
  request: NextRequest,
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
    await db
      .update(seats)
      .set({ heldBy: null, reservedBy: null })
      .where(eq(seats.heldBy, id))
    
    await db
      .update(seats)
      .set({ reservedBy: null })
      .where(eq(seats.reservedBy, id))

    // PaymentIntents: anonymize
    await db
      .update(paymentIntents)
      .set({ userId: null })
      .where(eq(paymentIntents.userId, id))

    // Carts: anonymize
    await db
      .update(carts)
      .set({ userId: null })
      .where(eq(carts.userId, id))
      
    // WebhookLogs: anonymize
    await db
      .update(webhookLogs)
      .set({ userId: null })
      .where(eq(webhookLogs.userId, id))

    // 2. Delete user (cascades to sessions, tickets, support tickets)
    await db.delete(users).where(eq(users.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
