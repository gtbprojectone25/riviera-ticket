import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { orders } from './orders'
import { users } from './users'
import { sessions } from './sessions'
import { seats } from './seats'

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  seatId: uuid('seat_id')
    .notNull()
    .references(() => seats.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull(), // "reserved" | "paid" | "canceled" | "expired"
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/**
 * Índice único parcial sugerido (em SQL manual):
 *
 * CREATE UNIQUE INDEX unique_active_ticket_per_seat
 * ON tickets(seat_id)
 * WHERE status IN ('reserved', 'paid');
 */

