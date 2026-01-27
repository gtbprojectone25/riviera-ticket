// API Route: POST /api/payment/stripe/webhook
// Webhook do Stripe para confirmar pagamentos

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { consumeSeatsAndCreateTickets, releaseCartHolds } from '@/db/queries'
import { paymentIntents, carts, tickets, users, sessions, type Session } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { barcodeService } from '@/lib/barcode-service'
import { emailService } from '@/lib/email-service'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

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
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailure(paymentIntent)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const result = await db.transaction(async (tx) => {
    const now = new Date()

    const [dbPaymentIntent] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.stripePaymentIntentId, paymentIntent.id))
      .limit(1)

    if (!dbPaymentIntent) {
      console.error('Payment intent not found in database:', paymentIntent.id)
      return null
    }

    if (dbPaymentIntent.status !== 'SUCCEEDED') {
      await tx
        .update(paymentIntents)
        .set({ status: 'SUCCEEDED', updatedAt: now })
        .where(eq(paymentIntents.id, dbPaymentIntent.id))
    }

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

    let sessionData: Session | null = null
    if (items[0]) {
      const [session] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.id, items[0].seat.sessionId))
        .limit(1)
      sessionData = session
    }

    return {
      dbPaymentIntent,
      createdTickets,
      items,
      alreadyProcessed,
      sessionData,
      resolvedUserId,
      resolvedGuestEmail,
    }
  })

  if (!result) {
    return
  }

  if (result.alreadyProcessed) {
    return
  }

  for (const ticket of result.createdTickets) {
    const barcodeData = barcodeService.generateBarcodeData(ticket.id, result.dbPaymentIntent.cartId)
    const { realPath, blurredPath } = await barcodeService.saveBarcode(ticket.id, barcodeData)

    await db.update(tickets).set({
      barcodePath: realPath,
      barcodeBlurredPath: blurredPath,
      barcodeData,
      barcodeRevealedAt: result.sessionData?.startTime || new Date(),
    }).where(eq(tickets.id, ticket.id))
  }

  if (result.sessionData) {
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
      await emailService.sendTicketConfirmation(recipientEmail, {
        orderId: result.dbPaymentIntent.cartId,
        movieTitle: result.sessionData.movieTitle,
        cinemaName: result.sessionData.cinemaName,
        date: new Date(result.sessionData.startTime).toLocaleDateString('pt-BR'),
        time: new Date(result.sessionData.startTime).toLocaleTimeString('pt-BR'),
        seats: result.items.map((item) => item.seat.seatId),
        totalAmount: result.dbPaymentIntent.amountCents / 100,
      })
    }
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  await db.transaction(async (tx) => {
    const now = new Date()

    const [dbPaymentIntent] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.stripePaymentIntentId, paymentIntent.id))
      .limit(1)

    if (!dbPaymentIntent) {
      console.error('Payment intent not found in database:', paymentIntent.id)
      return
    }

    await tx
      .update(paymentIntents)
      .set({ status: 'FAILED', updatedAt: now })
      .where(eq(paymentIntents.id, dbPaymentIntent.id))

    await releaseCartHolds(tx, {
      cartId: dbPaymentIntent.cartId,
      userId: dbPaymentIntent.userId,
    })

    await tx
      .update(carts)
      .set({ status: 'EXPIRED', updatedAt: now })
      .where(eq(carts.id, dbPaymentIntent.cartId))
  })
}


