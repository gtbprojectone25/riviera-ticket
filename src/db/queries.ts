/**
 * Database query functions
 * Reusable database operations for the Riviera Ticket system
 */

import { eq, and, gte, gt, lte, lt, ne, desc, asc, or, inArray, isNull, sql } from 'drizzle-orm'
import { db } from './index'
import type { 
  NewUser, 
  NewSession, 
  NewPriceRule,
  NewSeat, 
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
  paymentIntents
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
  const seatsData: NewSeat[] = []
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  
  rows.forEach(row => {
    for (let number = 1; number <= 20; number++) {
      const seatId = `${row}${number}`
      const isVIP = ['D', 'E', 'F'].includes(row) && number >= 6 && number <= 15
      
      seatsData.push({
        sessionId,
        row,
        number,
        seatId,
        type: isVIP ? 'VIP' : 'STANDARD',
        price: isVIP ? 4999 : 2999, // $49.99 for VIP, $29.99 for Standard
        isAvailable: true,
        isReserved: false,
      })
    }
  })
  
  return await db.insert(seats).values(seatsData).returning()
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
      isReserved: true,
      reservedBy: userId,
      reservedUntil: expiresAt,
      isAvailable: false,
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

  const holdConditions = [
    eq(seats.status, 'AVAILABLE'),
    and(eq(seats.status, 'HELD'), lte(seats.heldUntil, now)),
    and(eq(seats.status, 'HELD'), eq(seats.heldByCartId, cart.id)),
  ]

  const heldSeats = await tx
    .update(seats)
    .set({
      status: 'HELD',
      heldUntil,
      heldBy: cart.userId,
      heldByCartId: cart.id,
      isAvailable: false,
      isReserved: true,
      reservedBy: cart.userId,
      reservedUntil: heldUntil,
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
    return await db.transaction(async (transaction) =>
      holdSeats(cartId, seatIds, ttlMinutes, transaction)
    )
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

export async function releaseExpiredReservations() {
  const now = new Date()
  
  return await db
    .update(seats)
    .set({
      status: 'AVAILABLE',
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      isAvailable: true,
      isReserved: false,
      reservedBy: null,
      reservedUntil: null,
      updatedAt: now,
    })
    .where(
      and(eq(seats.status, 'HELD'), lte(seats.heldUntil, now))
    )
    .returning()
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
  const [cart] = await db
    .update(carts)
    .set({ status: 'EXPIRED', updatedAt: new Date() })
    .where(eq(carts.id, cartId))
    .returning()
  
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
      isAvailable: false, 
      isReserved: false,
      reservedBy: null,
      reservedUntil: null,
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

  let resolvedUserId = params.userId ?? null
  let resolvedEmail = params.guestEmail ?? null

  if (!resolvedUserId) {
    const fallbackEmail = resolvedEmail || `guest+${params.cartId}@checkout.local`
    resolvedEmail = fallbackEmail

    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.email, fallbackEmail))
      .limit(1)

    if (existingUser) {
      resolvedUserId = existingUser.id
    } else {
      const [guestUser] = await tx
        .insert(users)
        .values({
          email: fallbackEmail,
          name: 'Guest',
          surname: 'Checkout',
          emailVerified: false,
        })
        .returning()

      resolvedUserId = guestUser.id
    }
  }

  if (!resolvedUserId) {
    throw new Error('USER_REQUIRED')
  }

  const holdConditions = or(
    and(
      eq(seats.status, 'HELD'),
      gt(seats.heldUntil, now),
      or(
        eq(seats.heldByCartId, params.cartId),
        and(isNull(seats.heldByCartId), eq(seats.heldBy, resolvedUserId)),
      ),
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
      isAvailable: false,
      isReserved: false,
      reservedBy: null,
      reservedUntil: null,
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

    const alreadySold = await tx
      .select({ id: seats.id })
      .from(seats)
      .where(
        and(
          inArray(seats.id, missingSeatIds),
          eq(seats.status, 'SOLD'),
          eq(seats.soldCartId, params.cartId),
        ),
      )

    if (alreadySold.length !== missingSeatIds.length) {
      throw new Error('SEAT_CONFLICT')
    }
  }

  const ticketsData: NewTicket[] = items.map((item) => ({
    sessionId: item.seat.sessionId,
    userId: resolvedUserId,
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
    releaseConditions.push(and(eq(seats.status, 'HELD'), eq(seats.reservedBy, params.userId)))
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
      isAvailable: true,
      isReserved: false,
      reservedBy: null,
      reservedUntil: null,
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
  
  // Release reserved seats and expire carts
  for (const cart of expiredCarts) {
    await expireCart(cart.id)
  }
  
  // Release expired seat reservations
  await releaseExpiredReservations()
  
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
