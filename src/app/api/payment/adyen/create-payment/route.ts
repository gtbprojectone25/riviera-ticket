// API Route: POST /api/payment/adyen/create-payment
// Cria payment no Adyen

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentIntents, carts } from '@/db/schema'
import { eq } from 'drizzle-orm'

const ADYEN_API_KEY = process.env.ADYEN_API_KEY || ''
const ADYEN_MERCHANT_ACCOUNT = process.env.ADYEN_MERCHANT_ACCOUNT || ''
const ADYEN_BASE_URL = process.env.ADYEN_BASE_URL || 'https://checkout-test.adyen.com/v70'

export async function POST(request: NextRequest) {
  try {
    const { cartId, amount, currency = 'USD', paymentMethod } = await request.json()

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

    // Criar payment no Adyen
    const paymentRequest = {
      amount: {
        value: Math.round(amount * 100), // Convert to cents
        currency,
      },
      reference: cartId,
      merchantAccount: ADYEN_MERCHANT_ACCOUNT,
      paymentMethod,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/result`,
    }

    const response = await fetch(`${ADYEN_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'X-API-Key': ADYEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    })

    const paymentResponse = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: paymentResponse.message || 'Erro ao criar payment no Adyen' },
        { status: response.status }
      )
    }

    // Salvar payment intent no banco
    await db.insert(paymentIntents).values({
      cartId,
      userId: cart.userId,
      adyenPaymentId: paymentResponse.pspReference, // Adyen-specific field
      amount: Math.round(amount * 100),
      currency,
      status: 'PENDING',
      metadata: JSON.stringify(paymentResponse),
    })

    return NextResponse.json({
      resultCode: paymentResponse.resultCode,
      pspReference: paymentResponse.pspReference,
      action: paymentResponse.action, // For 3DS or redirect
    })
  } catch (error: any) {
    console.error('Error creating Adyen payment:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar payment' },
      { status: 500 }
    )
  }
}

