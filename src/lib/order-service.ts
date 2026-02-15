/**
 * Order Service
 * 
 * Gerencia a criação de pedidos após confirmação de pagamento
 * Implementa transações para garantir consistência
 */

import { db } from '@/db'
import { 
  carts, 
  cartItems, 
  seats, 
  tickets, 
  paymentIntents,
  users,
  sessions 
} from '@/db/schema'
import { orders } from '@/db/admin-schema'
import { eq, inArray } from 'drizzle-orm'

// Gera um número de pedido único
function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `RVT-${dateStr}-${random}`
}

export type CreateOrderResult = {
  success: boolean
  message: string
  orderId?: string
  orderNumber?: string
  tickets?: Array<{
    id: string
    seatId: string
    seatLabel: string
  }>
}

/**
 * Cria um pedido a partir de um carrinho após pagamento confirmado
 * 
 * Esta função deve ser chamada no webhook do Stripe/Adyen
 * quando payment_intent.succeeded
 * 
 * Fluxo em transação:
 * 1. Valida carrinho e pagamento
 * 2. Cria order
 * 3. Cria tickets
 * 4. Marca assentos como vendidos (não apenas reservados)
 * 5. Atualiza carrinho para COMPLETED
 */
export async function createOrderFromPayment(
  paymentIntentId: string,
  stripePaymentId?: string
): Promise<CreateOrderResult> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Buscar payment intent
      const [payment] = await tx
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.id, paymentIntentId))
        .for('update')

      if (!payment) {
        throw new Error('Payment intent não encontrado')
      }

      if (payment.status === 'SUCCEEDED') {
        // Já foi processado - idempotência (verifica pelo cartId)
        const existingOrder = await tx
          .select()
          .from(orders)
          .where(eq(orders.cartId, payment.cartId))
          .limit(1)

        if (existingOrder.length > 0) {
          return {
            success: true,
            message: 'Pedido já foi criado anteriormente',
            orderId: existingOrder[0].id,
            orderNumber: existingOrder[0].orderNumber,
          }
        }
      }

      // 2. Buscar carrinho
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.id, payment.cartId))
        .for('update')

      if (!cart) {
        throw new Error('Carrinho não encontrado')
      }

      // 3. Buscar usuário
      let customerEmail = 'unknown@example.com'
      let customerName = 'Cliente'

      if (cart.userId) {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, cart.userId))

        if (user) {
          customerEmail = user.email
          customerName = `${user.name} ${user.surname}`.trim()
        }
      }

      // 4. Buscar itens do carrinho com assentos
      const items = await tx
        .select({
          cartItem: cartItems,
          seat: seats,
        })
        .from(cartItems)
        .innerJoin(seats, eq(seats.id, cartItems.seatId))
        .where(eq(cartItems.cartId, cart.id))

      if (items.length === 0) {
        throw new Error('Carrinho vazio')
      }

      // 5. Gerar número do pedido
      const orderNumber = generateOrderNumber()

      // 6. Criar order
      const [order] = await tx
        .insert(orders)
        .values({
          userId: cart.userId,
          sessionId: cart.sessionId,
          cartId: cart.id,
          checkoutSessionId: payment.checkoutSessionId,
          orderNumber,
          subtotal: cart.totalAmount,
          discount: 0,
          serviceFee: 0,
          total: cart.totalAmount,
          status: 'PAID',
          customerEmail,
          customerName,
          paymentMethod: 'stripe',
          paymentReference: stripePaymentId || payment.stripePaymentIntentId,
          paidAt: new Date(),
        })
        .returning()

      // 7. Criar tickets
      const createdTickets: Array<{ id: string; seatId: string; seatLabel: string }> = []

      for (const item of items) {
        const [ticket] = await tx
          .insert(tickets)
          .values({
            sessionId: cart.sessionId,
            userId: cart.userId!,
            seatId: item.seat.id,
            cartId: cart.id,
            orderId: order.id,
            ticketType: item.seat.type,
            price: item.cartItem.price,
            status: 'CONFIRMED',
            purchaseDate: new Date(),
          })
          .returning()

        createdTickets.push({
          id: ticket.id,
          seatId: item.seat.id,
          seatLabel: item.seat.seatId,
        })
      }

      // 8. Marcar assentos como vendidos (não mais reservados)
      const now = new Date()
      await tx
        .update(seats)
        .set({
          status: 'SOLD',
          soldAt: now,
          soldCartId: cart.id,
          heldUntil: null,
          heldBy: null,
          heldByCartId: null,
          updatedAt: now,
        })
        .where(inArray(seats.id, items.map(i => i.seat.id)))

      // 9. Atualizar status do carrinho
      await tx
        .update(carts)
        .set({
          status: 'COMPLETED',
          updatedAt: new Date(),
        })
        .where(eq(carts.id, cart.id))

      // 11. Atualizar status do payment intent
      await tx
        .update(paymentIntents)
        .set({
          status: 'SUCCEEDED',
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, paymentIntentId))

      // 11. Atualizar order para CONFIRMED (tickets gerados)
      await tx
        .update(orders)
        .set({
          status: 'CONFIRMED',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))

      console.log(`[Order] Pedido ${orderNumber} criado com ${createdTickets.length} tickets`)

      return {
        success: true,
        message: 'Pedido criado com sucesso',
        orderId: order.id,
        orderNumber,
        tickets: createdTickets,
      }
    })
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar pedido',
    }
  }
}

/**
 * Cancela um pedido e libera os assentos
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await db.transaction(async (tx) => {
      // Buscar order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update')

      if (!order) {
        throw new Error('Pedido não encontrado')
      }

      if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
        return {
          success: true,
          message: 'Pedido já foi cancelado',
        }
      }

      // Buscar tickets do pedido
      const orderTickets = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, orderId))

      // Liberar assentos
      if (orderTickets.length > 0) {
        const seatIds = orderTickets.map(t => t.seatId)

        await tx
          .update(seats)
          .set({
            status: 'AVAILABLE',
            heldUntil: null,
            heldBy: null,
            heldByCartId: null,
            soldAt: null,
            soldCartId: null,
            updatedAt: new Date(),
          })
          .where(inArray(seats.id, seatIds))

        // Restaurar contagem na sessão
        if (order.sessionId) {
          await tx
            .update(sessions)
            .set({
              availableSeats: sessions.availableSeats,
              updatedAt: new Date(),
            })
            .where(eq(sessions.id, order.sessionId))
        }
      }

      // Cancelar tickets
      await tx
        .update(tickets)
        .set({
          status: 'CANCELLED',
          updatedAt: new Date(),
        })
        .where(eq(tickets.orderId, orderId))

      // Atualizar order
      await tx
        .update(orders)
        .set({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))

      console.log(`[Order] Pedido ${order.orderNumber} cancelado. Motivo: ${reason || 'Não informado'}`)

      return {
        success: true,
        message: 'Pedido cancelado com sucesso',
      }
    })
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao cancelar pedido',
    }
  }
}

/**
 * Busca pedidos de um usuário
 */
export async function getUserOrders(userId: string) {
  try {
    const userOrders = await db
      .select({
        order: orders,
        session: {
          id: sessions.id,
          movieTitle: sessions.movieTitle,
          startTime: sessions.startTime,
          cinemaName: sessions.cinemaName,
        },
      })
      .from(orders)
      .leftJoin(sessions, eq(sessions.id, orders.sessionId))
      .where(eq(orders.userId, userId))
      .orderBy(orders.createdAt)

    return {
      success: true,
      orders: userOrders,
    }
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return {
      success: false,
      orders: [],
    }
  }
}
