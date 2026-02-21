/**
 * Database query functions
 * Reusable database operations for the Riviera Ticket system
 */

import { eq, and, gte, gt, lte, lt, ne, desc, asc, or, inArray, isNull, sql } from 'drizzle-orm'
import { db } from './index'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'
import type { 
  NewUser, 
  NewSession, 
  NewPriceRule,
  NewCart, 
  NewTicket,
  NewPaymentIntent,
  NewAuditorium
} from './schema'
import {
  users,
  cinemas,
  sessions,
  auditoriums,
  priceRules,
  seats,
  carts,
  cartItems,
  tickets,
  paymentIntents,
  queueCounters,
  queueEntries,
} from './schema'

type DbClient = typeof db
type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbInstance = DbClient | DbTransaction

// User operations
export async function createUser(userData: NewUser) {
  const [user] = await db.insert(users).values(userData).returning()
  return user
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  return user || null
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id))
  return user || null
}

// Session operations
export async function getAllSessions() {
  return await db
    .select()
    .from(sessions)
    .orderBy(asc(sessions.startTime))
}

export async function getSessionById(id: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id))
  return session || null
}

export async function findSessionConflict(params: {
  auditoriumId: string
  startTime: Date
  endTime: Date
  excludeSessionId?: string
}) {
  const [conflict] = await db
    .select({
      id: sessions.id,
      startTime: sessions.startTime,
      endTime: sessions.endTime,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.auditoriumId, params.auditoriumId),
        lt(sessions.startTime, params.endTime),
        gt(sessions.endTime, params.startTime),
        params.excludeSessionId ? ne(sessions.id, params.excludeSessionId) : undefined,
      ),
    )
    .limit(1)

  return conflict || null
}

export async function createSession(sessionData: NewSession) {
  const [session] = await db.insert(sessions).values(sessionData).returning()
  return session
}

export async function getSeatCountForSession(sessionId: string, client: DbInstance = db) {
  const [row] = await client
    .select({ count: sql<number>`count(*)` })
    .from(seats)
    .where(eq(seats.sessionId, sessionId))
    .limit(1)
  return Number(row?.count ?? 0)
}

// Price rule operations
export async function getPriceRuleById(id: string) {
  const [rule] = await db
    .select()
    .from(priceRules)
    .where(eq(priceRules.id, id))
  return rule || null
}

export async function createPriceRule(ruleData: NewPriceRule) {
  const [rule] = await db.insert(priceRules).values(ruleData).returning()
  return rule
}

export async function updatePriceRule(id: string, updates: Partial<NewPriceRule>) {
  const [rule] = await db
    .update(priceRules)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(priceRules.id, id))
    .returning()
  return rule || null
}

export async function deletePriceRule(id: string) {
  const [rule] = await db
    .delete(priceRules)
    .where(eq(priceRules.id, id))
    .returning()
  return rule || null
}

type PriceRuleMatchParams = {
  amountCents: number
  sessionId?: string | null
  auditoriumId?: string | null
  cinemaId?: string | null
  startTime?: Date | null
}

function matchesTimeWindow(rule: {
  daysOfWeek: number[] | null
  startMinute: number | null
  endMinute: number | null
}, startTime: Date | null) {
  if (!startTime) {
    return !rule.daysOfWeek && rule.startMinute === null && rule.endMinute === null
  }

  const day = startTime.getDay()
  const minute = startTime.getHours() * 60 + startTime.getMinutes()

  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(day)) {
    return false
  }

  if (rule.startMinute === null && rule.endMinute === null) {
    return true
  }

  const start = rule.startMinute ?? 0
  const end = rule.endMinute ?? 1439

  if (start <= end) {
    return minute >= start && minute <= end
  }

  return minute >= start || minute <= end
}

function ruleSpecificity(rule: {
  cinemaId: string | null
  auditoriumId: string | null
  sessionId: string | null
  daysOfWeek: number[] | null
  startMinute: number | null
  endMinute: number | null
}) {
  let score = 0
  if (rule.cinemaId) score += 1
  if (rule.auditoriumId) score += 1
  if (rule.sessionId) score += 1
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) score += 1
  if (rule.startMinute !== null || rule.endMinute !== null) score += 1
  return score
}

export async function calculateFinalPrice(params: PriceRuleMatchParams) {
  const rules = await db
    .select()
    .from(priceRules)
    .where(and(
      eq(priceRules.isActive, true),
      params.cinemaId
        ? or(isNull(priceRules.cinemaId), eq(priceRules.cinemaId, params.cinemaId))
        : isNull(priceRules.cinemaId),
      params.auditoriumId
        ? or(isNull(priceRules.auditoriumId), eq(priceRules.auditoriumId, params.auditoriumId))
        : isNull(priceRules.auditoriumId),
      params.sessionId
        ? or(isNull(priceRules.sessionId), eq(priceRules.sessionId, params.sessionId))
        : isNull(priceRules.sessionId),
    ))

  const candidates = rules.filter((rule) => matchesTimeWindow({
    daysOfWeek: rule.daysOfWeek ?? null,
    startMinute: rule.startMinute ?? null,
    endMinute: rule.endMinute ?? null,
  }, params.startTime ?? null))

  if (candidates.length === 0) {
    return {
      amountCents: params.amountCents,
      rule: null,
    }
  }

  const sorted = candidates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    const specificityA = ruleSpecificity(a)
    const specificityB = ruleSpecificity(b)
    if (specificityA !== specificityB) {
      return specificityB - specificityA
    }
    return (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0)
  })

  const winner = sorted[0]

  return {
    amountCents: winner.priceCents,
    rule: winner,
  }
}

