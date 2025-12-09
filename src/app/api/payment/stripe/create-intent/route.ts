// API Route: POST /api/payment/stripe/create-intent
// Cria payment intent no Stripe

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { paymentIntents, carts } from '@/db/schema'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { cartId, amount, currency = 'usd' } = await request.json()

    if (!cartId || !amount) {
      return NextResponse.json(
        { error: 'cartId e amount são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar cart
    const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1)
    
    if (!cart) {
      return NextResponse.json(
        { error: 'Carrinho não encontrado' },
        { status: 404 }
      )
    }

    // Criar payment intent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
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
      amount: Math.round(amount * 100),
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
