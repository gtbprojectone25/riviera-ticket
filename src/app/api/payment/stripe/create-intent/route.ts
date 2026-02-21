// API Route: POST /api/payment/stripe/create-intent
// Cria payment intent no Stripe

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { db } from '@/db'
import { paymentIntents, carts, checkoutPurchases, userSessions, users } from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
})

const createIntentSchema = z.object({
  cartId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().min(1).default('usd'),
  customerEmail: z.string().email().optional(),
})

let paymentIntentsHasCheckoutSessionColumn: boolean | null = null
let checkoutPurchasesExists: boolean | null = null

async function ensurePaymentIntentsCheckoutSessionColumnSupport() {
  if (paymentIntentsHasCheckoutSessionColumn !== null) {
    return paymentIntentsHasCheckoutSessionColumn
  }

  try {
    const probe = await db.execute(sql<{ exists: boolean }>`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'payment_intents'
          and column_name = 'checkout_session_id'
      ) as "exists"
    `)

    const exists = Boolean(probe.rows?.[0]?.exists)
    paymentIntentsHasCheckoutSessionColumn = exists
    return exists
  } catch {
    // Fallback to optimistic mode if metadata lookup fails.
    paymentIntentsHasCheckoutSessionColumn = true
    return true
  }
}

function isMissingCheckoutSchemaError(error: unknown) {
  const queue: unknown[] = [error]
  const visited = new Set<unknown>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)

    const code = (current as { code?: string })?.code
    const message =
      current instanceof Error
        ? current.message
        : typeof current === 'string'
          ? current
          : String(current)

    if (
      code === '42703' || // undefined_column
      code === '42P01' || // undefined_table
      /column .* does not exist/i.test(message) ||
      /relation .* does not exist/i.test(message) ||
      /checkout_session_id/i.test(message) ||
      /checkout_purchases/i.test(message)
    ) {
      return true
    }

    const cause = (current as { cause?: unknown })?.cause
    if (cause) queue.push(cause)
  }

  return false
}