type SalesDateFilter = {
  from?: Date
  to?: Date
}

export async function getSalesReport(filters: SalesDateFilter) {
  const conditions = [eq(tickets.status, 'CONFIRMED')]

  if (filters.from) {
    conditions.push(gte(tickets.createdAt, filters.from))
  }

  if (filters.to) {
    conditions.push(lte(tickets.createdAt, filters.to))
  }

  const revenueExpr = sql<number>`COALESCE(SUM(${tickets.price}), 0)`
  const countExpr = sql<number>`COUNT(${tickets.id})`
  const ordersExpr = sql<number>`COUNT(DISTINCT ${tickets.cartId})`

  const [summary] = await db
    .select({
      revenueCents: revenueExpr,
      ticketsSold: countExpr,
      ordersCount: ordersExpr,
    })
    .from(tickets)
    .where(and(...conditions))

  const revenueCents = Number(summary?.revenueCents || 0)
  const ticketsSold = Number(summary?.ticketsSold || 0)
  const ordersCount = Number(summary?.ordersCount || 0)
  const avgTicketCents = ticketsSold > 0 ? Math.round(revenueCents / ticketsSold) : 0

  const regionExpr = sql<string>`COALESCE(${cinemas.state}, 'UNKNOWN')`
  const countryExpr = sql<string>`COALESCE(${cinemas.country}, 'UNKNOWN')`
  const cityExpr = sql<string>`COALESCE(${cinemas.city}, 'UNKNOWN')`

  const salesByRegion = await db
    .select({
      region: regionExpr,
      country: countryExpr,
      revenueCents: revenueExpr,
      ticketsSold: countExpr,
    })
    .from(tickets)
    .innerJoin(sessions, eq(tickets.sessionId, sessions.id))
    .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
    .where(and(...conditions))
    .groupBy(regionExpr, countryExpr)
    .orderBy(desc(revenueExpr))

  const salesByCity = await db
    .select({
      city: cityExpr,
      state: regionExpr,
      revenueCents: revenueExpr,
      ticketsSold: countExpr,
    })
    .from(tickets)
    .innerJoin(sessions, eq(tickets.sessionId, sessions.id))
    .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
    .where(and(...conditions))
    .groupBy(cityExpr, regionExpr)
    .orderBy(desc(revenueExpr))

  const salesByCinema = await db
    .select({
      cinemaId: cinemas.id,
      cinemaName: cinemas.name,
      city: cinemas.city,
      state: cinemas.state,
      revenueCents: revenueExpr,
      ticketsSold: countExpr,
    })
    .from(tickets)
    .innerJoin(sessions, eq(tickets.sessionId, sessions.id))
    .innerJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
    .where(and(...conditions))
    .groupBy(cinemas.id, cinemas.name, cinemas.city, cinemas.state)
    .orderBy(desc(revenueExpr))

  const salesBySession = await db
    .select({
      sessionId: sessions.id,
      movieTitle: sessions.movieTitle,
      startTime: sessions.startTime,
      cinemaName: sessions.cinemaName,
      auditoriumName: auditoriums.name,
      revenueCents: revenueExpr,
      ticketsSold: countExpr,
    })
    .from(tickets)
    .innerJoin(sessions, eq(tickets.sessionId, sessions.id))
    .leftJoin(auditoriums, eq(sessions.auditoriumId, auditoriums.id))
    .where(and(...conditions))
    .groupBy(
      sessions.id,
      sessions.movieTitle,
      sessions.startTime,
      sessions.cinemaName,
      auditoriums.name,
    )
    .orderBy(desc(revenueExpr))

  const fullNameExpr = sql<string>`(${users.name} || ' ' || ${users.surname})`

  const salesByUser = await db
    .select({
      userId: users.id,
      name: fullNameExpr,
      email: users.email,
      revenueCents: revenueExpr,
      ticketsSold: countExpr,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.userId, users.id))
    .where(and(...conditions))
    .groupBy(users.id, users.name, users.surname, users.email)
    .orderBy(desc(revenueExpr))

  return {
    summary: {
      revenueCents,
      ticketsSold,
      ordersCount,
      avgTicketCents,
    },
    salesByRegion,
    salesByCity,
    salesByCinema,
    salesBySession,
    salesByUser,
  }
}

// Auditorium operations
export async function getAllAuditoriums() {
  return await db
    .select()
    .from(auditoriums)
    .orderBy(desc(auditoriums.createdAt))
}

export async function getAuditoriumById(id: string) {
  const [auditorium] = await db
    .select()
    .from(auditoriums)
    .where(eq(auditoriums.id, id))
  return auditorium || null
}

