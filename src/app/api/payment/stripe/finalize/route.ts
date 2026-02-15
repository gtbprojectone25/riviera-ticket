// POST /api/payment/stripe/finalize
// Confirma pagamento Stripe de forma idempotente e cria tickets

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { paymentIntents, carts, checkoutPurchases, tickets, sessions } from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { consumeSeatsAndCreateTickets } from '@/db/queries'
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2025-10-29.clover' }) : null

let checkoutPurchasesExists: boolean | null = null

function isMissingCheckoutSchemaError(error: unknown) {
  const code = (error as { code?: string })?.code
  const message = error instanceof Error ? error.message : String(error)
  return code === '42703' || code === '42P01' || /checkout_session_id|checkout_purchases/i.test(message)
}

async function ensureCheckoutPurchases() {
  if (checkoutPurchasesExists !== null) return checkoutPurchasesExists
  try {
    const probe = await db.execute(sql<{ exists: boolean }>`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'checkout_purchases'
      ) as "exists"
    `)
    checkoutPurchasesExists = Boolean(probe.rows?.[0]?.exists)
  } catch {
    checkoutPurchasesExists = true
  }
  return checkoutPurchasesExists
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const paymentIntentId: string | null = body?.paymentIntentId ?? null
    const cartIdBody: string | null = body?.cartId ?? null
    const checkoutSessionIdBody: string | null = body?.checkoutSessionId ?? body?.checkout_session_id ?? null

    if (!paymentIntentId && !cartIdBody && !checkoutSessionIdBody) {
      return NextResponse.json({ error: 'paymentIntentId, checkoutSessionId or cartId required' }, { status: 400 })
    }

    // 1) Resolve payment_intent row
    let dbPi: (typeof paymentIntents.$inferSelect) | undefined
    try {
      ;[dbPi] = await db
        .select()
        .from(paymentIntents)
        .where(
          paymentIntentId
            ? eq(paymentIntents.stripePaymentIntentId, paymentIntentId)
            : checkoutSessionIdBody
              ? eq(paymentIntents.checkoutSessionId, checkoutSessionIdBody)
              : eq(paymentIntents.cartId, cartIdBody!),
        )
        .orderBy(desc(paymentIntents.createdAt))
        .limit(1)
    } catch (error) {
      if (!isMissingCheckoutSchemaError(error)) throw error
    }

    if (!dbPi && checkoutSessionIdBody) {
      // Fallback: resolve cart via orders metadata/column
      const [orderByCheckout] = await db
        .select({ cartId: orders.cartId })
        .from(orders)
        .where(
          or(
            eq(orders.checkoutSessionId, checkoutSessionIdBody),
            sql`(orders.metadata ->> 'checkout_session_id') = ${checkoutSessionIdBody}`,
          ),
        )
        .limit(1)
        .catch(() => [])

      if (orderByCheckout?.cartId) {
        const [piByCart] = await db
          .select()
          .from(paymentIntents)
          .where(eq(paymentIntents.cartId, orderByCheckout.cartId))
          .orderBy(desc(paymentIntents.createdAt))
          .limit(1)
        if (piByCart) {
          dbPi = piByCart
        }
      }
    }

    if (!dbPi) {
      return NextResponse.json({ error: 'payment_intent not found' }, { status: 404 })
    }

    if (!dbPi.stripePaymentIntentId) {
      return NextResponse.json({ error: 'payment_intent missing stripe_payment_intent_id' }, { status: 404 })
    }

    // 2) Retrieve from Stripe
    const stripePi = await stripe.paymentIntents.retrieve(dbPi.stripePaymentIntentId)
    if (stripePi.status !== 'succeeded') {
      return NextResponse.json({ error: 'payment_intent not succeeded yet' }, { status: 409 })
    }

    // 3) Run idempotent finalize
    const runFinalize = async (tx: typeof db) => {
      const now = new Date()
      const checkoutSessionId =
        dbPi.checkoutSessionId ||
        stripePi.metadata?.checkout_session_id ||
        stripePi.metadata?.checkoutSessionId ||
        null

      // PI status -> SUCCEEDED
      await tx
        .update(paymentIntents)
        .set({
          status: 'SUCCEEDED',
          checkoutSessionId,
          updatedAt: now,
        })
        .where(eq(paymentIntents.id, dbPi.id))
        .catch((error) => {
          if (!isMissingCheckoutSchemaError(error)) throw error
          return tx
            .update(paymentIntents)
            .set({ status: 'SUCCEEDED', updatedAt: now })
            .where(eq(paymentIntents.id, dbPi.id))
        })

      // Checkout purchases (best effort)
      const hasCheckoutPurchases = await ensureCheckoutPurchases()
      if (hasCheckoutPurchases && checkoutSessionId) {
        try {
          await tx
            .insert(checkoutPurchases)
            .values({
              checkoutSessionId,
              cartId: dbPi.cartId,
              paymentIntentId: dbPi.id,
              userId: dbPi.userId,
              status: 'SUCCEEDED',
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: checkoutPurchases.checkoutSessionId,
              set: {
                cartId: dbPi.cartId,
                paymentIntentId: dbPi.id,
                userId: dbPi.userId,
                status: 'SUCCEEDED',
                updatedAt: now,
              },
            })
        } catch (error) {
          if (!isMissingCheckoutSchemaError(error)) throw error
          checkoutPurchasesExists = false
        }
      }

      // Cart status
      await tx
        .update(carts)
        .set({ status: 'COMPLETED', updatedAt: now })
        .where(eq(carts.id, dbPi.cartId))

      // Tickets + seats
      const guestEmail =
        stripePi.receipt_email ||
        stripePi.metadata?.email ||
        stripePi.metadata?.customer_email ||
        null

      type FinalizeError = Error & { httpStatus?: number; details?: unknown }
      let consumeResult
      try {
        consumeResult = await consumeSeatsAndCreateTickets(tx, {
          cartId: dbPi.cartId,
          userId: dbPi.userId,
          guestEmail,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const code = (error as { code?: string })?.code || message
        // HOLD_EXPIRED should no longer happen after relaxing hold window; keep fallback just in case.
        if (code === 'HOLD_EXPIRED') {
          const err: FinalizeError = new Error('HOLD_EXPIRED')
          err.httpStatus = 410
          throw err
        }
        if (code === 'SEAT_CONFLICT') {
          const err: FinalizeError = new Error('SEAT_CONFLICT')
          err.httpStatus = 409
          err.details = (error as { details?: unknown })?.details
          throw err
        }
        throw error
      }

      const { tickets: createdTickets, items, alreadyProcessed, userId } = consumeResult

      // Order status
      const [sessionRow] = items.length
        ? await tx.select().from(sessions).where(eq(sessions.id, items[0].seat.sessionId)).limit(1)
        : []
      const resolvedUserId = userId ?? dbPi.userId ?? null
      const resolvedSessionId = sessionRow?.id ?? null
      const resolvedCinemaId = sessionRow?.cinemaId ?? null
      const orderPayload = {
        status: 'CONFIRMED' as const,
        paymentMethod: 'stripe',
        paymentReference: stripePi.id,
        checkoutSessionId,
        paidAt: now,
        updatedAt: now,
        metadata: {
          checkout_session_id: checkoutSessionId,
          stripe_payment_intent_id: stripePi.id,
        },
        userId: resolvedUserId,
        customerEmail: guestEmail ?? stripePi.receipt_email ?? null,
        sessionId: resolvedSessionId,
        cinemaId: resolvedCinemaId,
      }

      const [existingOrder] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(or(eq(orders.cartId, dbPi.cartId), checkoutSessionId ? eq(orders.checkoutSessionId, checkoutSessionId) : sql`1=0`))
        .limit(1)
        .catch(() => [])

      if (existingOrder) {
        await tx
          .update(orders)
          .set(orderPayload)
          .where(eq(orders.id, existingOrder.id))
          .catch((error) => {
            if (!isMissingCheckoutSchemaError(error)) throw error
            return tx.update(orders).set({ ...orderPayload, checkoutSessionId: undefined }).where(eq(orders.id, existingOrder.id))
          })
      } else {
        const orderNumber = `RVT-FIN-${(checkoutSessionId || dbPi.cartId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`
        await tx
          .insert(orders)
          .values({
            orderNumber,
            cartId: dbPi.cartId,
            subtotal: dbPi.amountCents,
            discount: 0,
            serviceFee: 0,
            total: dbPi.amountCents,
            createdAt: now,
            ...orderPayload,
          })
          .onConflictDoNothing()
      }

      // Link tickets to order if not linked
      const [orderRow] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.cartId, dbPi.cartId))
        .limit(1)
        .catch(() => [])

      if (orderRow) {
        await tx
          .update(tickets)
          .set({ orderId: orderRow.id, updatedAt: now })
          .where(and(eq(tickets.cartId, dbPi.cartId), isNull(tickets.orderId)))
      }

      return { createdTickets, alreadyProcessed }
    }

    const result = await db.transaction(async (tx) => runFinalize(tx as unknown as typeof db)).catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('No transactions support in neon-http driver')) {
        return runFinalize(db)
      }
      throw error
    })

    return NextResponse.json({
      ok: true,
      alreadyProcessed: result.alreadyProcessed,
      ticketsCreated: result.createdTickets.length,
    })
  } catch (error) {
    const httpStatus = (error as { httpStatus?: number })?.httpStatus
    const details = (error as { details?: unknown })?.details
    console.error('[stripe/finalize] error', error)
    if (httpStatus === 409) {
      return NextResponse.json({ error: 'SEAT_CONFLICT', details }, { status: 409 })
    }
    if (httpStatus === 410) {
      return NextResponse.json({ error: 'HOLD_EXPIRED' }, { status: 410 })
    }
    return NextResponse.json({ error: 'Failed to finalize payment' }, { status: 500 })
  }
}
