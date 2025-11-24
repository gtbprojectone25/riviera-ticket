'use server'

import { db } from '@/db'
import { sessions, seats, carts, cartItems } from '@/db/schema'
import { eq, and, lte, inArray } from 'drizzle-orm'
import { z } from 'zod'



type SelectedSeat = {
  id: string
  price: number
  type: 'STANDARD' | 'VIP' | 'PREMIUM'
}

const reserveSeatSchema = z.object({
  sessionId: z.string(),
  seatIds: z.array(z.string()),
  userId: z.string().optional()
})

export async function getAvailableSeats(sessionId: string) {
  try {
    // Buscar todos os assentos da sessão
    const allSeats = await db.select().from(seats).where(eq(seats.sessionId, sessionId))

    // Mapear assentos com status de disponibilidade
    const availableSeats = allSeats.map(seat => ({
      id: seat.id,
      sessionId,
      row: seat.row,
      number: seat.number,
      seatId: seat.seatId,
      isAvailable: seat.isAvailable && !seat.isReserved,
      isReserved: seat.isReserved,
      price: seat.price,
      type: seat.type
    }))

    return {
      success: true,
      seats: availableSeats
    }

  } catch (error) {
    console.error('Erro ao buscar assentos:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function reserveSeats(data: z.infer<typeof reserveSeatSchema>) {
  try {
    const validatedData = reserveSeatSchema.parse(data)
    const { sessionId, seatIds, userId } = validatedData

    // Verificar se assentos ainda estão disponíveis
    const seatsToReserve = await db
      .select()
      .from(seats)
      .where(
        and(
          eq(seats.sessionId, sessionId),
          inArray(seats.id, seatIds),
          eq(seats.isAvailable, true),
          eq(seats.isReserved, false)
        )
      )

    if (seatsToReserve.length !== seatIds.length) {
      return {
        success: false,
        message: 'Alguns assentos já foram reservados'
      }
    }

    // Reservar assentos temporariamente (10 minutos)
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000)
    
    await db
      .update(seats)
      .set({
        isReserved: true,
        reservedBy: userId || null,
        reservedUntil,
        updatedAt: new Date()
      })
      .where(inArray(seats.id, seatIds))

    return {
      success: true,
      message: 'Assentos reservados com sucesso'
    }

  } catch (error) {
    console.error('Erro ao reservar assentos:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function createCart(userId: string | null, sessionId: string, selectedSeats: SelectedSeat[]) {
  try {
    // Calcular total
    const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0)

    // Criar carrinho
    const cart = await db.insert(carts).values({
      userId,
      sessionId,
      totalAmount,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    }).returning()

    // Adicionar itens ao carrinho
    const cartItemsData = selectedSeats.map(seat => ({
      cartId: cart[0].id,
      seatId: seat.id,
      price: seat.price
    }))

    await db.insert(cartItems).values(cartItemsData)

    return {
      success: true,
      cartId: cart[0].id,
      message: 'Carrinho criado com sucesso'
    }

  } catch (error) {
    console.error('Erro ao criar carrinho:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function getShowtimes(cinemaName?: string) {
  try {
    const query = db.select().from(sessions)
    
    // Aplicar filtro se fornecido
    const sessionsList = cinemaName 
      ? await query.where(eq(sessions.cinemaName, cinemaName)).limit(20)
      : await query.limit(20)

    return {
      success: true,
      showtimes: sessionsList
    }

  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function clearExpiredReservations() {
  try {
    const now = new Date()
    
    await db
      .update(seats)
      .set({
        isReserved: false,
        reservedBy: null,
        reservedUntil: null,
        updatedAt: now
      })
      .where(lte(seats.reservedUntil, now))

    return { success: true }

  } catch (error) {
    console.error('Erro ao limpar reservas expiradas:', error)
    return { success: false }
  }
}

export async function getSessionById(sessionId: string) {
  try {
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (session.length === 0) {
      return {
        success: false,
        message: 'Sessão não encontrada'
      }
    }

    return {
      success: true,
      session: session[0]
    }

  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}