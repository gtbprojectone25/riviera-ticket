import { describe, it, expect } from 'vitest'
import { db } from '@/db'
import { tickets, users, sessions, seats, cinemas, auditoriums, carts, movies } from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { eq, desc, inArray } from 'drizzle-orm'

describe('Order ID Retrieval', () => {
  it('should fetch tickets with correct orderNumber from joined orders table', async () => {
    const timestamp = Date.now()
    const testUserEmail = `test.user.${timestamp}@example.com`
    
    // 1. Create User
    const [user] = await db.insert(users).values({
      email: testUserEmail,
      name: 'Test',
      surname: 'User',
      role: 'USER',
    }).returning()
    expect(user).toBeDefined()

    // 2. Create Movie
    const [movie] = await db.insert(movies).values({
      title: `Test Movie ${timestamp}`,
      releaseDate: '2025-01-01',
      duration: 120,
      synopsis: 'A test movie',
      director: 'Tester',
    }).returning()

    // 3. Create Cinema & Auditorium
    const cinemaId = `cinema-${timestamp}`
    await db.insert(cinemas).values({
      id: cinemaId,
      name: 'Test Cinema',
      city: 'Test City',
      state: 'TS',
      country: 'Test Country',
      isIMAX: true,
      lat: 0,
      lng: 0,
      address: '123 Test St',
    })

    const [auditorium] = await db.insert(auditoriums).values({
      cinemaId,
      name: 'Hall 1',
      totalSeats: 100,
      layout: {},
      type: 'NORMAL'
    }).returning()

    // 4. Create Session
    const [session] = await db.insert(sessions).values({
      movieId: movie.id,
      movieTitle: movie.title,      // Added
      movieDuration: movie.duration, // Added
      cinemaName: 'Test Cinema',
      cinemaId,
      auditoriumId: auditorium.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7200000),
      totalSeats: 100,
      availableSeats: 99,
      basePrice: 1000,
      vipPrice: 2000,
      salesStatus: 'ACTIVE'
    }).returning()

    // 5. Create Seat
    const [seat] = await db.insert(seats).values({
      sessionId: session.id,
      row: 'A',
      number: 1,
      seatId: 'A-1',
      status: 'SOLD',
      price: 1000,
    }).returning()

    // 6. Create Cart
    const [cart] = await db.insert(carts).values({
      userId: user.id,
      sessionId: session.id,
      totalAmount: 1000,
      status: 'COMPLETED',
      expiresAt: new Date(Date.now() + 3600000),
    }).returning()

    // 7. Create Order with a specific Order Number
    const orderNumber = `RVT-TEST-${timestamp}`
    const [order] = await db.insert(orders).values({
      orderNumber,
      userId: user.id,
      cartId: cart.id,
      sessionId: session.id,
      cinemaId,
      subtotal: 1000,
      total: 1000,
      status: 'PAID',
    }).returning()

    // 8. Create Ticket linked to Order
    const [ticket] = await db.insert(tickets).values({
      sessionId: session.id,
      userId: user.id,
      seatId: seat.id,
      cartId: cart.id,
      orderId: order.id, // Link ticket to order
      ticketType: 'STANDARD',
      price: 1000,
      status: 'CONFIRMED',
    }).returning()

    // 9. Execute the Query Logic (simulating route.ts)
    const rows = await db
      .select({
        ticketId: tickets.id,
        orderId: tickets.orderId,
        orderNumber: orders.orderNumber, // Verify this field is retrieved
        cartId: tickets.cartId,
      })
      .from(tickets)
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .where(eq(tickets.id, ticket.id))
      .limit(1)

    // 10. Verify Results
    expect(rows).toHaveLength(1)
    expect(rows[0].orderNumber).toBe(orderNumber)
    expect(rows[0].orderId).toBe(order.id)
    
    console.log('Test passed: Order Number retrieved correctly:', rows[0].orderNumber)
  })
})
