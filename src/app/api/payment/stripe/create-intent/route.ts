// API Route: POST /api/payment/stripe/create-intent
// Cria payment intent no Stripe

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { paymentIntents, carts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-10-29.clover',
})

const createIntentSchema = z.object({
  cartId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().min(1).default('usd'),
})

export async function POST(request: NextRequest) {
  // Verifica se a chave do Stripe está configurada
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return NextResponse.json(
      { error: 'Stripe não configurado' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const validation = createIntentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { cartId, amountCents, currency } = validation.data

    // Verificar cart
    const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1)

    if (!cart) {
      return NextResponse.json(
        { error: 'Carrinho nao encontrado' },
        { status: 404 }
      )
    }

    // Criar payment intent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      metadata: {
        cartId,
        userId: cart.userId || '',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Salvar payment intent no banco
    await db.insert(paymentIntents).values({
      cartId,
      userId: cart.userId,
      stripePaymentIntentId: paymentIntent.id,
      amountCents,
      currency,
      status: 'PENDING',
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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
