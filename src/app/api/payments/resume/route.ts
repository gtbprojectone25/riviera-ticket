import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { and, desc, eq, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { orders } from '@/db/admin-schema'
import { carts, paymentIntents, sessions, userSessions, users } from '@/db/schema'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
})

const resumeSchema = z.object({
  orderId: z.string().uuid(),
})

type CountRow = { count: number }

function isMissingCheckoutSchemaError(error: unknown) {
  const code = (error as { code?: string })?.code
  const message = error instanceof Error ? error.message : String(error)
  return code === '42703' || code === '42P01' || /checkout_session_id|checkout_purchases/i.test(message)
}

function extractCheckoutSessionIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const candidate = (metadata as { checkout_session_id?: unknown }).checkout_session_id
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

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

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = resumeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { orderId } = parsed.data
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'WAITING_PAYMENT' && order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Order is not resumable' }, { status: 409 })
    }

    if (!order.cartId) {
      return NextResponse.json({ error: 'Order has no cart linked' }, { status: 409 })
    }

    const cartItemsCountResult = await db.execute(sql<CountRow>`
      select count(*)::int as count from cart_items where cart_id = ${order.cartId}
    `)
    const ticketsCount = cartItemsCountResult.rows?.[0]?.count ?? 1

    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, order.cartId))
      .limit(1)

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    const amountCents = order.total ?? cart.totalAmount
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount for order' }, { status: 409 })
    }

    const [sessionData] = await db
      .select({
        id: sessions.id,
        movieTitle: sessions.movieTitle,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
        cinemaName: sessions.cinemaName,
      })
      .from(sessions)
      .where(eq(sessions.id, cart.sessionId))
      .limit(1)

    const [latestPendingIntent] = await db
      .select({
        id: paymentIntents.id,
        stripePaymentIntentId: paymentIntents.stripePaymentIntentId,
        checkoutSessionId: paymentIntents.checkoutSessionId,
        status: paymentIntents.status,
      })
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.cartId, order.cartId),
          eq(paymentIntents.status, 'PENDING'),
        ),
      )
      .orderBy(desc(paymentIntents.createdAt))
      .limit(1)

    if (latestPendingIntent?.stripePaymentIntentId) {
      const recoveredIntent = await stripe.paymentIntents.retrieve(latestPendingIntent.stripePaymentIntentId)
      if (recoveredIntent.client_secret && recoveredIntent.status !== 'succeeded' && recoveredIntent.status !== 'canceled') {
        return NextResponse.json({
          orderId: order.id,
          cartId: order.cartId,
          amountCents,
          clientSecret: recoveredIntent.client_secret,
          paymentIntentId: recoveredIntent.id,
          checkoutSessionId:
            latestPendingIntent.checkoutSessionId ||
            order.checkoutSessionId ||
            extractCheckoutSessionIdFromMetadata(order.metadata),
          session: sessionData,
          ticketsCount,
        })
      }
    }

    const checkoutSessionId = randomUUID()
    const stripePaymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      receipt_email: user.email,
      metadata: {
        orderId: order.id,
        cartId: order.cartId,
        userId: user.id,
        checkout_session_id: checkoutSessionId,
      },
      automatic_payment_methods: { enabled: true },
    })

    try {
      await db.insert(paymentIntents).values({
        cartId: order.cartId,
        userId: user.id,
        checkoutSessionId,
        stripePaymentIntentId: stripePaymentIntent.id,
        amountCents,
        currency: 'usd',
        status: 'PENDING',
        metadata: JSON.stringify({
          checkoutSessionId,
          resumedFromOrderId: order.id,
        }),
      })
    } catch (error) {
      if (!isMissingCheckoutSchemaError(error)) throw error
      await db.execute(
        // Legacy fallback without checkout_session_id column.
        // checkoutSessionId remains in metadata for claim.
        sql`
          insert into payment_intents (
            cart_id,
            user_id,
            stripe_payment_intent_id,
            amount,
            currency,
            status,
            metadata
          ) values (
            ${order.cartId},
            ${user.id},
            ${stripePaymentIntent.id},
            ${amountCents},
            ${'usd'},
            ${'PENDING'},
            ${JSON.stringify({
              checkoutSessionId,
              resumedFromOrderId: order.id,
            })}
          )
        `,
      )
    }

    const now = new Date()
    const metadata = {
      ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
      checkout_session_id: checkoutSessionId,
      resumed_at: now.toISOString(),
    }

    try {
      await db
        .update(orders)
        .set({
          status: 'WAITING_PAYMENT',
          paymentMethod: 'stripe',
          paymentReference: stripePaymentIntent.id,
          checkoutSessionId,
          metadata,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id))
    } catch (error) {
      if (!isMissingCheckoutSchemaError(error)) throw error
      await db
        .update(orders)
        .set({
          status: 'WAITING_PAYMENT',
          paymentMethod: 'stripe',
          paymentReference: stripePaymentIntent.id,
          metadata,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id))
    }

    return NextResponse.json({
      orderId: order.id,
      cartId: order.cartId,
      amountCents,
      clientSecret: stripePaymentIntent.client_secret,
      paymentIntentId: stripePaymentIntent.id,
      checkoutSessionId,
      session: sessionData,
      ticketsCount,
    })
  } catch (error) {
    console.error('Error resuming payment:', error)
    return NextResponse.json({ error: 'Failed to resume payment' }, { status: 500 })
  }
}
