/**
 * Database schema definitions using Drizzle ORM
 * Defines all tables and relationships for the Riviera Ticket system
 */

import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum, index, uniqueIndex, doublePrecision, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const seatTypeEnum = pgEnum('seat_type', ['STANDARD', 'VIP', 'PREMIUM', 'WHEELCHAIR', 'GAP'])
export const seatStatusEnum = pgEnum('seat_status', ['AVAILABLE', 'HELD', 'SOLD'])
export const ticketStatusEnum = pgEnum('ticket_status', ['RESERVED', 'CONFIRMED', 'CANCELLED'])
export const cartStatusEnum = pgEnum('cart_status', ['ACTIVE', 'EXPIRED', 'COMPLETED'])
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])
export const screenTypeEnum = pgEnum('screen_type', ['IMAX_70MM', 'STANDARD'])
export const sessionSalesStatusEnum = pgEnum('session_sales_status', ['ACTIVE', 'PAUSED', 'CLOSED'])
export const auditoriumTypeEnum = pgEnum('auditorium_type', ['IMAX', 'NORMAL'])
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'SUPER_ADMIN'])
export const assetSlotEnum = pgEnum('asset_slot', ['HOME_HERO', 'POSTER', 'CINEMA_COVER', 'AUDITORIUM_IMAGE'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  hashedPassword: text('hashed_password'),
  encryptedSsn: text('encrypted_ssn'),
  ssnHash: text('ssn_hash'),
  emailVerified: boolean('email_verified').default(false),
  role: text('role').notNull().default('USER'), // USER, ADMIN, SUPER_ADMIN
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
}))

// Sessions table (for movie sessions)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieTitle: text('movie_title').notNull(),
  movieDuration: integer('movie_duration').notNull(), // in minutes
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  cinemaName: text('cinema_name').notNull(),
  cinemaId: text('cinema_id').references(() => cinemas.id),
  auditoriumId: uuid('auditorium_id').references(() => auditoriums.id),
  screenType: screenTypeEnum('screen_type').notNull().default('IMAX_70MM'),
  totalSeats: integer('total_seats').notNull(),
  availableSeats: integer('available_seats').notNull(),
  basePrice: integer('base_price').notNull(), // in cents
  vipPrice: integer('vip_price').notNull(), // in cents
  salesStatus: sessionSalesStatusEnum('sales_status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  auditoriumIdIdx: index('idx_sessions_auditorium_id').on(table.auditoriumId),
  startTimeIdx: index('idx_sessions_start_time').on(table.startTime),
  salesStatusIdx: index('idx_sessions_sales_status').on(table.salesStatus),
}))

// Price rules table
export const priceRules = pgTable('price_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  cinemaId: text('cinema_id').references(() => cinemas.id),
  auditoriumId: uuid('auditorium_id').references(() => auditoriums.id),
  sessionId: uuid('session_id').references(() => sessions.id),
  daysOfWeek: integer('days_of_week').array(),
  startMinute: integer('start_minute'),
  endMinute: integer('end_minute'),
  priceCents: integer('price_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  priorityIdx: index('idx_price_rules_priority').on(table.priority),
  cinemaIdx: index('idx_price_rules_cinema_id').on(table.cinemaId),
  auditoriumIdx: index('idx_price_rules_auditorium_id').on(table.auditoriumId),
  sessionIdx: index('idx_price_rules_session_id').on(table.sessionId),
  activeIdx: index('idx_price_rules_active').on(table.isActive),
}))

