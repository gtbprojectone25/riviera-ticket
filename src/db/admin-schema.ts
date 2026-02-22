/**
 * Admin Schema - RBAC e Entidades Administrativas
 * Riviera Ticket - Painel Admin
 */

import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users, sessions, carts, cinemas, queueStatusEnum } from './schema'

// ============================================
// ENUMS
// ============================================

export const adminRoleEnum = pgEnum('admin_role', ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT'])
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'WAITING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED'
])
export { queueStatusEnum }
export const promotionTypeEnum = pgEnum('promotion_type', ['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y'])

// ============================================
// ADMIN USERS (separado de users normais)
// ============================================

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  hashedPassword: text('hashed_password').notNull(),
  role: adminRoleEnum('role').notNull().default('SUPPORT'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_admin_users_email').on(table.email),
  roleIdx: index('idx_admin_users_role').on(table.role),
}))

// ============================================
// ADMIN SESSIONS (tokens de sessão)
// ============================================

export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  adminIdIdx: index('idx_admin_sessions_admin_id').on(table.adminId),
  tokenIdx: index('idx_admin_sessions_token').on(table.token),
}))

// ============================================
// PERMISSIONS (granular)
// ============================================

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // ex: 'cinema.create', 'order.refund'
  name: text('name').notNull(),
  description: text('description'),
  module: text('module').notNull(), // ex: 'cinemas', 'orders', 'reports'
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: adminRoleEnum('role').notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roleIdx: index('idx_role_permissions_role').on(table.role),
}))

// ============================================
// CITIES (Cidades)
// ============================================

export const cities = pgTable('cities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  state: text('state').notNull(),
  country: text('country').notNull().default('BR'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_cities_name').on(table.name),
  stateIdx: index('idx_cities_state').on(table.state),
}))

// ============================================
// ORDERS (Pedidos - separado de carts)
// ============================================

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(), // ex: "RIV-20241209-0001"
  userId: uuid('user_id').references(() => users.id),
  cartId: uuid('cart_id').references(() => carts.id),
  sessionId: uuid('session_id').references(() => sessions.id),
  cinemaId: text('cinema_id').references(() => cinemas.id),
  
  // Valores
  subtotal: integer('subtotal').notNull(), // em centavos
  discount: integer('discount').default(0).notNull(),
  serviceFee: integer('service_fee').default(0).notNull(),
  total: integer('total').notNull(),
  
  // Status
  status: orderStatusEnum('status').notNull().default('PENDING'),
  
  // Pagamento
  paymentMethod: text('payment_method'), // 'stripe', 'pix', etc
  paymentReference: text('payment_reference'), // stripe payment intent id
  checkoutSessionId: text('checkout_session_id'),
  paidAt: timestamp('paid_at'),
  
  // Metadata
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  cancelledAt: timestamp('cancelled_at'),
  refundedAt: timestamp('refunded_at'),
}, (table) => ({
  orderNumberIdx: index('idx_orders_order_number').on(table.orderNumber),
  userIdIdx: index('idx_orders_user_id').on(table.userId),
  sessionIdIdx: index('idx_orders_session_id').on(table.sessionId),
  statusIdx: index('idx_orders_status').on(table.status),
  checkoutSessionIdx: index('idx_orders_checkout_session_id').on(table.checkoutSessionId),
  checkoutSessionUnique: uniqueIndex('uq_orders_checkout_session_id')
    .on(table.checkoutSessionId)
    .where(sql`${table.checkoutSessionId} is not null`),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
}))

// ============================================
// WAITLIST (Fila de Espera)
// ============================================

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  requestedSeats: integer('requested_seats').notNull().default(1),
  status: queueStatusEnum('status').notNull().default('WAITING'),
  notifiedAt: timestamp('notified_at'),
  expiredAt: timestamp('expired_at'),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_waitlist_session_id').on(table.sessionId),
  statusIdx: index('idx_waitlist_status').on(table.status),
  positionIdx: index('idx_waitlist_position').on(table.position),
}))

// ============================================
// TICKET CATEGORIES (Categorias de Ingresso)
// ============================================

