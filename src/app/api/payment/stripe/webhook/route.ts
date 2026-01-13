// API Route: POST /api/payment/stripe/webhook
// Webhook do Stripe para confirmar pagamentos

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { paymentIntents, carts, tickets, seats, cartItems, users, sessions, type Session } from '@/db/schema'
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
  // Atualizar payment intent no banco
  const [dbPaymentIntent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.stripePaymentIntentId, paymentIntent.id))
    .limit(1)

  if (!dbPaymentIntent) {
    console.error('Payment intent not found in database:', paymentIntent.id)
    return
  }

  await db
    .update(paymentIntents)
    .set({ status: 'SUCCEEDED', updatedAt: new Date() })
    .where(eq(paymentIntents.id, dbPaymentIntent.id))

  // Atualizar cart
  await db
    .update(carts)
    .set({ status: 'COMPLETED', updatedAt: new Date() })
    .where(eq(carts.id, dbPaymentIntent.cartId))

  // Criar tickets e gerar barcodes
  const items = await db
    .select({
      cartItem: cartItems,
      seat: seats,
    })
    .from(cartItems)
    .innerJoin(seats, eq(seats.id, cartItems.seatId))
    .where(eq(cartItems.cartId, dbPaymentIntent.cartId))

  const createdTickets = []
  let sessionData: Session | null = null

  for (const item of items) {
    // Buscar sessão se ainda não tiver
    if (!sessionData) {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, item.seat.sessionId))
        .limit(1)
      sessionData = session
    }

    // Criar ticket
    const [ticket] = await db.insert(tickets).values({
      sessionId: item.seat.sessionId,
      userId: dbPaymentIntent.userId!,
      seatId: item.seat.id,
      cartId: dbPaymentIntent.cartId,
      ticketType: item.seat.type,
      price: item.cartItem.price,
      status: 'CONFIRMED',
      purchaseDate: new Date(),
    }).returning()

    // Gerar barcode
    const barcodeData = barcodeService.generateBarcodeData(ticket.id, dbPaymentIntent.cartId)
    const { realPath, blurredPath } = await barcodeService.saveBarcode(ticket.id, barcodeData)

    // Atualizar ticket com paths do barcode
    await db.update(tickets).set({
      barcodePath: realPath,
      barcodeBlurredPath: blurredPath,
      barcodeData,
      barcodeRevealedAt: sessionData?.startTime || new Date(),
    }).where(eq(tickets.id, ticket.id))

    createdTickets.push(ticket)
  }

  // Enviar email de confirmação
  if (dbPaymentIntent.userId && sessionData) {
    const [user] = await db.select().from(users).where(eq(users.id, dbPaymentIntent.userId)).limit(1)
    if (user) {
      await emailService.sendTicketConfirmation(user.email, {
        orderId: dbPaymentIntent.cartId,
        movieTitle: sessionData.movieTitle,
        cinemaName: sessionData.cinemaName,
        date: new Date(sessionData.startTime).toLocaleDateString('pt-BR'),
        time: new Date(sessionData.startTime).toLocaleTimeString('pt-BR'),
        seats: items.map((item: { seat: typeof seats.$inferSelect; cartItem: typeof cartItems.$inferSelect }) => item.seat.seatId),
        totalAmount: dbPaymentIntent.amount / 100,
      })
    }
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const [dbPaymentIntent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.stripePaymentIntentId, paymentIntent.id))
    .limit(1)

  if (dbPaymentIntent) {
    await db
      .update(paymentIntents)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(eq(paymentIntents.id, dbPaymentIntent.id))
  }
}

