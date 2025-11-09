/**
 * Database query functions
 * Reusable database operations for the Riviera Ticket system
 */

import { eq, and, gte, lte, desc, asc } from 'drizzle-orm'
import { db } from './index'
import type { 
  NewUser, 
  NewSession, 
  NewSeat, 
  NewCart, 
  NewTicket,
  NewPaymentIntent
} from './schema'
import { 
  users, 
  sessions, 
  seats, 
  carts, 
  cartItems, 
  tickets, 
  paymentIntents
} from './schema'

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

export async function createSession(sessionData: NewSession) {
  const [session] = await db.insert(sessions).values(sessionData).returning()
  return session
}

// Seat operations
export async function getAvailableSeats(sessionId: string) {
  return await db
    .select()
    .from(seats)
    .where(
      and(
        eq(seats.sessionId, sessionId),
        eq(seats.isAvailable, true),
        eq(seats.isReserved, false)
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
  const [seat] = await db
    .update(seats)
    .set({
      isReserved: true,
      reservedBy: userId,
      reservedUntil: expiresAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(seats.id, seatId),
        eq(seats.isAvailable, true),
        eq(seats.isReserved, false)
      )
    )
    .returning()
  
  return seat || null
}

export async function releaseExpiredReservations() {
  const now = new Date()
  
  return await db
    .update(seats)
    .set({
      isReserved: false,
      reservedBy: null,
      reservedUntil: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.isReserved, true),
        lte(seats.reservedUntil, now)
      )
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
  
  // Mark seats as unavailable
  const seatIds = cart.items.map(item => item.seatId)
  await db
    .update(seats)
    .set({ 
      isAvailable: false, 
      isReserved: false,
      updatedAt: new Date() 
    })
    .where(eq(seats.id, seatIds[0])) // This should be done for all seats
  
  // Mark cart as completed
  await db
    .update(carts)
    .set({ status: 'COMPLETED', updatedAt: new Date() })
    .where(eq(carts.id, cartId))
  
  return createdTickets
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
  
  const reservedSeats = allSeats.filter(seat => seat.isReserved).length
  const availableSeats = allSeats.filter(seat => seat.isAvailable && !seat.isReserved).length
  
  return {
    session,
    totalSeats: allSeats.length,
    soldTickets: soldTickets.length,
    reservedSeats,
    availableSeats,
    revenue: soldTickets.reduce((sum, ticket) => sum + ticket.price, 0),
  }
}