export async function createAuditorium(auditoriumData: NewAuditorium) {
  const [auditorium] = await db
    .insert(auditoriums)
    .values(auditoriumData)
    .returning()
  return auditorium
}

export async function updateAuditorium(id: string, updates: Partial<NewAuditorium>) {
  const [auditorium] = await db
    .update(auditoriums)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(auditoriums.id, id))
    .returning()
  return auditorium || null
}

export async function deleteAuditorium(id: string) {
  const [auditorium] = await db
    .delete(auditoriums)
    .where(eq(auditoriums.id, id))
    .returning()
  return auditorium || null
}

// Seat operations
export async function getAvailableSeats(sessionId: string) {
  const now = new Date()
  return await db
    .select()
    .from(seats)
    .where(
      and(
        eq(seats.sessionId, sessionId),
        or(
          eq(seats.status, 'AVAILABLE'),
          and(eq(seats.status, 'HELD'), lte(seats.heldUntil, now))
        )
      )
    )
    .orderBy(asc(seats.row), asc(seats.number))
}

export async function getSeatsBySession(sessionId: string) {
  return await db
    .select()
    .from(seats)
    .where(eq(seats.sessionId, sessionId))
    .orderBy(asc(seats.row), asc(seats.number))
}

export async function createSeatsForSession(sessionId: string) {
  await ensureSeatsForSession(sessionId)

  return await db
    .select()
    .from(seats)
    .where(eq(seats.sessionId, sessionId))
    .orderBy(asc(seats.row), asc(seats.number))
}

export async function reserveSeat(seatId: string, userId: string, expiresAt: Date) {
  const now = new Date()
  const [seat] = await db
    .update(seats)
    .set({
      status: 'HELD',
      heldUntil: expiresAt,
      heldBy: userId,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.id, seatId),
        or(
          eq(seats.status, 'AVAILABLE'),
          and(eq(seats.status, 'HELD'), lte(seats.heldUntil, now)),
          and(eq(seats.status, 'HELD'), eq(seats.heldBy, userId))
        )
      )
    )
    .returning()
  
  if (!seat) {
    throw new Error('SEAT_OCCUPIED')
  }

  return seat
}

type HoldSeatsResult = {
  heldSeatIds: string[]
  heldUntil: Date
}

async function holdSeatsInTx(
  tx: DbInstance,
  cart: { id: string; sessionId: string; userId: string | null },
  seatIds: string[],
  ttlMinutes: number,
): Promise<HoldSeatsResult> {
  const now = new Date()
  const heldUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000)
  const uniqueSeatIds = Array.from(new Set(seatIds))

  if (uniqueSeatIds.length === 0) {
    throw new Error('NO_SEATS')
  }

  // Primeiro libera holds expirados no mesmo lote de assentos dentro da transação.
  // Isso evita corrida entre "expirar" e "reservar".
  await releaseExpiredHolds(tx, {
    sessionId: cart.sessionId,
    seatIds: uniqueSeatIds,
  })

  const holdConditions = [
    eq(seats.status, 'AVAILABLE'),
    and(
      eq(seats.status, 'HELD'),
      lte(seats.heldUntil, now),
    ),
    and(
      eq(seats.status, 'HELD'),
      eq(seats.heldByCartId, cart.id),
      gt(seats.heldUntil, now),
    ),
  ]

  const heldSeats = await tx
    .update(seats)
    .set({
      status: 'HELD',
      heldUntil,
      heldBy: cart.userId,
      heldByCartId: cart.id,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.sessionId, cart.sessionId),
        inArray(seats.id, uniqueSeatIds),
        or(...holdConditions)
      )
    )
    .returning({ id: seats.id })

  if (heldSeats.length !== uniqueSeatIds.length) {
    throw new Error('SEAT_OCCUPIED')
  }

  await tx
    .update(carts)
    .set({ expiresAt: heldUntil, updatedAt: now })
    .where(eq(carts.id, cart.id))

  return {
    heldSeatIds: heldSeats.map((seat) => seat.id),
    heldUntil,
  }
}

export async function holdSeats(
  cartId: string,
  seatIds: string[],
  ttlMinutes = 10,
  tx?: DbInstance,
): Promise<HoldSeatsResult> {
  if (!tx) {
    try {
      return await db.transaction(async (transaction) =>
        holdSeats(cartId, seatIds, ttlMinutes, transaction),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!message.includes('No transactions support in neon-http driver')) {
        throw error
      }
      return await holdSeats(cartId, seatIds, ttlMinutes, db)
    }
  }

  const [cart] = await tx
    .select({ id: carts.id, sessionId: carts.sessionId, userId: carts.userId, status: carts.status })
    .from(carts)
    .where(eq(carts.id, cartId))
    .limit(1)

  if (!cart) {
    throw new Error('CART_NOT_FOUND')
  }

  if (cart.status !== 'ACTIVE') {
    throw new Error('CART_NOT_ACTIVE')
  }

  return await holdSeatsInTx(tx, cart, seatIds, ttlMinutes)
}

