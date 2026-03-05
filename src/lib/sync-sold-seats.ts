import { db } from '@/db'
import { sql } from 'drizzle-orm'

export type SyncSoldSeatsResult = {
  updated: number
}

/**
 * Global reconciliation:
 * if a seat has a CONFIRMED ticket, force seat state to SOLD.
 */
export async function syncSoldSeatsWithConfirmedTickets(): Promise<SyncSoldSeatsResult> {
  const result = await db.execute(sql<{ id: string }>`
    update seats s
    set
      status = 'SOLD',
      sold_at = coalesce(s.sold_at, now()),
      sold_cart_id = coalesce(s.sold_cart_id, t.cart_id),
      held_until = null,
      held_by = null,
      held_by_cart_id = null,
      updated_at = now()
    from tickets t
    where
      t.seat_id = s.id
      and t.status = 'CONFIRMED'
      and (
        s.status <> 'SOLD'
        or s.sold_at is null
        or s.sold_cart_id is null
      )
    returning s.id
  `)

  return { updated: result.rows?.length ?? 0 }
}