// Seats table
export const seats = pgTable('seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  row: text('row').notNull(),
  number: integer('number').notNull(),
  seatId: text('seat_id').notNull(), // e.g., "A1", "B12"
  status: seatStatusEnum('status').notNull().default('AVAILABLE'),
  heldUntil: timestamp('held_until'),
  heldBy: uuid('held_by').references(() => users.id),
  heldByCartId: uuid('held_by_cart_id'),
  soldAt: timestamp('sold_at'),
  soldCartId: uuid('sold_cart_id'),
  isAvailable: boolean('is_available').default(true).notNull(),
  isReserved: boolean('is_reserved').default(false).notNull(),
  reservedBy: uuid('reserved_by').references(() => users.id),
  reservedUntil: timestamp('reserved_until'),
  type: seatTypeEnum('type').notNull().default('STANDARD'),
  price: integer('price').notNull(), // in cents
  version: integer('version').default(1).notNull(), // Para lock otimista
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_seats_session_id').on(table.sessionId),
  sessionSeatIdx: index('idx_seats_session_seat').on(table.sessionId, table.seatId),
  sessionStatusHeldIdx: index('idx_seats_session_status_held_until').on(table.sessionId, table.status, table.heldUntil),
  statusIdx: index('idx_seats_status').on(table.status),
  heldUntilIdx: index('idx_seats_held_until').on(table.heldUntil),
  heldByCartIdx: index('idx_seats_held_by_cart').on(table.heldByCartId),
  soldCartIdx: index('idx_seats_sold_cart').on(table.soldCartId),
  soldAtIdx: index('idx_seats_sold_at').on(table.soldAt),
  reservedUntilIdx: index('idx_seats_reserved_until').on(table.reservedUntil),
  availableIdx: index('idx_seats_available').on(table.sessionId, table.isAvailable, table.isReserved),
}))

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
}, (table) => ({
  userIdIdx: index('idx_carts_user_id').on(table.userId),
  sessionIdIdx: index('idx_carts_session_id').on(table.sessionId),
  statusIdx: index('idx_carts_status').on(table.status),
  expiresAtIdx: index('idx_carts_expires_at').on(table.expiresAt),
}))

// Cart items table (seats in cart)
export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  seatId: uuid('seat_id').references(() => seats.id, { onDelete: 'cascade' }).notNull(),
  price: integer('price').notNull(), // in cents (snapshot of price at time of adding)
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Cinemas table
export const cinemas = pgTable('cinemas', {
  id: text('id').primaryKey(), // ex: "amc-lincoln-square"
  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  country: text('country').notNull(),
  isIMAX: boolean('is_imax').notNull(),
  format: text('format'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  address: text('address'),
  zipCode: text('zip_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Auditorium layout type for JSONB column
export type AuditoriumLayout = {
  rowsConfig: { row: string; seatCount: number }[]
  accessible?: { row: string; seats: number[] }[]
  vipZones?: { rows: string[]; fromPercent: number; toPercent: number }[]
}

// Auditoriums table (salas dentro de cada cinema)
export const auditoriums = pgTable('auditoriums', {
  id: uuid('id').primaryKey().defaultRandom(),
  cinemaId: text('cinema_id')
    .notNull()
    .references(() => cinemas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: auditoriumTypeEnum('type').notNull().default('NORMAL'),
  format: text('format'), // ex: "IMAX 70mm", "IMAX Digital"
  layout: jsonb('layout').$type<AuditoriumLayout>().notNull(),
  seatMapConfig: jsonb('seat_map_config').$type<AuditoriumLayout>(),
  totalSeats: integer('total_seats').notNull(),
  capacity: integer('capacity').notNull().default(0),
  approxCapacity: integer('approx_capacity'),
  imageAssetId: uuid('image_asset_id').references(() => assets.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cinemaIdIdx: index('idx_auditoriums_cinema_id').on(table.cinemaId),
  typeIdx: index('idx_auditoriums_type').on(table.type),
  imageAssetIdx: index('idx_auditoriums_image_asset_id').on(table.imageAssetId),
}))

// Assets table (uploaded images)
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: text('file_name').notNull(),
  originalName: text('original_name'),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  title: text('title'),
  alt: text('alt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  urlIdx: index('idx_assets_url').on(table.url),
  mimeIdx: index('idx_assets_mime').on(table.mimeType),
}))

// Image slots table (mapping slots to assets)
export const imageSlots = pgTable('image_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  slot: assetSlotEnum('slot').notNull(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
  cinemaId: text('cinema_id').references(() => cinemas.id),
  auditoriumId: uuid('auditorium_id').references(() => auditoriums.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slotIdx: index('idx_image_slots_slot').on(table.slot),
  assetIdx: index('idx_image_slots_asset').on(table.assetId),
  scopeIdx: uniqueIndex('uq_image_slots_scope').on(
    table.slot,
    table.cinemaId,
    table.auditoriumId
  ),
}))

// Tickets table
export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seatId: uuid('seat_id').references(() => seats.id, { onDelete: 'cascade' }).notNull(),
  cartId: uuid('cart_id').references(() => carts.id),
  orderId: uuid('order_id'), // Referência para a tabela orders
  ticketType: seatTypeEnum('ticket_type').notNull(),
  price: integer('price').notNull(), // in cents
  status: ticketStatusEnum('status').notNull().default('RESERVED'),
  qrCode: text('qr_code'),
  barcodePath: text('barcode_path'),
  barcodeBlurredPath: text('barcode_blurred_path'),
  barcodeRevealedAt: timestamp('barcode_revealed_at'),
  barcodeData: text('barcode_data'),
  purchaseDate: timestamp('purchase_date').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_tickets_session_id').on(table.sessionId),
  userIdIdx: index('idx_tickets_user_id').on(table.userId),
  seatIdIdx: index('idx_tickets_seat_id').on(table.seatId),
  statusIdx: index('idx_tickets_status').on(table.status),
  orderIdIdx: index('idx_tickets_order_id').on(table.orderId),
  sessionSeatIdx: uniqueIndex('uq_tickets_session_seat').on(table.sessionId, table.seatId),
}))