export async function releaseExpiredHolds(
  tx: DbInstance = db,
  filters?: { sessionId?: string; seatIds?: string[] },
) {
  const now = new Date()
  const conditions = [
    eq(seats.status, 'HELD'),
    or(lte(seats.heldUntil, now), isNull(seats.heldUntil)),
  ]

  if (filters?.sessionId) {
    conditions.push(eq(seats.sessionId, filters.sessionId))
  }

  if (filters?.seatIds && filters.seatIds.length > 0) {
    conditions.push(inArray(seats.id, filters.seatIds))
  }

  return await tx
    .update(seats)
    .set({
      status: 'AVAILABLE',
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning()
}

export async function releaseExpiredReservations() {
  return await releaseExpiredHolds()
}

// Cart operations
export async function createCart(cartData: NewCart) {
  const [cart] = await db.insert(carts).values(cartData).returning()
  return cart
}

export async function getCartById(id: string) {
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, id))
    
  if (!cart) return null
  
  const items = await db
    .select({
      id: cartItems.id,
      seatId: cartItems.seatId,
      price: cartItems.price,
      seat: seats,
    })
    .from(cartItems)
    .leftJoin(seats, eq(cartItems.seatId, seats.id))
    .where(eq(cartItems.cartId, id))
  
  return { ...cart, items }
}

export async function getActiveCartByUser(userId: string) {
  const [cart] = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.userId, userId),
        eq(carts.status, 'ACTIVE'),
        gte(carts.expiresAt, new Date())
      )
    )
    .orderBy(desc(carts.createdAt))
    
  return cart || null
}

export async function addItemToCart(cartId: string, seatId: string, price: number) {
  const [item] = await db
    .insert(cartItems)
    .values({ cartId, seatId, price })
    .onConflictDoNothing({
      target: [cartItems.cartId, cartItems.seatId],
    })
    .returning()
  
  // Update cart total
  await updateCartTotal(cartId)
  
  return item
}

export async function removeItemFromCart(cartId: string, seatId: string) {
  const [removed] = await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.seatId, seatId)
      )
    )
    .returning()
  
  // Update cart total
  await updateCartTotal(cartId)
  
  return removed
}

export async function updateCartTotal(cartId: string) {
  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId))
  
  const total = items.reduce((sum, item) => sum + item.price, 0)
  
  const [cart] = await db
    .update(carts)
    .set({ totalAmount: total, updatedAt: new Date() })
    .where(eq(carts.id, cartId))
    .returning()
  
  return cart
}

export async function expireCart(cartId: string) {
  const now = new Date()

  const [cart] = await db
    .update(carts)
    .set({ status: 'EXPIRED', updatedAt: now })
    .where(eq(carts.id, cartId))
    .returning()

  if (!cart) {
    return null
  }

  // Carrinho expirado deve liberar holds imediatamente.
  await db
    .update(seats)
    .set({
      status: 'AVAILABLE',
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.status, 'HELD'),
        eq(seats.heldByCartId, cartId),
      ),
    )

  return cart
}

// Ticket operations
export async function createTicket(ticketData: NewTicket) {
  const [ticket] = await db.insert(tickets).values(ticketData).returning()
  return ticket
}

