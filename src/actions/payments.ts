'use server'

import { db } from '@/db'
import { paymentIntents, carts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const paymentSchema = z.object({
  cartId: z.string(),
  userId: z.string().optional(),
  amount: z.number(),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'pix']),
  cardDetails: z.object({
    number: z.string(),
    holder: z.string(),
    expiry: z.string(),
    cvv: z.string()
  }).optional()
})

export async function processPayment(data: z.infer<typeof paymentSchema>) {
  try {
    const validatedData = paymentSchema.parse(data)
    const { cartId, userId, amount, paymentMethod, cardDetails } = validatedData

    // Verificar se o carrinho existe e está ativo
    const cart = await db
      .select()
      .from(carts)
      .where(and(
        eq(carts.id, cartId),
        eq(carts.status, 'ACTIVE')
      ))
      .limit(1)

    if (cart.length === 0) {
      return {
        success: false,
        message: 'Carrinho não encontrado ou inativo'
      }
    }

    // Simular processamento de pagamento
    // Em produção, integrar com gateway de pagamento real
    const isPaymentSuccessful = await simulatePaymentProcessing(amount, paymentMethod, cardDetails)

    if (!isPaymentSuccessful) {
      return {
        success: false,
        message: 'Falha no processamento do pagamento'
      }
    }

    // Criar registro de payment intent
    const payment = await db.insert(paymentIntents).values({
      cartId,
      userId: userId || null,
      amount,
      currency: 'brl',
      status: 'SUCCEEDED',
      stripePaymentIntentId: generateTransactionId(),
      metadata: JSON.stringify({ method: paymentMethod })
    }).returning()

    // Atualizar status do carrinho
    await db
      .update(carts)
      .set({
        status: 'COMPLETED',
        updatedAt: new Date()
      })
      .where(eq(carts.id, cartId))

    return {
      success: true,
      paymentId: payment[0].id,
      transactionId: payment[0].stripePaymentIntentId,
      message: 'Pagamento processado com sucesso'
    }

  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    const payment = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, paymentId))
      .limit(1)

    if (payment.length === 0) {
      return {
        success: false,
        message: 'Pagamento não encontrado'
      }
    }

    return {
      success: true,
      payment: payment[0]
    }

  } catch (error) {
    console.error('Erro ao buscar status do pagamento:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

// Função auxiliar para simular processamento de pagamento
async function simulatePaymentProcessing(
  amount: number, 
  method: string, 
  cardDetails?: { number: string; holder: string; expiry: string; cvv: string }
): Promise<boolean> {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Simular validações básicas
  if (method === 'credit_card' || method === 'debit_card') {
    if (!cardDetails) return false
    
    // Validações básicas do cartão (em produção usar biblioteca de validação)
    if (cardDetails.number.length < 13 || cardDetails.cvv.length < 3) {
      return false
    }
  }

  // Simular 95% de sucesso
  return Math.random() > 0.05
}

// Função auxiliar para gerar ID de transação
function generateTransactionId(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8)
  return `TXN_${timestamp}_${random}`.toUpperCase()
}

export async function refundPayment(paymentId: string, reason?: string) {
  try {
    const payment = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, paymentId))
      .limit(1)

    if (payment.length === 0) {
      return {
        success: false,
        message: 'Pagamento não encontrado'
      }
    }

    if (payment[0].status !== 'SUCCEEDED') {
      return {
        success: false,
        message: 'Apenas pagamentos concluídos podem ser reembolsados'
      }
    }

    // Atualizar status do pagamento
    await db
      .update(paymentIntents)
      .set({
        status: 'CANCELLED',
        metadata: JSON.stringify({ refund_reason: reason, refunded_at: new Date() })
      })
      .where(eq(paymentIntents.id, paymentId))

    return {
      success: true,
      message: 'Reembolso processado com sucesso'
    }

  } catch (error) {
    console.error('Erro ao processar reembolso:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}