import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { sessions } from './sessions'

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  totalAmount: integer('total_amount').notNull(), // em centavos
  currency: varchar('currency', { length: 10 }).notNull().default('brl'),
  status: varchar('status', { length: 50 }).notNull(), // "pending" | "waiting_payment" | "paid" | "canceled" | "refunded"
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