async function ensureCheckoutPurchasesTable() {
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
    // Optimistic fallback
    checkoutPurchasesExists = true
  }
  return checkoutPurchasesExists
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
  // Verifica se a chave do Stripe está configurada
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return NextResponse.json(
      { error: 'Stripe não configurado' },
      { status: 500 }
    )
  }

  try {
    const authenticatedUser = await getUserFromRequest(request)
    const visitorToken = request.cookies.get('rt_visit_id')?.value ?? null
    const body = await request.json()
    const validation = createIntentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { cartId, amountCents, currency, customerEmail } = validation.data
    const checkoutSessionId = randomUUID()

    // Verificar cart
    const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1)

    if (!cart) {
      return NextResponse.json(
        { error: 'Carrinho nao encontrado' },
        { status: 404 }
      )
    }

    const effectiveUserId = cart.userId ?? authenticatedUser?.id ?? null

    // Auto-heal: se o cliente estÃ¡ autenticado mas o carrinho veio sem user_id, vincula antes do pagamento.
    if (!cart.userId && effectiveUserId) {
      await db
        .update(carts)
        .set({ userId: effectiveUserId, updatedAt: new Date() })
        .where(eq(carts.id, cart.id))
    }

    // Reutilizar payment intent pendente se existir para este carrinho
    const [existingPi] = await db
      .select({
        id: paymentIntents.id,
        stripePaymentIntentId: paymentIntents.stripePaymentIntentId,
        status: paymentIntents.status,
        checkoutSessionId: paymentIntents.checkoutSessionId,
        amountCents: paymentIntents.amountCents,
        currency: paymentIntents.currency,
      })
      .from(paymentIntents)
      .where(eq(paymentIntents.cartId, cartId))
      .orderBy(desc(paymentIntents.createdAt))
      .limit(1)

    if (existingPi?.stripePaymentIntentId && existingPi.status === 'PENDING') {
      try {
        const existingStripePi = await stripe.paymentIntents.retrieve(existingPi.stripePaymentIntentId)
        if (existingStripePi.status !== 'canceled' && existingStripePi.status !== 'succeeded') {
          const existingCheckoutSessionId =
            existingPi.checkoutSessionId ?? existingStripePi.metadata?.checkout_session_id ?? checkoutSessionId
          return NextResponse.json({
            clientSecret: existingStripePi.client_secret,
            paymentIntentId: existingStripePi.id,
            checkoutSessionId: existingCheckoutSessionId,
          })
        }
      } catch {
        // se falhar retrieve, continua para criar novo intent
      }
    }

    // Criar payment intent no Stripe (novo)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      receipt_email: customerEmail ?? undefined,
      metadata: {
        cartId,
        userId: effectiveUserId || '',
        customer_email: customerEmail || '',
        checkout_session_id: checkoutSessionId,
        visitor_token: visitorToken || '',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Salvar payment intent no banco.
    // Compatibilidade: se o banco estiver sem coluna checkout_session_id, faz fallback sem quebrar o checkout.
    let savedPaymentIntentId: string
    const savePaymentIntentLegacy = async () => {
      const legacyInsert = await db.execute(sql<{ id: string }>`
        insert into payment_intents (
          cart_id,
          user_id,
          stripe_payment_intent_id,
          amount,
          currency,
          status,
          metadata
        ) values (
          ${cartId},
          ${effectiveUserId},
          ${paymentIntent.id},
          ${amountCents},
          ${currency},
          ${'PENDING'},
          ${JSON.stringify({
            checkoutSessionId,
            customerEmail: customerEmail ?? null,
          })}
        )
        returning id
      `)
      const fallbackRow = legacyInsert.rows?.[0]
      if (!fallbackRow?.id) {
        throw new Error('Failed to create payment_intent in legacy fallback mode')
      }
      return String(fallbackRow.id)
    }

    const hasCheckoutSessionColumn = await ensurePaymentIntentsCheckoutSessionColumnSupport()
    if (!hasCheckoutSessionColumn) {
      savedPaymentIntentId = await savePaymentIntentLegacy()
    } else {
      try {
        const [created] = await db.insert(paymentIntents).values({
          cartId,
          userId: effectiveUserId,
          checkoutSessionId,
          stripePaymentIntentId: paymentIntent.id,
          amountCents,
          currency,
          status: 'PENDING',
          metadata: JSON.stringify({
            checkoutSessionId,
            customerEmail: customerEmail ?? null,
            visitorToken,
            visitorToken,
          }),
        }).returning({ id: paymentIntents.id })
        savedPaymentIntentId = created.id
      } catch (error) {
        if (!isMissingCheckoutSchemaError(error)) {
          throw error
        }

        paymentIntentsHasCheckoutSessionColumn = false
        console.warn('[stripe/create-intent] legacy payment_intents schema detected; retrying without checkout_session_id', {
          cartId,
          message: error instanceof Error ? error.message : String(error),
        })

        savedPaymentIntentId = await savePaymentIntentLegacy()
      }
    }

    // Upsert da identidade de checkout (claim seguro posterior)
    const hasCheckoutPurchases = await ensureCheckoutPurchasesTable()
    if (hasCheckoutPurchases) {
      try {
        await db
          .insert(checkoutPurchases)
          .values({
            checkoutSessionId,
            cartId,
            paymentIntentId: savedPaymentIntentId,
            userId: effectiveUserId,
            status: 'PENDING',
          })
          .onConflictDoUpdate({
            target: checkoutPurchases.cartId,
            set: {
              checkoutSessionId,
              paymentIntentId: savedPaymentIntentId,
              userId: effectiveUserId,
              status: 'PENDING',
              claimedAt: null,
              updatedAt: new Date(),
            },
          })
      } catch (error) {
        if (!isMissingCheckoutSchemaError(error)) {
          throw error
        }
        checkoutPurchasesExists = false
        if (process.env.NODE_ENV !== 'production') {
          console.info('[stripe/create-intent] checkout_purchases missing; skipping insert (legacy schema).', {
            cartId,
          })
        }
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.info('[stripe/create-intent] checkout_purchases not available; using metadata-only fallback.', {
        cartId,
      })
    }

    // Persist checkout identity for resumable payments.
    // If checkout_session_id column is missing in legacy DBs, fallback to metadata-only persistence.
    const now = new Date()
    const orderNumber = `RVT-PEND-${checkoutSessionId.slice(0, 8).toUpperCase()}`
    const metadata = {
      checkout_session_id: checkoutSessionId,
      stripe_payment_intent_id: paymentIntent.id,
    }

    try {
      const [existingOrder] = await db
        .select({ id: orders.id, userId: orders.userId })
        .from(orders)
        .where(eq(orders.cartId, cartId))
        .limit(1)

      if (existingOrder) {
        await db
          .update(orders)
          .set({
            userId: existingOrder.userId ?? effectiveUserId,
            status: 'WAITING_PAYMENT',
            paymentMethod: 'stripe',
            paymentReference: paymentIntent.id,
            checkoutSessionId,
            metadata,
            updatedAt: now,
          })
          .where(eq(orders.id, existingOrder.id))
      } else {
        await db
          .insert(orders)
          .values({
            orderNumber,
            userId: effectiveUserId,
            cartId,
            sessionId: cart.sessionId,
            subtotal: amountCents,
            discount: 0,
            serviceFee: 0,
            total: amountCents,
            status: 'WAITING_PAYMENT',
            paymentMethod: 'stripe',
            paymentReference: paymentIntent.id,
            checkoutSessionId,
            customerEmail: customerEmail ?? null,
            metadata,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: orders.checkoutSessionId,
            set: {
              userId: effectiveUserId,
              cartId,
              sessionId: cart.sessionId,
              subtotal: amountCents,
              total: amountCents,
              status: 'WAITING_PAYMENT',
              paymentMethod: 'stripe',
              paymentReference: paymentIntent.id,
              customerEmail: customerEmail ?? null,
              metadata,
              updatedAt: now,
            },
          })
      }
    } catch (error) {
      if (!isMissingCheckoutSchemaError(error)) {
        throw error
      }

      console.warn('[stripe/create-intent] checkout_session_id missing on orders; using metadata-only fallback', {
        cartId,
        checkoutSessionId,
      })

      const [legacyOrder] = await db
        .select({ id: orders.id, userId: orders.userId })
        .from(orders)
        .where(eq(orders.cartId, cartId))
        .limit(1)

      if (legacyOrder) {
        await db
          .update(orders)
          .set({
            userId: legacyOrder.userId ?? effectiveUserId,
            status: 'WAITING_PAYMENT',
            paymentMethod: 'stripe',
            paymentReference: paymentIntent.id,
            metadata,
            updatedAt: now,
          })
          .where(eq(orders.id, legacyOrder.id))
      } else {
        await db
          .insert(orders)
          .values({
            orderNumber,
            userId: effectiveUserId,
            cartId,
            sessionId: cart.sessionId,
            subtotal: amountCents,
            discount: 0,
            serviceFee: 0,
            total: amountCents,
            status: 'WAITING_PAYMENT',
            paymentMethod: 'stripe',
            paymentReference: paymentIntent.id,
            customerEmail: customerEmail ?? null,
            metadata,
            createdAt: now,
            updatedAt: now,
          })
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      checkoutSessionId,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao criar payment intent'

    console.error('Error creating Stripe payment intent:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}


