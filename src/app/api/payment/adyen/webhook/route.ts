// API Route: POST /api/payment/adyen/webhook
// Webhook do Adyen para confirmar pagamentos

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { consumeSeatsAndCreateTickets, releaseCartHolds } from '@/db/queries'
import { paymentIntents, carts, tickets, users, sessions, type Session } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { barcodeService } from '@/lib/barcode-service'
import { emailService } from '@/lib/email-service'

const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || ''

type AdyenNotificationRequestItem = {
  eventCode: string
  success?: 'true' | 'false' | boolean
  merchantReference?: string
}

type AdyenNotification = {
  notificationItems?: Array<{
    NotificationRequestItem: AdyenNotificationRequestItem
  }>
}

export async function POST(request: NextRequest) {
  try {
    const notification = (await request.json()) as AdyenNotification

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

function extractGuestEmail(metadata: string | null | undefined): string | null {
  if (!metadata) return null

  try {
    const parsed = JSON.parse(metadata) as {
      email?: unknown
      customer_email?: unknown
    }
    if (typeof parsed.email === 'string') return parsed.email
    if (typeof parsed.customer_email === 'string') return parsed.customer_email
  } catch {
    return null
  }

  return null
}

async function handleAdyenPaymentSuccess(event: AdyenNotificationRequestItem) {
  if (!event.merchantReference) {
    console.error('Missing merchantReference for Adyen success event')
    return
  }

  const cartId = event.merchantReference

  const result = await db.transaction(async (tx) => {
    const now = new Date()

    const [dbPaymentIntent] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.cartId, cartId))
      .limit(1)

    if (!dbPaymentIntent) {
      console.error('Payment intent not found:', cartId)
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
      .where(eq(carts.id, cartId))

    const guestEmail = extractGuestEmail(dbPaymentIntent.metadata)

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

async function handleAdyenPaymentFailure(event: AdyenNotificationRequestItem) {
  if (!event.merchantReference) {
    console.error('Missing merchantReference for Adyen failure event')
    return
  }

  const cartId = event.merchantReference

  await db.transaction(async (tx) => {
    const now = new Date()

    const [dbPaymentIntent] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.cartId, cartId))
      .limit(1)

    if (!dbPaymentIntent) {
      console.error('Payment intent not found:', cartId)
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
      .where(eq(carts.id, cartId))
  })
}