export async function createTicketsFromCart(cartId: string) {
  const cart = await getCartById(cartId)
  if (!cart) throw new Error('Cart not found')
  
  const ticketsData: NewTicket[] = cart.items.map(item => ({
    sessionId: cart.sessionId,
    userId: cart.userId!,
    seatId: item.seatId,
    cartId: cart.id,
    ticketType: item.seat?.type || 'STANDARD',
    price: item.price,
    status: 'CONFIRMED',
    qrCode: `RIVIERA-${cart.id}-${item.seatId}`,
  }))
  
  const createdTickets = await db.insert(tickets).values(ticketsData).returning()
  
  // Mark seats as sold
  const seatIds = cart.items.map(item => item.seatId)
  const now = new Date()
  await db
    .update(seats)
    .set({ 
      status: 'SOLD',
      soldAt: now,
      soldCartId: cartId,
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(inArray(seats.id, seatIds))
  
  // Mark cart as completed
  await db
    .update(carts)
    .set({ status: 'COMPLETED', updatedAt: new Date() })
    .where(eq(carts.id, cartId))
  
  return createdTickets
}

export async function consumeSeatsAndCreateTickets(
  tx: DbInstance,
  params: {
    cartId: string
    userId?: string | null
    guestEmail?: string | null
  },
) {
  const now = new Date()

  const items = await tx
    .select({
      cartItem: cartItems,
      seat: seats,
    })
    .from(cartItems)
    .innerJoin(seats, eq(seats.id, cartItems.seatId))
    .where(eq(cartItems.cartId, params.cartId))

  if (items.length === 0) {
    throw new Error('NO_CART_ITEMS')
  }

  const seatIds = Array.from(new Set(items.map((item) => item.seat.id)))
  if (seatIds.length !== items.length) {
    throw new Error('DUPLICATE_SEAT')
  }

  const existingTickets = await tx
    .select()
    .from(tickets)
    .where(eq(tickets.cartId, params.cartId))

  if (existingTickets.length > 0) {
    return {
      tickets: existingTickets,
      items,
      alreadyProcessed: true,
      userId: params.userId ?? null,
      guestEmail: params.guestEmail ?? null,
    }
  }

  const resolvedUserId = params.userId ?? null
  let resolvedEmail = params.guestEmail ?? null

  if (!resolvedEmail) {
    resolvedEmail = null
  }

  const holdOwnerCondition = resolvedUserId
    ? or(
      eq(seats.heldByCartId, params.cartId),
      and(isNull(seats.heldByCartId), eq(seats.heldBy, resolvedUserId)),
    )
    : eq(seats.heldByCartId, params.cartId)

  // Permit converting:
  // - seats HELD by this cart (even if held_until expired) -> SOLD
  // - seats AVAILABLE -> SOLD
  const holdConditions = or(
    and(
      eq(seats.status, 'HELD'),
      holdOwnerCondition,
    ),
    eq(seats.status, 'AVAILABLE'),
  )

  const soldSeats = await tx
    .update(seats)
    .set({
      status: 'SOLD',
      soldAt: now,
      soldCartId: params.cartId,
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        inArray(seats.id, seatIds),
        holdConditions,
      )
    )
    .returning({ id: seats.id })

  if (soldSeats.length !== seatIds.length) {
    const soldSeatIds = new Set(soldSeats.map((seat) => seat.id))
    const missingSeatIds = seatIds.filter((seatId) => !soldSeatIds.has(seatId))

    const missingSeats = await tx
      .select({
        id: seats.id,
        status: seats.status,
        soldCartId: seats.soldCartId,
        heldByCartId: seats.heldByCartId,
        heldUntil: seats.heldUntil,
      })
      .from(seats)
      .where(inArray(seats.id, missingSeatIds))

    const alreadySoldBySameCart = missingSeats.filter(
      (s) => s.status === 'SOLD' && s.soldCartId === params.cartId,
    )

    if (alreadySoldBySameCart.length === missingSeatIds.length) {
      // Idempotent re-run; proceed.
    } else {
      const soldByOther = missingSeats.filter(
        (s) => s.status === 'SOLD' && s.soldCartId !== null && s.soldCartId !== params.cartId,
      )
      if (soldByOther.length > 0) {
        const error = new Error('SEAT_CONFLICT') as Error & { code?: string; details?: unknown }
        error.code = 'SEAT_CONFLICT'
        error.details = { seats: soldByOther.map((s) => s.id) }
        throw error
      }

      const heldByOthers = missingSeats.filter(
        (s) => s.status === 'HELD' && s.heldByCartId !== null && s.heldByCartId !== params.cartId,
      )
      if (heldByOthers.length > 0) {
        const error = new Error('SEAT_CONFLICT') as Error & { code?: string; details?: unknown }
        error.code = 'SEAT_CONFLICT'
        error.details = { seats: heldByOthers.map((s) => s.id) }
        throw error
      }

      // Unknown mismatch
      const error = new Error('SEAT_CONFLICT') as Error & { code?: string; details?: unknown }
      error.code = 'SEAT_CONFLICT'
      error.details = { seats: missingSeatIds }
      throw error
    }
  }

  const ticketsData: NewTicket[] = items.map((item) => ({
    sessionId: item.seat.sessionId,
    userId: resolvedUserId ?? null,
    seatId: item.seat.id,
    cartId: params.cartId,
    ticketType: item.seat.type,
    price: item.cartItem.price,
    status: 'CONFIRMED',
    purchaseDate: now,
  }))

  const createdTickets = await tx
    .insert(tickets)
    .values(ticketsData)
    .onConflictDoNothing()
    .returning()

  const finalTickets = createdTickets.length > 0
    ? createdTickets
    : await tx.select().from(tickets).where(eq(tickets.cartId, params.cartId))

  if (finalTickets.length !== seatIds.length) {
    throw new Error('TICKET_CONFLICT')
  }

  return {
    tickets: finalTickets,
    items,
    alreadyProcessed: false,
    userId: resolvedUserId,
    guestEmail: resolvedEmail,
  }
}

export async function releaseCartHolds(
  tx: DbInstance,
  params: {
    cartId: string
    userId?: string | null
  },
) {
  const now = new Date()

  const items = await tx
    .select({ seatId: cartItems.seatId })
    .from(cartItems)
    .where(eq(cartItems.cartId, params.cartId))

  if (items.length === 0) {
    return { releasedSeatIds: [] }
  }

  const seatIds = Array.from(new Set(items.map((item) => item.seatId)))

  const releaseConditions = [
    and(eq(seats.status, 'HELD'), eq(seats.heldByCartId, params.cartId)),
  ]

  if (params.userId) {
    releaseConditions.push(
      and(
        eq(seats.status, 'HELD'),
        isNull(seats.heldByCartId),
        eq(seats.heldBy, params.userId),
      ),
    )
  }

  const releasedSeats = await tx
    .update(seats)
    .set({
      status: 'AVAILABLE',
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      soldAt: null,
      soldCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        inArray(seats.id, seatIds),
        or(...releaseConditions),
      ),
    )
    .returning({ id: seats.id })

  return { releasedSeatIds: releasedSeats.map((seat) => seat.id) }
}

export async function getUserTickets(userId: string) {
  return await db
    .select({
      id: tickets.id,
      sessionId: tickets.sessionId,
      seatId: tickets.seatId,
      ticketType: tickets.ticketType,
      price: tickets.price,
      status: tickets.status,
      qrCode: tickets.qrCode,
      purchaseDate: tickets.purchaseDate,
      session: sessions,
      seat: seats,
    })
    .from(tickets)
    .leftJoin(sessions, eq(tickets.sessionId, sessions.id))
    .leftJoin(seats, eq(tickets.seatId, seats.id))
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.purchaseDate))
}

