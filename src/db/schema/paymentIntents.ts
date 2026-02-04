// LEGACY SCHEMA (deprecated)
// Use '@/db/schema' as the single source of truth. Do not import from this file.

import { pgTable, uuid, varchar, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { orders } from './orders'

export const paymentIntents = pgTable(
  'payment_intents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(), // "stripe", "manual", etc.
    amount: integer('amount').notNull(), // em centavos
    currency: varchar('currency', { length: 10 }).notNull().default('brl'),
    status: varchar('status', { length: 50 }).notNull(), // "requires_payment_method" | "requires_action" | "processing" | "succeeded" | "canceled"
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orderUnique: uniqueIndex('payment_intents_order_id_unique').on(table.orderId),
  }),
)