export const ticketCategories = pgTable('ticket_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // "Inteira", "Meia-Entrada", "VIP", "Estudante"
  code: text('code').notNull().unique(), // "FULL", "HALF", "VIP", "STUDENT"
  discountPercent: integer('discount_percent').default(0).notNull(), // 0, 50, etc
  requiresDocument: boolean('requires_document').default(false).notNull(),
  documentType: text('document_type'), // "Carteira de Estudante", "ID Jovem"
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ============================================
// PROMOTIONS (Promoções)
// ============================================

export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique(), // código promocional (opcional)
  type: promotionTypeEnum('type').notNull(),
  value: integer('value').notNull(), // percentual ou valor em centavos
  
  // Escopo
  appliesToAllCinemas: boolean('applies_to_all_cinemas').default(true).notNull(),
  appliesToAllMovies: boolean('applies_to_all_movies').default(true).notNull(),
  
  // Limites
  minPurchaseAmount: integer('min_purchase_amount'),
  maxDiscount: integer('max_discount'),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').default(0).notNull(),
  usageLimitPerUser: integer('usage_limit_per_user'),
  
  // Validade
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('idx_promotions_code').on(table.code),
  startsAtIdx: index('idx_promotions_starts_at').on(table.startsAt),
  endsAtIdx: index('idx_promotions_ends_at').on(table.endsAt),
}))

// Cinemas/Filmes específicos para promoções
export const promotionCinemas = pgTable('promotion_cinemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  promotionId: uuid('promotion_id').references(() => promotions.id, { onDelete: 'cascade' }).notNull(),
  cinemaId: text('cinema_id').references(() => cinemas.id, { onDelete: 'cascade' }).notNull(),
})

// ============================================
// AUDIT LOG (Log de ações admin)
// ============================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => adminUsers.id),
  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'REFUND', etc
  entity: text('entity').notNull(), // 'cinema', 'session', 'order', etc
  entityId: text('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  adminIdIdx: index('idx_audit_logs_admin_id').on(table.adminId),
  entityIdx: index('idx_audit_logs_entity').on(table.entity),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}))

// ============================================
// RELATIONS
// ============================================

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
  auditLogs: many(auditLogs),
}))

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [adminSessions.adminId],
    references: [adminUsers.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [auditLogs.adminId],
    references: [adminUsers.id],
  }),
}))

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  cart: one(carts, { fields: [orders.cartId], references: [carts.id] }),
  session: one(sessions, { fields: [orders.sessionId], references: [sessions.id] }),
  cinema: one(cinemas, { fields: [orders.cinemaId], references: [cinemas.id] }),
}))

export const waitlistRelations = relations(waitlist, ({ one }) => ({
  session: one(sessions, { fields: [waitlist.sessionId], references: [sessions.id] }),
  user: one(users, { fields: [waitlist.userId], references: [users.id] }),
}))

export const promotionsRelations = relations(promotions, ({ many }) => ({
  promotionCinemas: many(promotionCinemas, { relationName: 'promotionCinemasPromotion' }),
}))

export const promotionCinemasRelations = relations(promotionCinemas, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionCinemas.promotionId],
    references: [promotions.id],
    relationName: 'promotionCinemasPromotion',
  }),
  cinema: one(cinemas, {
    fields: [promotionCinemas.cinemaId],
    references: [cinemas.id],
    relationName: 'promotionCinemasCinema',
  }),
}))

export const cinemasRelations = relations(cinemas, ({ many }) => ({
  promotionCinemas: many(promotionCinemas, { relationName: 'promotionCinemasCinema' }),
}))

// ============================================
// TYPES
// ============================================

export type AdminUser = typeof adminUsers.$inferSelect
export type NewAdminUser = typeof adminUsers.$inferInsert
export type AdminSession = typeof adminSessions.$inferSelect
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type WaitlistEntry = typeof waitlist.$inferSelect
export type TicketCategory = typeof ticketCategories.$inferSelect
export type Promotion = typeof promotions.$inferSelect
export type City = typeof cities.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
