/**
 * Seat Reservation Service
 * 
 * Implementa reserva de assentos com:
 * 1. Lock pessimista (SELECT FOR UPDATE)
 * 2. Transações atômicas
 * 3. Expiração automática de reservas
 */

import { db } from '@/db'
import { seats, carts, cartItems, sessions } from '@/db/schema'
import { eq, and, inArray, lte, sql } from 'drizzle-orm'

// Configuração
const RESERVATION_TIMEOUT_MINUTES = 10

export type ReserveSeatResult = {
  success: boolean
  message: string
  cartId?: string
  reservedUntil?: Date
  reservedSeats?: Array<{
    id: string
    seatId: string
    price: number
  }>
}

/**
 * Reserva assentos com lock pessimista e transação
 * 
 * Fluxo:
 * 1. Inicia transação
 * 2. Limpa reservas expiradas (lazy cleanup)
 * 3. Seleciona assentos com FOR UPDATE (lock)
 * 4. Verifica disponibilidade
 * 5. Atualiza assentos como reservados
 * 6. Cria carrinho e itens
 * 7. Commit ou rollback
 */
export async function reserveSeatsWithLock(
  sessionId: string,
  seatIds: string[], // UUIDs dos assentos
  userId?: string
): Promise<ReserveSeatResult> {
  const reservedUntil = new Date(Date.now() + RESERVATION_TIMEOUT_MINUTES * 60 * 1000)

  try {
    return await db.transaction(async (tx) => {
      // 1. Limpar reservas expiradas desta sessão (lazy cleanup)
      await tx
        .update(seats)
        .set({
          isReserved: false,
          reservedBy: null,
          reservedUntil: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(seats.sessionId, sessionId),
            lte(seats.reservedUntil, new Date())
          )
        )

      // 2. Selecionar assentos com lock (FOR UPDATE)
      // Isso impede que outras transações modifiquem esses assentos
      const seatsToReserve = await tx
        .select()
        .from(seats)
        .where(
          and(
            eq(seats.sessionId, sessionId),
            inArray(seats.id, seatIds)
          )
        )
        .for('update') // Lock pessimista

      // 3. Verificar se todos os assentos existem
      if (seatsToReserve.length !== seatIds.length) {
        throw new Error('Alguns assentos não foram encontrados')
      }

      // 4. Verificar se todos estão disponíveis
      const unavailable = seatsToReserve.filter(
        seat => !seat.isAvailable || seat.isReserved
      )

      if (unavailable.length > 0) {
        const unavailableLabels = unavailable.map(s => s.seatId).join(', ')
        throw new Error(`Assentos indisponíveis: ${unavailableLabels}`)
      }

      // 5. Reservar assentos
      await tx
        .update(seats)
        .set({
          isReserved: true,
          reservedBy: userId || null,
          reservedUntil,
          version: sql`${seats.version} + 1`,
          updatedAt: new Date(),
        })
        .where(inArray(seats.id, seatIds))

      // 6. Calcular total
      const totalAmount = seatsToReserve.reduce((sum, seat) => sum + seat.price, 0)

      // 7. Criar carrinho
      const [cart] = await tx
        .insert(carts)
        .values({
          userId: userId || null,
          sessionId,
          totalAmount,
          status: 'ACTIVE',
          expiresAt: reservedUntil,
        })
        .returning()

      // 8. Criar itens do carrinho
      const cartItemsData = seatsToReserve.map(seat => ({
        cartId: cart.id,
        seatId: seat.id,
        price: seat.price,
      }))

      await tx.insert(cartItems).values(cartItemsData)

      // 9. Atualizar contagem de assentos disponíveis na sessão
      await tx
        .update(sessions)
        .set({
          availableSeats: sql`${sessions.availableSeats} - ${seatIds.length}`,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId))

      return {
        success: true,
        message: 'Assentos reservados com sucesso',
        cartId: cart.id,
        reservedUntil,
        reservedSeats: seatsToReserve.map(seat => ({
          id: seat.id,
          seatId: seat.seatId,
          price: seat.price,
        })),
      }
    })
  } catch (error) {
    console.error('Erro ao reservar assentos:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao reservar assentos',
    }
  }
}

/**
 * Versão alternativa com lock otimista
 * Usa campo `version` para detectar conflitos
 */
