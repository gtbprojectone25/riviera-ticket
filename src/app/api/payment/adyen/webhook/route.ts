// API Route: POST /api/payment/adyen/webhook
// Webhook do Adyen para confirmar pagamentos

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { paymentIntents, carts, tickets, seats, cartItems, users, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { barcodeService } from '@/lib/barcode-service'
import { emailService } from '@/lib/email-service'

const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const notification = await request.json()

    // Verificar HMAC signature
    const hmacSignature = request.headers.get('x-adyen-signature')
    if (hmacSignature && !verifyHMAC(JSON.stringify(notification), hmacSignature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Processar notificacoes
    for (const notificationItem of notification.notificationItems || []) {
      const event = notificationItem.NotificationRequestItem

      switch (event.eventCode) {
        case 'AUTHORISATION':
          if (event.success === 'true') {
            await handleAdyenPaymentSuccess(event)
          } else {
            await handleAdyenPaymentFailure(event)
          }
          break

        default:
          console.log(`Unhandled Adyen event: ${event.eventCode}`)
      }
    }

    return NextResponse.json({ '[accepted]': true })
  } catch (error) {
    console.error('Error processing Adyen webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function verifyHMAC(payload: string, signature: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', ADYEN_HMAC_KEY)
    hmac.update(payload)
    const calculatedSignature = hmac.digest('base64')
    return calculatedSignature === signature
  } catch (error) {
    console.error('HMAC verification error:', error)
    return false
  }
}

async function handleAdyenPaymentSuccess(event: any) {
  const cartId = event.merchantReference

  // Atualizar payment intent
  const [dbPaymentIntent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.cartId, cartId))
    .limit(1)

  if (!dbPaymentIntent) {
    console.error('Payment intent not found:', cartId)
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
    .where(eq(carts.id, cartId))

  // Criar tickets e gerar barcodes (mesma logica do Stripe)
  const items = await db
    .select({
      cartItem: cartItems,
      seat: seats,
    })
    .from(cartItems)
    .innerJoin(seats, eq(seats.id, cartItems.seatId))
    .where(eq(cartItems.cartId, cartId))

  const createdTickets = []
  let sessionData: any = null

  for (const item of items) {
    if (!sessionData) {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, item.seat.sessionId))
        .limit(1)
      sessionData = session
    }

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

    const barcodeData = barcodeService.generateBarcodeData(ticket.id, dbPaymentIntent.cartId)
    const { realPath, blurredPath } = await barcodeService.saveBarcode(ticket.id, barcodeData)

    await db.update(tickets).set({
      barcodePath: realPath,
      barcodeBlurredPath: blurredPath,
      barcodeData,
      barcodeRevealedAt: sessionData?.startTime || new Date(),
    }).where(eq(tickets.id, ticket.id))

    createdTickets.push(ticket)
  }

  if (dbPaymentIntent.userId && sessionData) {
    const [user] = await db.select().from(users).where(eq(users.id, dbPaymentIntent.userId)).limit(1)
    if (user) {
      await emailService.sendTicketConfirmation(user.email, {
        orderId: dbPaymentIntent.cartId,
        movieTitle: sessionData.movieTitle,
        cinemaName: sessionData.cinemaName,
        date: new Date(sessionData.startTime).toLocaleDateString('pt-BR'),
        time: new Date(sessionData.startTime).toLocaleTimeString('pt-BR'),
        seats: items.map(item => item.seat.seatId),
        totalAmount: dbPaymentIntent.amount / 100,
      })
    }
  }
}

async function handleAdyenPaymentFailure(event: any) {
  const cartId = event.merchantReference

  const [dbPaymentIntent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.cartId, cartId))
    .limit(1)

  if (dbPaymentIntent) {
    await db
      .update(paymentIntents)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(eq(paymentIntents.id, dbPaymentIntent.id))
  }
}