// Payment operations
export async function createPaymentIntent(paymentData: NewPaymentIntent) {
  const [paymentIntent] = await db.insert(paymentIntents).values(paymentData).returning()
  return paymentIntent
}

export async function updatePaymentIntent(id: string, updates: Partial<NewPaymentIntent>) {
  const [paymentIntent] = await db
    .update(paymentIntents)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(paymentIntents.id, id))
    .returning()
  
  return paymentIntent
}

export async function getPaymentIntentByStripeId(stripePaymentIntentId: string) {
  const [paymentIntent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.stripePaymentIntentId, stripePaymentIntentId))
  
  return paymentIntent || null
}

// Utility functions
export async function cleanupExpiredCarts() {
  const now = new Date()
  
  // Find expired carts
  const expiredCarts = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.status, 'ACTIVE'),
        lte(carts.expiresAt, now)
      )
    )
  
  // Expire carts and release holds linked to each expired cart.
  for (const cart of expiredCarts) {
    await expireCart(cart.id)
  }
  
  // Also release holds that expired by held_until timestamp.
  await releaseExpiredHolds()
  
  return expiredCarts.length
}

export async function getSessionStatistics(sessionId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId))
  if (!session) return null
  
  const allSeats = await db
    .select()
    .from(seats)
    .where(eq(seats.sessionId, sessionId))
  
  const soldTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.sessionId, sessionId),
        eq(tickets.status, 'CONFIRMED')
      )
    )
  
  const now = new Date()
  const reservedSeats = allSeats.filter(
    seat => seat.status === 'HELD' && seat.heldUntil && seat.heldUntil > now
  ).length
  const availableSeats = allSeats.filter(
    seat => seat.status === 'AVAILABLE' ||
      (seat.status === 'HELD' && (!seat.heldUntil || seat.heldUntil <= now))
  ).length
  
  return {
    session,
    totalSeats: allSeats.length,
    soldTickets: soldTickets.length,
    reservedSeats,
    availableSeats,
    revenue: soldTickets.reduce((sum, ticket) => sum + ticket.price, 0),
  }
}

type QueueAllocateResult = {
  entryId: string
  queueNumber: number
  initialQueueNumber: number
  peopleInQueue: number
  status: 'WAITING' | 'READY' | 'EXPIRED' | 'COMPLETED'
  expiresAt: Date
}

type QueueStatusResult = {
  status: 'WAITING' | 'READY' | 'EXPIRED' | 'COMPLETED'
  queueNumber: number
  scopeKey: string
  visitorToken: string
  peopleInQueue: number
  initialQueueNumber: number
  expiresAt: Date | null
  createdAt: Date
  progress: number
}

const QUEUE_TTL_MINUTES = 30
const QUEUE_RETENTION_HOURS = 24
const ACTIVE_QUEUE_TEXT_STATUSES = ['WAITING', 'READY', 'NOTIFIED']
// Current project enum uses READY as "your turn" status.
const QUEUE_READY_STATUS: QueueAllocateResult['status'] = 'READY'

function activeQueueStatusCondition() {
  return sql`(${queueEntries.status})::text in (${sql.raw(ACTIVE_QUEUE_TEXT_STATUSES.map((s) => `'${s}'`).join(','))})`
}

function devQueueLog(event: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return
  console.info(`[queue] ${event}`, data)
}

async function expireQueueEntries(scopeKey?: string) {
  const now = new Date()
  const conditions = [
    activeQueueStatusCondition(),
    lte(queueEntries.expiresAt, now),
  ]

  if (scopeKey) {
    conditions.push(eq(queueEntries.scopeKey, scopeKey))
  }

  await db
    .update(queueEntries)
    .set({ status: 'EXPIRED', updatedAt: now })
    .where(and(...conditions))
}

async function cleanupOldQueueEntries(scopeKey?: string) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - QUEUE_RETENTION_HOURS * 60 * 60 * 1000)
  const conditions = [
    inArray(queueEntries.status, ['EXPIRED', 'COMPLETED']),
    lt(queueEntries.updatedAt, cutoff),
  ]

  if (scopeKey) {
    conditions.push(eq(queueEntries.scopeKey, scopeKey))
  }

  await db
    .delete(queueEntries)
    .where(and(...conditions))
}

