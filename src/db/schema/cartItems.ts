import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { carts } from './carts'
import { seats } from './seats'

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    seatId: uuid('seat_id')
      .notNull()
      .references(() => seats.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    cartSeatUnique: uniqueIndex('cart_items_cart_id_seat_id_unique').on(
      table.cartId,
      table.seatId,
    ),
  }),
)

