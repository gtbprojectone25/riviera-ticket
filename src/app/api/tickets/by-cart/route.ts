import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { carts, checkoutPurchases, paymentIntents, seats, sessions, tickets, userSessions, users } from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { consumeSeatsAndCreateTickets } from '@/db/queries'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null
  const cookieToken = request.cookies.get('session')?.value
  const sessionToken = bearerToken || cookieToken

  if (!sessionToken) return null

  const result = await db
    .select({
      user: users,
      session: userSessions,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.sessionToken, sessionToken))
    .limit(1)

  if (result.length === 0) return null

  const { user, session } = result[0]
  if (session.expiresAt < new Date()) {
    await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const checkoutSessionId = searchParams.get('checkout_session_id')

    if (!checkoutSessionId) {
      return NextResponse.json({ error: 'checkout_session_id is required' }, { status: 400 })
    }
    if (isDev) {
      console.info('[tickets/by-cart] request', { userId: user.id, checkoutSessionId })
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!uuidRegex.test(checkoutSessionId)) {
      return NextResponse.json({ error: 'checkout_session_id invalid' }, { status: 400 })
    }

    const isMissingCheckoutSchemaError = (error: unknown) => {
      const code = (error as { code?: string })?.code
      const message = error instanceof Error ? error.message : String(error)
      return code === '42703' || code === '42P01' || /checkout_purchases|checkout_session_id/i.test(message)
    }

    type CheckoutContext = {
      cartId: string
      ownerUserId: string | null
      paymentConfirmed: boolean
      paymentIntentId?: string | null
      shouldRecoverFulfillment?: boolean
      source: 'checkout_purchases' | 'orders' | 'payment_intents'
    }

    const resolveCheckoutContext = async (): Promise<CheckoutContext | null> => {
      try {
        const [checkout] = await db
          .select()
          .from(checkoutPurchases)
          .where(eq(checkoutPurchases.checkoutSessionId, checkoutSessionId))
          .limit(1)

        if (checkout) {
          return {
            cartId: checkout.cartId,
            ownerUserId: checkout.userId,
            paymentConfirmed: checkout.status === 'SUCCEEDED' || checkout.status === 'CLAIMED',
            paymentIntentId: checkout.paymentIntentId ?? null,
            source: 'checkout_purchases',
          }
        }
      } catch (error) {
        if (!isMissingCheckoutSchemaError(error)) {
          throw error
        }
        if (isDev) {
          console.warn('[tickets/by-cart] checkout_purchases unavailable, falling back', {
            checkoutSessionId,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }

      const [orderBySession] = await db
        .select({
          cartId: orders.cartId,
          userId: orders.userId,
          status: orders.status,
          paymentReference: orders.paymentReference,
        })
        .from(orders)
        .where(
          or(
            eq(orders.checkoutSessionId, checkoutSessionId),
            sql`${orders.metadata}->>'checkout_session_id' = ${checkoutSessionId}`,
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(1)

      if (orderBySession?.cartId) {
        const [latestPaymentForOrder] = await db
          .select({
            status: paymentIntents.status,
          })
          .from(paymentIntents)
          .where(
            and(
              eq(paymentIntents.cartId, orderBySession.cartId),
              inArray(paymentIntents.status, ['SUCCEEDED']),
            ),
          )
          .orderBy(desc(paymentIntents.createdAt))
          .limit(1)

        const [confirmedTicketForOrder] = await db
          .select({
            id: tickets.id,
          })
          .from(tickets)
          .where(
            and(
              eq(tickets.cartId, orderBySession.cartId),
              inArray(tickets.status, ['CONFIRMED']),
            ),
          )
          .limit(1)

        let stripeSucceeded = false
        let stripeIntentId: string | null = null
        const paymentReferenceLooksLikePi =
          typeof orderBySession.paymentReference === 'string' &&
          orderBySession.paymentReference.startsWith('pi_')

        if (!latestPaymentForOrder && !confirmedTicketForOrder && paymentReferenceLooksLikePi && stripe) {
          try {
            const remoteIntent = await stripe.paymentIntents.retrieve(orderBySession.paymentReference as string)
            stripeSucceeded = remoteIntent.status === 'succeeded'
            stripeIntentId = remoteIntent.id
          } catch {
            stripeSucceeded = false
            stripeIntentId = null
          }
        }

        return {
          cartId: orderBySession.cartId,
          ownerUserId: orderBySession.userId,
          paymentConfirmed:
            orderBySession.status === 'PAID' ||
            orderBySession.status === 'CONFIRMED' ||
            Boolean(latestPaymentForOrder) ||
            Boolean(confirmedTicketForOrder) ||
            stripeSucceeded,
          paymentIntentId:
            (paymentReferenceLooksLikePi ? (orderBySession.paymentReference as string) : null) ||
            stripeIntentId,
          shouldRecoverFulfillment: stripeSucceeded && !confirmedTicketForOrder,
          source: 'orders',
        }
      }

      let [payment] = await db
        .select({
          id: paymentIntents.id,
          cartId: paymentIntents.cartId,
          userId: paymentIntents.userId,
          status: paymentIntents.status,
          stripePaymentIntentId: paymentIntents.stripePaymentIntentId,
          metadata: paymentIntents.metadata,
        })
        .from(paymentIntents)
        .where(eq(paymentIntents.checkoutSessionId, checkoutSessionId))
        .orderBy(desc(paymentIntents.createdAt))
        .limit(1)

      if (!payment) {
        const fallbackByMetadata = await db
          .select({
            id: paymentIntents.id,
            cartId: paymentIntents.cartId,
            userId: paymentIntents.userId,
            status: paymentIntents.status,
            stripePaymentIntentId: paymentIntents.stripePaymentIntentId,
            metadata: paymentIntents.metadata,
          })
          .from(paymentIntents)
          .where(sql`${paymentIntents.metadata} ILIKE ${`%"checkoutSessionId":"${checkoutSessionId}"%`}`)
          .orderBy(desc(paymentIntents.createdAt))
          .limit(1)

        payment = fallbackByMetadata[0]
      }

      if (!payment) {
        return null
      }

      return {
        cartId: payment.cartId,
        ownerUserId: payment.userId,
        paymentConfirmed: payment.status === 'SUCCEEDED',
        paymentIntentId: payment.stripePaymentIntentId,
        source: 'payment_intents',
      }
    }

    const resolvedCheckout = await resolveCheckoutContext()
    if (!resolvedCheckout) {
      if (isDev) {
        console.info('[tickets/by-cart] checkout not found', { checkoutSessionId })
      }
      return NextResponse.json({ error: 'checkout session not found' }, { status: 404 })
    }

    if (!resolvedCheckout.paymentConfirmed) {
      if (isDev) {
        console.info('[tickets/by-cart] checkout not ready', {
          checkoutSessionId,
          source: resolvedCheckout.source,
        })
      }
      return NextResponse.json({ error: 'payment not confirmed yet' }, { status: 409 })
    }

    const cartIdParam = resolvedCheckout.cartId

    const claimCheckout = async (tx: typeof db) => {
      const ownerUserId = resolvedCheckout.ownerUserId
      if (ownerUserId && ownerUserId !== user.id) {
        if (isDev) {
          console.warn('[tickets/by-cart] forbidden ownership', {
            checkoutSessionId,
            requestedBy: user.id,
            ownerId: ownerUserId,
          })
        }
        throw new Error('FORBIDDEN')
      }

      const now = new Date()
      try {
        await tx
          .update(checkoutPurchases)
          .set({
            userId: user.id,
            status: 'CLAIMED',
            claimedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(checkoutPurchases.checkoutSessionId, checkoutSessionId),
              or(isNull(checkoutPurchases.userId), eq(checkoutPurchases.userId, user.id)),
            ),
          )
      } catch (error) {
        if (!isMissingCheckoutSchemaError(error)) {
          throw error
        }
      }

      const ticketRows = await tx
        .select({
          ticketId: tickets.id,
          ticketUserId: tickets.userId,
        })
        .from(tickets)
        .where(eq(tickets.cartId, cartIdParam))

      if (ticketRows.length === 0 && resolvedCheckout.paymentConfirmed) {
        try {
          await consumeSeatsAndCreateTickets(tx as unknown as Parameters<typeof consumeSeatsAndCreateTickets>[0], {
            cartId: cartIdParam,
            userId: user.id,
            guestEmail: null,
          })
        } catch (error) {
          const code = (error as { code?: string })?.code || (error instanceof Error ? error.message : '')
          if (code === 'HOLD_EXPIRED') {
            const err: Error & { httpStatus?: number } = new Error('HOLD_EXPIRED')
            err.httpStatus = 410
            throw err
          }
          if (code === 'SEAT_CONFLICT') {
            const err: Error & { httpStatus?: number } = new Error('SEAT_CONFLICT')
            err.httpStatus = 409
            throw err
          }
          throw error
        }

        await tx
          .update(carts)
          .set({ status: 'COMPLETED', updatedAt: now })
          .where(eq(carts.id, cartIdParam))

        await tx
          .update(orders)
          .set({
            status: 'CONFIRMED',
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(orders.cartId, cartIdParam))

        if (resolvedCheckout.paymentIntentId) {
          await tx
            .update(paymentIntents)
            .set({ status: 'SUCCEEDED', updatedAt: now })
            .where(eq(paymentIntents.stripePaymentIntentId, resolvedCheckout.paymentIntentId))
        }
      }
      const finalTicketRows = await tx
        .select({
          ticketId: tickets.id,
          ticketUserId: tickets.userId,
        })
        .from(tickets)
        .where(eq(tickets.cartId, cartIdParam))

      if (finalTicketRows.length === 0) {
        return
      }

      await tx
        .update(tickets)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(and(eq(tickets.cartId, cartIdParam), isNull(tickets.userId)))

      // Compatibilidade: migração de compras antigas com usuário fake guest+{cartId}@checkout.local
      const ownerIds = Array.from(
        new Set(finalTicketRows.map((row) => row.ticketUserId).filter((id): id is string => Boolean(id))),
      )
      if (ownerIds.length > 0 && !(ownerIds.length === 1 && ownerIds[0] === user.id)) {
        const ownerUsers = await tx
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(inArray(users.id, ownerIds))

        const expectedGuestEmail = `guest+${cartIdParam}@checkout.local`
        const canMigrateLegacyGuest =
          ownerUsers.length > 0 && ownerUsers.every((owner) => owner.email === expectedGuestEmail)

        if (!canMigrateLegacyGuest) {
          throw new Error('FORBIDDEN')
        }

        await tx
          .update(tickets)
          .set({ userId: user.id, updatedAt: new Date() })
          .where(eq(tickets.cartId, cartIdParam))
      }

      await tx
        .update(carts)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(and(eq(carts.id, cartIdParam), sql`${carts.userId} IS NULL`))

      await tx
        .update(paymentIntents)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(
          and(
            eq(paymentIntents.cartId, cartIdParam),
            or(
              isNull(paymentIntents.userId),
              eq(paymentIntents.userId, user.id),
            ),
          ),
        )

      await tx
        .update(orders)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(
          and(
            eq(orders.cartId, cartIdParam),
            or(isNull(orders.userId), eq(orders.userId, user.id)),
          ),
        )
    }

    await db
      .transaction(async (tx) => claimCheckout(tx as unknown as typeof db))
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('No transactions support in neon-http driver')) {
          await claimCheckout(db)
          return
        }
        throw error
      })

    const rows = await db
      .select({
        ticket: tickets,
        seat: seats,
        session: sessions,
      })
      .from(tickets)
      .innerJoin(seats, eq(seats.id, tickets.seatId))
      .innerJoin(sessions, eq(sessions.id, tickets.sessionId))
      .where(and(eq(tickets.cartId, cartIdParam), eq(tickets.userId, user.id)))

    if (rows.length === 0) {
      if (isDev) {
        console.info('[tickets/by-cart] no tickets found', { checkoutSessionId, cartId: cartIdParam })
      }
      return NextResponse.json({ tickets: [] }, { status: 200 })
    }

    const session = rows[0]?.session ?? null
    const mappedTickets = rows.map((row) => ({
      id: row.ticket.id,
      type: row.ticket.ticketType,
      price: row.ticket.price,
      seatId: row.seat.seatId,
      sessionId: row.ticket.sessionId,
    }))

    return NextResponse.json({
      session,
      tickets: mappedTickets,
      cartId: cartIdParam,
    })
  } catch (error) {
    const httpStatus = (error as { httpStatus?: number })?.httpStatus
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (message === 'SEAT_CONFLICT' || httpStatus === 409) {
      return NextResponse.json({ error: 'SEAT_CONFLICT' }, { status: 409 })
    }
    if (message === 'HOLD_EXPIRED' || httpStatus === 410) {
      return NextResponse.json({ error: 'HOLD_EXPIRED' }, { status: 410 })
    }
    console.error('Erro ao buscar tickets por compra:', error)
    return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 })
  }
}