export async function bindActiveQueueEntryToCart(
  params: {
    scopeKey: string
    visitorToken: string
    cartId: string
    userId?: string | null
  },
  client: DbInstance = db,
) {
  const now = new Date()
  const [entry] = await client
    .select({
      id: queueEntries.id,
      userId: queueEntries.userId,
    })
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.scopeKey, params.scopeKey),
        eq(queueEntries.visitorToken, params.visitorToken),
        activeQueueStatusCondition(),
        or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
      ),
    )
    .orderBy(desc(queueEntries.createdAt))
    .limit(1)

  if (!entry) {
    return null
  }

  await client
    .update(queueEntries)
    .set({
      cartId: params.cartId,
      userId: params.userId ?? entry.userId ?? null,
      updatedAt: now,
    })
    .where(eq(queueEntries.id, entry.id))

  return entry.id
}

export async function completeQueueEntriesForCheckout(
  params: {
    scopeKey?: string
    cartId?: string | null
    visitorToken?: string | null
    userId?: string | null
  },
  client: DbInstance = db,
) {
  const now = new Date()
  const identityCandidates = [
    params.cartId ? eq(queueEntries.cartId, params.cartId) : undefined,
    params.visitorToken ? eq(queueEntries.visitorToken, params.visitorToken) : undefined,
    params.userId ? eq(queueEntries.userId, params.userId) : undefined,
  ].filter((condition): condition is Exclude<typeof condition, undefined> => Boolean(condition))

  const identityCondition = identityCandidates.length === 0
    ? undefined
    : identityCandidates.length === 1
      ? identityCandidates[0]
      : or(...identityCandidates)

  if (!identityCondition) {
    return 0
  }

  const conditions = [
    identityCondition,
    activeQueueStatusCondition(),
    or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
  ]

  if (params.scopeKey) {
    conditions.push(eq(queueEntries.scopeKey, params.scopeKey))
  }

  const updated = await client
    .update(queueEntries)
    .set({
      status: 'COMPLETED',
      expiresAt: now,
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning({ id: queueEntries.id })

  return updated.length
}

async function getActiveQueueCount(scopeKey: string, now: Date) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.scopeKey, scopeKey),
        activeQueueStatusCondition(),
        or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
      ),
    )
    .limit(1)

  return Number(row?.count ?? 0)
}

async function getQueueCumulativeCount(scopeKey: string, client: DbInstance = db) {
  const [counterRow] = await client
    .select({ nextNumber: queueCounters.nextNumber })
    .from(queueCounters)
    .where(eq(queueCounters.scopeKey, scopeKey))
    .limit(1)

  const cumulative = Number(counterRow?.nextNumber ?? 1) - 1
  return Math.max(0, cumulative)
}

export async function allocateQueueNumber(params: {
  scopeKey: string
  visitorToken: string
  userId?: string | null
  cartId?: string | null
}): Promise<QueueAllocateResult> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + QUEUE_TTL_MINUTES * 60 * 1000)
  await expireQueueEntries(params.scopeKey)
  await cleanupOldQueueEntries(params.scopeKey)

  const [existingEntry] = await db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.scopeKey, params.scopeKey),
        eq(queueEntries.visitorToken, params.visitorToken),
        activeQueueStatusCondition(),
        or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
      ),
    )
    .orderBy(desc(queueEntries.createdAt))
    .limit(1)

  if (existingEntry) {
    const activePeopleInQueue = await getActiveQueueCount(params.scopeKey, now)
    const cumulativePeopleInQueue = await getQueueCumulativeCount(params.scopeKey)
    const peopleInQueue = Math.max(activePeopleInQueue, cumulativePeopleInQueue, existingEntry.queueNumber)
    devQueueLog('join.reuse-active-entry', {
      scopeKey: params.scopeKey,
      visitorToken: params.visitorToken,
      queueNumber: existingEntry.queueNumber,
      peopleInQueue,
    })

    return {
      entryId: existingEntry.id,
      queueNumber: existingEntry.queueNumber,
      initialQueueNumber: existingEntry.queueNumber,
      peopleInQueue,
      status: existingEntry.status,
      expiresAt: existingEntry.expiresAt ?? expiresAt,
    }
  }

  const counterResult = await db.execute(sql<{ next_number: number }>`
    INSERT INTO queue_counters (scope_key, next_number, created_at, updated_at)
    VALUES (${params.scopeKey}, 2, now(), now())
    ON CONFLICT (scope_key)
    DO UPDATE SET next_number = queue_counters.next_number + 1, updated_at = now()
    RETURNING next_number
  `)

  const counterRow = counterResult?.rows?.[0]
  const nextNumber = Number(counterRow?.next_number ?? 1)
  const queueNumber = Math.max(1, nextNumber - 1)

  try {
    const [entry] = await db
      .insert(queueEntries)
      .values({
        scopeKey: params.scopeKey,
        visitorToken: params.visitorToken,
        userId: params.userId ?? null,
        cartId: params.cartId ?? null,
        queueNumber,
        status: 'WAITING',
        expiresAt,
        updatedAt: now,
      })
      .returning()

    const activePeopleInQueue = await getActiveQueueCount(params.scopeKey, now)
    const cumulativePeopleInQueue = await getQueueCumulativeCount(params.scopeKey)
    const peopleInQueue = Math.max(activePeopleInQueue, cumulativePeopleInQueue, queueNumber)
    devQueueLog('join.allocated-new-number', {
      scopeKey: params.scopeKey,
      visitorToken: params.visitorToken,
      queueNumber,
      peopleInQueue,
    })

    return {
      entryId: entry.id,
      queueNumber,
      initialQueueNumber: queueNumber,
      peopleInQueue,
      status: entry.status,
      expiresAt: entry.expiresAt ?? expiresAt,
    }
  } catch (error) {
    const pgError = error as { code?: string } | undefined
    if (pgError?.code !== '23505') {
      throw error
    }

    const [raceEntry] = await db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.scopeKey, params.scopeKey),
          eq(queueEntries.visitorToken, params.visitorToken),
          activeQueueStatusCondition(),
          or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
        ),
      )
      .orderBy(desc(queueEntries.createdAt))
      .limit(1)

    if (!raceEntry) {
      throw error
    }

    const activePeopleInQueue = await getActiveQueueCount(params.scopeKey, now)
    const cumulativePeopleInQueue = await getQueueCumulativeCount(params.scopeKey)
    const peopleInQueue = Math.max(activePeopleInQueue, cumulativePeopleInQueue, raceEntry.queueNumber)
    devQueueLog('join.recovered-after-unique-race', {
      scopeKey: params.scopeKey,
      visitorToken: params.visitorToken,
      queueNumber: raceEntry.queueNumber,
      peopleInQueue,
    })

    return {
      entryId: raceEntry.id,
      queueNumber: raceEntry.queueNumber,
      initialQueueNumber: raceEntry.queueNumber,
      peopleInQueue,
      status: raceEntry.status,
      expiresAt: raceEntry.expiresAt ?? expiresAt,
    }
  }
}

