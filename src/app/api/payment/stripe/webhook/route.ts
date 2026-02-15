// API Route: POST /api/payment/stripe/webhook
// Webhook do Stripe para confirmar pagamentos

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { consumeSeatsAndCreateTickets, releaseCartHolds } from '@/db/queries'
import { orders } from '@/db/admin-schema'
import {
  paymentIntents,
  checkoutPurchases,
  processedStripeEvents,
  carts,
  tickets,
  users,
  sessions,
  type Session,
} from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { barcodeService } from '@/lib/barcode-service'
import { emailService } from '@/lib/email-service'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const isDev = process.env.NODE_ENV !== 'production'
const log = (...args: unknown[]) => {
  if (isDev) {
    console.log('[stripe-webhook]', ...args)
  }
}

type EventGateState = 'PROCESS' | 'DUPLICATE' | 'IN_PROGRESS'

function getStripePaymentIntentId(event: Stripe.Event): string | null {
  if (!event.type.startsWith('payment_intent.')) return null
  const payload = event.data.object as Stripe.PaymentIntent
  return payload?.id ?? null
}

function sanitizeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.slice(0, 500)
}

function buildOrderNumber(checkoutSessionId: string | null, cartId: string) {
  const base = (checkoutSessionId ?? cartId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase()
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `RVT-${day}-${base || 'ORDER'}`
}

async function beginStripeEventProcessing(
  event: Stripe.Event,
  stripePaymentIntentId: string | null,
): Promise<EventGateState> {
  const now = new Date()

  const inserted = await db
    .insert(processedStripeEvents)
    .values({
      eventId: event.id,
      eventType: event.type,
      paymentIntentId: stripePaymentIntentId,
      status: 'PROCESSING',
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [processedStripeEvents.eventId] })
    .returning({ id: processedStripeEvents.id })

  if (inserted.length > 0) {
    return 'PROCESS'
  }

  const [existing] = await db
    .select()
    .from(processedStripeEvents)
    .where(eq(processedStripeEvents.eventId, event.id))
    .limit(1)

  if (!existing) {
    return 'IN_PROGRESS'
  }

  if (existing.status === 'PROCESSED') {
    return 'DUPLICATE'
  }

  if (existing.status === 'PROCESSING') {
    return 'IN_PROGRESS'
  }

  const claimed = await db
    .update(processedStripeEvents)
    .set({
      status: 'PROCESSING',
      paymentIntentId: stripePaymentIntentId ?? existing.paymentIntentId,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(processedStripeEvents.eventId, event.id),
        eq(processedStripeEvents.status, 'FAILED'),
      ),
    )
    .returning({ id: processedStripeEvents.id })

  return claimed.length > 0 ? 'PROCESS' : 'IN_PROGRESS'
}

async function markStripeEventProcessed(eventId: string) {
  const now = new Date()
  await db
    .update(processedStripeEvents)
    .set({
      status: 'PROCESSED',
      processedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .where(eq(processedStripeEvents.eventId, eventId))
}

async function markStripeEventFailed(eventId: string, error: unknown) {
  await db
    .update(processedStripeEvents)
    .set({
      status: 'FAILED',
      lastError: sanitizeErrorMessage(error),
      updatedAt: new Date(),
    })
    .where(eq(processedStripeEvents.eventId, eventId))
}

export async function POST(request: NextRequest) {
  if (!stripeSecret || !webhookSecret) {
    console.error('Stripe webhook missing configuration: STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeSecret)

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    const stripePaymentIntentId = getStripePaymentIntentId(event)
    log('event.received', {
      eventId: event.id,
      type: event.type,
      stripePaymentIntentId,
      metadata: (event.data.object as { metadata?: unknown })?.metadata ?? null,
    })
    const eventGate = await beginStripeEventProcessing(event, stripePaymentIntentId)

    if (eventGate === 'DUPLICATE') {
      log('duplicate event ignored', { eventId: event.id, type: event.type, stripePaymentIntentId })
      return NextResponse.json({ received: true, deduplicated: true })
    }

    if (eventGate === 'IN_PROGRESS') {
      log('event already in processing', { eventId: event.id, type: event.type, stripePaymentIntentId })
      return NextResponse.json({ received: true, inProgress: true })
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        log('payment_intent.succeeded', {
          eventId: event.id,
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })
        await handlePaymentSuccess(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        log('payment_intent.payment_failed', {
          eventId: event.id,
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })
        await handlePaymentFailure(paymentIntent)
        break
      }

      default:
        log('unhandled event type', { eventId: event.id, type: event.type, stripePaymentIntentId })
    }

    await markStripeEventProcessed(event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    await markStripeEventFailed(event.id, error)
    console.error('Error processing webhook:', {
      eventId: event.id,
      type: event.type,
      paymentIntentId: getStripePaymentIntentId(event),
      error: sanitizeErrorMessage(error),
    })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const runSuccess = async (tx: typeof db) => {
    const now = new Date()

    log('fetching payment_intent', paymentIntent.id)
    const [dbPaymentIntent] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.stripePaymentIntentId, paymentIntent.id))
      .limit(1)

    if (!dbPaymentIntent) {
      throw new Error(`PAYMENT_INTENT_NOT_FOUND:${paymentIntent.id}`)
    }

    const checkoutSessionIdFromStripe =
      paymentIntent.metadata?.checkout_session_id ||
      paymentIntent.metadata?.checkoutSessionId ||
      null

    const paymentIntentPatch: Partial<typeof paymentIntents.$inferInsert> = {
      updatedAt: now,
    }

    if (dbPaymentIntent.status !== 'SUCCEEDED') {
      paymentIntentPatch.status = 'SUCCEEDED'
    }

    if (!dbPaymentIntent.checkoutSessionId && checkoutSessionIdFromStripe) {
      paymentIntentPatch.checkoutSessionId = checkoutSessionIdFromStripe
    }

    if (paymentIntentPatch.status || paymentIntentPatch.checkoutSessionId) {
      log('updating payment_intent status', dbPaymentIntent.id)
      await tx
        .update(paymentIntents)
        .set(paymentIntentPatch)
        .where(eq(paymentIntents.id, dbPaymentIntent.id))
    }

    const checkoutSessionId = dbPaymentIntent.checkoutSessionId || checkoutSessionIdFromStripe
    if (checkoutSessionId) {
      await tx
        .insert(checkoutPurchases)
        .values({
          checkoutSessionId,
          cartId: dbPaymentIntent.cartId,
          paymentIntentId: dbPaymentIntent.id,
          userId: dbPaymentIntent.userId,
          status: 'SUCCEEDED',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: checkoutPurchases.checkoutSessionId,
          set: {
            cartId: dbPaymentIntent.cartId,
            paymentIntentId: dbPaymentIntent.id,
            userId: dbPaymentIntent.userId,
            status: 'SUCCEEDED',
            updatedAt: now,
          },
        })
    }

    log('updating cart status', dbPaymentIntent.cartId)
    await tx
      .update(carts)
      .set({ status: 'COMPLETED', updatedAt: now })
      .where(eq(carts.id, dbPaymentIntent.cartId))

    const guestEmail =
      paymentIntent.receipt_email ||
      paymentIntent.metadata?.email ||
      paymentIntent.metadata?.customer_email ||
      null

    const {
      tickets: createdTickets,
      items,
      alreadyProcessed,
      userId: resolvedUserId,
      guestEmail: resolvedGuestEmail,
    } = await consumeSeatsAndCreateTickets(tx, {
      cartId: dbPaymentIntent.cartId,
      userId: dbPaymentIntent.userId,
      guestEmail,
    })
    log('tickets created', {
      count: createdTickets.length,
      alreadyProcessed,
      cartId: dbPaymentIntent.cartId,
    })

    let sessionData: Session | null = null
    if (items[0]) {
      const [session] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.id, items[0].seat.sessionId))
        .limit(1)
      sessionData = session
    }
    log('session data', sessionData ? sessionData.id : 'missing')

    const existingOrderByCheckout = checkoutSessionId
      ? await tx
          .select()
          .from(orders)
          .where(eq(orders.checkoutSessionId, checkoutSessionId))
          .limit(1)
      : []

    const existingOrderByCart = existingOrderByCheckout.length === 0
      ? await tx
          .select()
          .from(orders)
          .where(eq(orders.cartId, dbPaymentIntent.cartId))
          .limit(1)
      : []

    const existingOrder = existingOrderByCheckout[0] ?? existingOrderByCart[0] ?? null

    const subtotal = dbPaymentIntent.amountCents
    const total = dbPaymentIntent.amountCents
    const orderPayload = {
      orderNumber: existingOrder?.orderNumber ?? buildOrderNumber(checkoutSessionId, dbPaymentIntent.cartId),
      userId: resolvedUserId ?? null,
      cartId: dbPaymentIntent.cartId,
      sessionId: sessionData?.id ?? null,
      cinemaId: sessionData?.cinemaId ?? null,
      subtotal,
      discount: 0,
      serviceFee: 0,
      total,
      status: 'CONFIRMED' as const,
      paymentMethod: 'stripe',
      paymentReference: paymentIntent.id,
      checkoutSessionId: checkoutSessionId ?? null,
      paidAt: new Date(paymentIntent.created * 1000),
      customerEmail: resolvedGuestEmail ?? paymentIntent.receipt_email ?? null,
      customerName: null,
      metadata: {
        checkout_session_id: checkoutSessionId ?? null,
        stripe_payment_intent_id: paymentIntent.id,
      },
      updatedAt: now,
    }

    let orderId: string | null = existingOrder?.id ?? null

    if (existingOrder) {
      await tx
        .update(orders)
        .set(orderPayload)
        .where(eq(orders.id, existingOrder.id))
    } else {
      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          ...orderPayload,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: orders.checkoutSessionId,
          set: orderPayload,
        })
        .returning({ id: orders.id })

      orderId = insertedOrder?.id ?? null
    }

    if (orderId) {
      await tx
        .update(tickets)
        .set({ orderId, updatedAt: now })
        .where(and(eq(tickets.cartId, dbPaymentIntent.cartId), isNull(tickets.orderId)))
    }

    return {
      dbPaymentIntent,
      createdTickets,
      items,
      alreadyProcessed,
      sessionData,
      resolvedUserId,
      resolvedGuestEmail,
      orderId,
    }
  }

  const result = await db
    .transaction(async (tx) => runSuccess(tx as unknown as typeof db))
    .catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('No transactions support in neon-http driver')) {
        return runSuccess(db)
      }
      throw error
    })

  if (result.alreadyProcessed) {
    log('already processed', result.dbPaymentIntent.cartId)
    return
  }

  for (const ticket of result.createdTickets) {
    try {
      const barcodeData = barcodeService.generateBarcodeData(ticket.id, result.dbPaymentIntent.cartId)
      const { realPath, blurredPath } = await barcodeService.saveBarcode(ticket.id, barcodeData)

      await db.update(tickets).set({
        barcodePath: realPath,
        barcodeBlurredPath: blurredPath,
        barcodeData,
        barcodeRevealedAt: result.sessionData?.startTime || new Date(),
      }).where(eq(tickets.id, ticket.id))
    } catch (error) {
      console.error('Erro ao gerar barcode:', {
        ticketId: ticket.id,
        cartId: result.dbPaymentIntent.cartId,
        error: sanitizeErrorMessage(error),
      })
    }
  }

  let recipientEmail: string | null = null

  if (result.resolvedUserId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, result.resolvedUserId))
      .limit(1)
    if (user) {
      recipientEmail = user.email
    }
  }

  if (!recipientEmail && result.resolvedGuestEmail) {
    recipientEmail = result.resolvedGuestEmail
  }

  if (recipientEmail) {
    const sessionStart = result.sessionData?.startTime
    const fallbackDate = sessionStart
      ? new Date(sessionStart).toLocaleDateString('pt-BR')
      : 'TBD'
    const fallbackTime = sessionStart
      ? new Date(sessionStart).toLocaleTimeString('pt-BR')
      : 'TBD'

    const sent = await emailService.sendTicketConfirmation(recipientEmail, {
      orderId: result.dbPaymentIntent.cartId,
      movieTitle: result.sessionData?.movieTitle || 'Your Tickets',
      cinemaName: result.sessionData?.cinemaName || 'Riviera',
      date: fallbackDate,
      time: fallbackTime,
      seats: result.items.map((item) => item.seat.seatId),
      totalAmount: result.dbPaymentIntent.amountCents / 100,
    })

    if (!sent) {
      console.warn('Falha ao enviar email de confirmacao para', recipientEmail)
    } else {
      log('email confirmation sent', recipientEmail)
    }
  } else {
    console.warn('Email de confirmacao nao enviado: destinatario ausente')
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const runFailure = async (tx: typeof db) => {
    const now = new Date()

    const [dbPaymentIntent] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.stripePaymentIntentId, paymentIntent.id))
      .limit(1)

    if (!dbPaymentIntent) {
      throw new Error(`PAYMENT_INTENT_NOT_FOUND:${paymentIntent.id}`)
    }

    await tx
      .update(paymentIntents)
      .set({ status: 'FAILED', updatedAt: now })
      .where(eq(paymentIntents.id, dbPaymentIntent.id))

    if (dbPaymentIntent.checkoutSessionId) {
      await tx
        .insert(checkoutPurchases)
        .values({
          checkoutSessionId: dbPaymentIntent.checkoutSessionId,
          cartId: dbPaymentIntent.cartId,
          paymentIntentId: dbPaymentIntent.id,
          userId: dbPaymentIntent.userId,
          status: 'FAILED',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: checkoutPurchases.checkoutSessionId,
          set: {
            paymentIntentId: dbPaymentIntent.id,
            userId: dbPaymentIntent.userId,
            status: 'FAILED',
            updatedAt: now,
          },
        })
    }

    await releaseCartHolds(tx, {
      cartId: dbPaymentIntent.cartId,
      userId: dbPaymentIntent.userId,
    })

    await tx
      .update(carts)
      .set({ status: 'EXPIRED', updatedAt: now })
      .where(eq(carts.id, dbPaymentIntent.cartId))
  }

  await db
    .transaction(async (tx) => runFailure(tx as unknown as typeof db))
    .catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('No transactions support in neon-http driver')) {
        await runFailure(db)
        return
      }
      throw error
    })
}