// Payment intents table (Stripe integration)
export const paymentIntents = pgTable('payment_intents', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  adyenPaymentId: text('adyen_payment_id'), // Adyen payment reference
  amountCents: integer('amount').notNull(), // in cents
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

export const assetsRelations = relations(assets, ({ many }) => ({
  imageSlots: many(imageSlots),
}))

export const imageSlotsRelations = relations(imageSlots, ({ one }) => ({
  asset: one(assets, {
    fields: [imageSlots.assetId],
    references: [assets.id],
  }),
  cinema: one(cinemas, {
    fields: [imageSlots.cinemaId],
    references: [cinemas.id],
  }),
  auditorium: one(auditoriums, {
    fields: [imageSlots.auditoriumId],
    references: [auditoriums.id],
  }),
}))

// Types for easier usage
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type PriceRule = typeof priceRules.$inferSelect
export type NewPriceRule = typeof priceRules.$inferInsert
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
export type Auditorium = typeof auditoriums.$inferSelect
export type NewAuditorium = typeof auditoriums.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type ImageSlot = typeof imageSlots.$inferSelect
export type NewImageSlot = typeof imageSlots.$inferInsert

// Email verifications table
export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  code: text('code').notNull(), // 5 digit code
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: index('idx_email_verifications_email').on(table.email),
    expiresIdx: index('idx_email_verifications_expires').on(table.expiresAt),
  }
})

export type EmailVerification = typeof emailVerifications.$inferSelect
export type NewEmailVerification = typeof emailVerifications.$inferInsert

// Webhook logs table (para registrar webhooks enviados para APIs externas)
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(), // URL do webhook
  endpoint: text('endpoint').notNull(), // 'cadastro' ou 'notificacao'
  payload: text('payload').notNull(), // JSON do payload enviado
  responseStatus: integer('response_status'), // Status HTTP da resposta
  responseBody: text('response_body'), // Corpo da resposta
  success: boolean('success').default(false).notNull(),
  error: text('error'), // Mensagem de erro se houver
  userId: uuid('user_id').references(() => users.id), // Usuário relacionado
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('idx_webhook_logs_user_id').on(table.userId),
    endpointIdx: index('idx_webhook_logs_endpoint').on(table.endpoint),
    createdAtIdx: index('idx_webhook_logs_created_at').on(table.createdAt),
  }
})

export type WebhookLog = typeof webhookLogs.$inferSelect
export type NewWebhookLog = typeof webhookLogs.$inferInsert
