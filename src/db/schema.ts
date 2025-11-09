/**
 * Database schema definitions using Drizzle ORM
 * Defines all tables and relationships for the Riviera Ticket system
 */

import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const seatTypeEnum = pgEnum('seat_type', ['STANDARD', 'VIP', 'PREMIUM'])
export const ticketStatusEnum = pgEnum('ticket_status', ['RESERVED', 'CONFIRMED', 'CANCELLED'])
export const cartStatusEnum = pgEnum('cart_status', ['ACTIVE', 'EXPIRED', 'COMPLETED'])
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])
export const screenTypeEnum = pgEnum('screen_type', ['IMAX_70MM', 'STANDARD'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  hashedPassword: text('hashed_password'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Sessions table (for movie sessions)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieTitle: text('movie_title').notNull(),
  movieDuration: integer('movie_duration').notNull(), // in minutes
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  cinemaName: text('cinema_name').notNull(),
  screenType: screenTypeEnum('screen_type').notNull().default('IMAX_70MM'),
  totalSeats: integer('total_seats').notNull(),
  availableSeats: integer('available_seats').notNull(),
  basePrice: integer('base_price').notNull(), // in cents
  vipPrice: integer('vip_price').notNull(), // in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Seats table
export const seats = pgTable('seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  row: text('row').notNull(),
  number: integer('number').notNull(),
  seatId: text('seat_id').notNull(), // e.g., "A1", "B12"
  isAvailable: boolean('is_available').default(true).notNull(),
  isReserved: boolean('is_reserved').default(false).notNull(),
  reservedBy: uuid('reserved_by').references(() => users.id),
  reservedUntil: timestamp('reserved_until'),
  type: seatTypeEnum('type').notNull().default('STANDARD'),
  price: integer('price').notNull(), // in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Carts table
export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  totalAmount: integer('total_amount').notNull().default(0), // in cents
  status: cartStatusEnum('status').notNull().default('ACTIVE'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Cart items table (seats in cart)
export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  seatId: uuid('seat_id').references(() => seats.id, { onDelete: 'cascade' }).notNull(),
  price: integer('price').notNull(), // in cents (snapshot of price at time of adding)
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tickets table
export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seatId: uuid('seat_id').references(() => seats.id, { onDelete: 'cascade' }).notNull(),
  cartId: uuid('cart_id').references(() => carts.id),
  ticketType: seatTypeEnum('ticket_type').notNull(),
  price: integer('price').notNull(), // in cents
  status: ticketStatusEnum('status').notNull().default('RESERVED'),
  qrCode: text('qr_code'),
  purchaseDate: timestamp('purchase_date').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Payment intents table (Stripe integration)
export const paymentIntents = pgTable('payment_intents', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').notNull().default('usd'),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// User sessions table (authentication)
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Movie information table
export const movies = pgTable('movies', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  releaseDate: text('release_date').notNull(),
  duration: integer('duration').notNull(), // in minutes
  genre: text('genre').array(),
  director: text('director').notNull(),
  cast: text('cast').array(),
  synopsis: text('synopsis').notNull(),
  posterUrl: text('poster_url'),
  trailerUrl: text('trailer_url'),
  imaxFormat: text('imax_format').default('70MM'),
  imaxExperience: text('imax_experience'),
  imaxBenefits: text('imax_benefits').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets),
  carts: many(carts),
  userSessions: many(userSessions),
  reservedSeats: many(seats),
  paymentIntents: many(paymentIntents),
}))

export const sessionsRelations = relations(sessions, ({ many }) => ({
  seats: many(seats),
  tickets: many(tickets),
  carts: many(carts),
}))

export const seatsRelations = relations(seats, ({ one, many }) => ({
  session: one(sessions, {
    fields: [seats.sessionId],
    references: [sessions.id],
  }),
  reservedBy: one(users, {
    fields: [seats.reservedBy],
    references: [users.id],
  }),
  tickets: many(tickets),
  cartItems: many(cartItems),
}))

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [carts.sessionId],
    references: [sessions.id],
  }),
  items: many(cartItems),
  tickets: many(tickets),
  paymentIntents: many(paymentIntents),
}))

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  seat: one(seats, {
    fields: [cartItems.seatId],
    references: [seats.id],
  }),
}))

export const ticketsRelations = relations(tickets, ({ one }) => ({
  session: one(sessions, {
    fields: [tickets.sessionId],
    references: [sessions.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  seat: one(seats, {
    fields: [tickets.seatId],
    references: [seats.id],
  }),
  cart: one(carts, {
    fields: [tickets.cartId],
    references: [carts.id],
  }),
}))

export const paymentIntentsRelations = relations(paymentIntents, ({ one }) => ({
  cart: one(carts, {
    fields: [paymentIntents.cartId],
    references: [carts.id],
  }),
  user: one(users, {
    fields: [paymentIntents.userId],
    references: [users.id],
  }),
}))

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}))

// Types for easier usage
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Seat = typeof seats.$inferSelect
export type NewSeat = typeof seats.$inferInsert
export type Cart = typeof carts.$inferSelect
export type NewCart = typeof carts.$inferInsert
export type CartItem = typeof cartItems.$inferSelect
export type NewCartItem = typeof cartItems.$inferInsert
export type Ticket = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
export type PaymentIntent = typeof paymentIntents.$inferSelect
export type NewPaymentIntent = typeof paymentIntents.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert
export type Movie = typeof movies.$inferSelect
export type NewMovie = typeof movies.$inferInsert