export async function getQueueStatus(entryId: string): Promise<QueueStatusResult | null> {
  const now = new Date()
  await expireQueueEntries()

  const [entry] = await db
    .select()
    .from(queueEntries)
    .where(eq(queueEntries.id, entryId))
    .limit(1)

  if (!entry) return null

  let status = entry.status
  const createdAt = entry.createdAt ?? now

  if (entry.expiresAt && entry.expiresAt < now) {
    if (status !== 'EXPIRED') {
      await db
        .update(queueEntries)
        .set({ status: 'EXPIRED', updatedAt: now })
        .where(eq(queueEntries.id, entryId))
      status = 'EXPIRED'
    }
  } else if (status !== 'COMPLETED') {
    const [positionRow] = await db
      .select({
        position: sql<number>`count(*)`,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.scopeKey, entry.scopeKey),
          activeQueueStatusCondition(),
          or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
          lte(queueEntries.queueNumber, entry.queueNumber),
        ),
      )
      .limit(1)

    const queuePosition = Math.max(1, Number(positionRow?.position ?? entry.queueNumber))
    const nextStatus: QueueAllocateResult['status'] = queuePosition <= 1 ? QUEUE_READY_STATUS : 'WAITING'

    if (status !== nextStatus) {
      await db
        .update(queueEntries)
        .set({ status: nextStatus, updatedAt: now })
        .where(eq(queueEntries.id, entryId))
      status = nextStatus
    }
  }

  const [peopleRow] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.scopeKey, entry.scopeKey),
        activeQueueStatusCondition(),
        or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
      ),
    )
    .limit(1)

  const [positionRow] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.scopeKey, entry.scopeKey),
        activeQueueStatusCondition(),
        or(isNull(queueEntries.expiresAt), gt(queueEntries.expiresAt, now)),
        lte(queueEntries.queueNumber, entry.queueNumber),
      ),
    )
    .limit(1)

  const activePeopleInQueue = Math.max(1, Number(peopleRow?.count ?? 1))
  const cumulativePeopleInQueue = await getQueueCumulativeCount(entry.scopeKey)
  const peopleInQueue = Math.max(activePeopleInQueue, cumulativePeopleInQueue, entry.queueNumber)
  const queueNumber = status === 'EXPIRED' ? entry.queueNumber : Math.max(1, Number(positionRow?.count ?? entry.queueNumber))
  const base = Math.max(1, entry.queueNumber)
  const progressRatio = status === QUEUE_READY_STATUS
    ? 1
    : Math.min(1, Math.max(0, (queueNumber - 1) / Math.max(1, base - 1)))
  const progress = Math.round(progressRatio * 100)

  const result = {
    status,
    queueNumber,
    scopeKey: entry.scopeKey,
    visitorToken: entry.visitorToken,
    peopleInQueue,
    initialQueueNumber: entry.queueNumber,
    expiresAt: entry.expiresAt,
    createdAt,
    progress,
  }

  devQueueLog('status.response', {
    entryId,
    scopeKey: result.scopeKey,
    status: result.status,
    queueNumber: result.queueNumber,
    peopleInQueue: result.peopleInQueue,
    progress: result.progress,
  })

  return result
}