export async function reserveSeatsOptimistic(
  sessionId: string,
  seatIds: string[],
  userId?: string,
  maxRetries = 3
): Promise<ReserveSeatResult> {
  const reservedUntil = new Date(Date.now() + RESERVATION_TIMEOUT_MINUTES * 60 * 1000)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // 1. Buscar assentos com suas versões atuais
        const seatsToReserve = await tx
          .select()
          .from(seats)
          .where(
            and(
              eq(seats.sessionId, sessionId),
              inArray(seats.id, seatIds)
            )
          )

        if (seatsToReserve.length !== seatIds.length) {
          throw new Error('Alguns assentos não foram encontrados')
        }

        const unavailable = seatsToReserve.filter(
          seat => !seat.isAvailable || seat.isReserved
        )

        if (unavailable.length > 0) {
          throw new Error(`Assentos indisponíveis: ${unavailable.map(s => s.seatId).join(', ')}`)
        }

        // 2. Tentar atualizar com verificação de versão
        for (const seat of seatsToReserve) {
          const result = await tx
            .update(seats)
            .set({
              isReserved: true,
              reservedBy: userId || null,
              reservedUntil,
              version: seat.version + 1,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(seats.id, seat.id),
                eq(seats.version, seat.version), // Verifica se versão não mudou
                eq(seats.isReserved, false) // Dupla verificação
              )
            )
            .returning()

          if (result.length === 0) {
            // Conflito detectado - a versão mudou
            throw new Error(`OPTIMISTIC_LOCK_CONFLICT:${seat.seatId}`)
          }
        }

        // 3. Criar carrinho e itens
        const totalAmount = seatsToReserve.reduce((sum, seat) => sum + seat.price, 0)

        const [cart] = await tx
          .insert(carts)
          .values({
            userId: userId || null,
            sessionId,
            totalAmount,
            status: 'ACTIVE',
            expiresAt: reservedUntil,
          })
          .returning()

        await tx.insert(cartItems).values(
          seatsToReserve.map(seat => ({
            cartId: cart.id,
            seatId: seat.id,
            price: seat.price,
          }))
        )

        await tx
          .update(sessions)
          .set({
            availableSeats: sql`${sessions.availableSeats} - ${seatIds.length}`,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId))

        return {
          success: true,
          message: 'Assentos reservados com sucesso',
          cartId: cart.id,
          reservedUntil,
          reservedSeats: seatsToReserve.map(seat => ({
            id: seat.id,
            seatId: seat.seatId,
            price: seat.price,
          })),
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      
      // Se for conflito de lock otimista, retry
      if (errorMessage.startsWith('OPTIMISTIC_LOCK_CONFLICT') && attempt < maxRetries - 1) {
        console.log(`Retry ${attempt + 1}/${maxRetries} devido a conflito`)
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1))) // Backoff
        continue
      }

      console.error('Erro ao reservar assentos (otimista):', error)
      return {
        success: false,
        message: errorMessage.replace('OPTIMISTIC_LOCK_CONFLICT:', 'Assento já foi reservado: '),
      }
    }
  }

  return {
    success: false,
    message: 'Não foi possível reservar os assentos após várias tentativas',
  }
}

/**
 * Libera assentos expirados
 * Pode ser chamado via cron job ou lazy (antes de cada reserva)
 */
export async function releaseExpiredReservations(sessionId?: string): Promise<{
  success: boolean
  releasedCount: number
}> {
  try {
    const now = new Date()

    // Construir condição base
    const conditions = [lte(seats.reservedUntil, now)]
    
    if (sessionId) {
      conditions.push(eq(seats.sessionId, sessionId))
    }

    // Buscar assentos expirados para saber quantos liberar
    const expiredSeats = await db
      .select({ id: seats.id, sessionId: seats.sessionId })
      .from(seats)
      .where(and(...conditions))

    if (expiredSeats.length === 0) {
      return { success: true, releasedCount: 0 }
    }

    // Agrupar por sessão para atualizar contagem
    const seatsBySession = expiredSeats.reduce((acc, seat) => {
      if (!acc[seat.sessionId]) acc[seat.sessionId] = 0
      acc[seat.sessionId]++
      return acc
    }, {} as Record<string, number>)

    // Liberar assentos
    await db
      .update(seats)
      .set({
        isReserved: false,
        reservedBy: null,
        reservedUntil: null,
        updatedAt: now,
      })
      .where(inArray(seats.id, expiredSeats.map(s => s.id)))

    // Atualizar contagem de disponíveis em cada sessão
    for (const [sessId, count] of Object.entries(seatsBySession)) {
      await db
        .update(sessions)
        .set({
          availableSeats: sql`${sessions.availableSeats} + ${count}`,
          updatedAt: now,
        })
        .where(eq(sessions.id, sessId))
    }

    // Expirar carrinhos associados
    await db
      .update(carts)
      .set({
        status: 'EXPIRED',
        updatedAt: now,
      })
      .where(
        and(
          eq(carts.status, 'ACTIVE'),
          lte(carts.expiresAt, now)
        )
      )

    console.log(`[Cleanup] Liberados ${expiredSeats.length} assentos expirados`)

    return {
      success: true,
      releasedCount: expiredSeats.length,
    }
  } catch (error) {
    console.error('Erro ao liberar reservas expiradas:', error)
    return { success: false, releasedCount: 0 }
  }
}

/**
 * Cancela uma reserva específica
 */
export async function cancelReservation(
  cartId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await db.transaction(async (tx) => {
      // Buscar carrinho
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .for('update')

      if (!cart) {
        throw new Error('Carrinho não encontrado')
      }

      if (cart.status !== 'ACTIVE') {
        throw new Error('Carrinho já foi processado ou expirado')
      }

      // Verificar se o usuário é o dono (se userId fornecido)
      if (userId && cart.userId && cart.userId !== userId) {
        throw new Error('Não autorizado')
      }

      // Buscar itens do carrinho
      const items = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId))

      // Liberar assentos
      if (items.length > 0) {
        await tx
          .update(seats)
          .set({
            isReserved: false,
            reservedBy: null,
            reservedUntil: null,
            updatedAt: new Date(),
          })
          .where(inArray(seats.id, items.map(i => i.seatId)))

        // Atualizar contagem na sessão
        await tx
          .update(sessions)
          .set({
            availableSeats: sql`${sessions.availableSeats} + ${items.length}`,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, cart.sessionId))
      }

      // Marcar carrinho como expirado
      await tx
        .update(carts)
        .set({
          status: 'EXPIRED',
          updatedAt: new Date(),
        })
        .where(eq(carts.id, cartId))

      return {
        success: true,
        message: 'Reserva cancelada com sucesso',
      }
    })
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao cancelar reserva',
    }
  }
}
