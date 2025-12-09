import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { sessions } from './sessions'

export const seats = pgTable('seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  row: varchar('row', { length: 10 }).notNull(),
  number: varchar('number', { length: 10 }).notNull(),
  seatLabel: varchar('seat_label', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // "available" | "reserved" | "sold"
  reservedBy: uuid('reserved_by').references(() => users.id),
  reservedUntil: timestamp('reserved_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * SQL de referência para a constraint UNIQUE(session_id, row, number):
 *
 * ALTER TABLE seats
 * ADD CONSTRAINT seats_session_row_number_unique
 * UNIQUE (session_id, row, number);
 */

