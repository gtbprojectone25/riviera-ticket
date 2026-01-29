'use server'

import { db } from '@/db'
import { holdSeats, releaseExpiredReservations } from '@/db/queries'
import { sessions, seats, carts, cartItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

type SeatRow = typeof seats.$inferSelect
export type SelectedSeat = {
  id: string
  price: number
  type: SeatRow['type']
}

const HOLD_MINUTES = 10

const reserveSeatSchema = z.object({
  sessionId: z.string(),
  seatIds: z.array(z.string()),
  userId: z.string().optional()
})

export async function getAvailableSeats(sessionId: string) {
  try {
    // Buscar todos os assentos da sessão
    const allSeats = (await db
      .select()
      .from(seats)
      .where(eq(seats.sessionId, sessionId))) as SeatRow[]

    // Mapear assentos com status de disponibilidade
    const now = new Date()
    const availableSeats = allSeats.map((seat: SeatRow) => {
      const status = seat.status
      const isHeld = status === 'HELD' && seat.heldUntil && seat.heldUntil > now
      const isSold = status === 'SOLD'
      const isAvailable = !isHeld && !isSold

      return ({
        id: seat.id,
        sessionId,
        row: seat.row,
        number: seat.number,
        seatId: seat.seatId,
        isAvailable,
        isReserved: isHeld,
        price: seat.price,
        type: seat.type
      })
    })

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

    const uniqueSeatIds = Array.from(new Set(seatIds))
    if (uniqueSeatIds.length === 0) {
      return {
        success: false,
        message: 'Nenhum assento selecionado'
      }
    }

    const resolvedSeats: SelectedSeat[] = []
    const uuidRegex = /^[0-9a-fA-F-]{8}-[0-9a-fA-F-4]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

    for (const seatId of uniqueSeatIds) {
      if (uuidRegex.test(seatId)) {
        const [dbSeat] = await db
          .select()
          .from(seats)
          .where(and(eq(seats.id, seatId), eq(seats.sessionId, sessionId)))
          .limit(1)

        if (!dbSeat) {
          throw new Error(`Assento nao encontrado no banco: ${seatId}`)
        }

        resolvedSeats.push({
          id: dbSeat.id,
          price: dbSeat.price,
          type: dbSeat.type,
        })
        continue
      }

      const [dbSeat] = await db
        .select()
        .from(seats)
        .where(
          and(
            eq(seats.sessionId, sessionId),
            eq(seats.seatId, seatId)
          )
        )
        .limit(1)

      if (!dbSeat) {
        throw new Error(`Assento nao encontrado no banco: ${seatId}`)
      }

      resolvedSeats.push({
        id: dbSeat.id,
        price: dbSeat.price,
        type: dbSeat.type,
      })
    }

    const result = await createCart(userId ?? null, sessionId, resolvedSeats)

    if (!result.success) {
      return result
    }

    return {
      success: true,
      message: 'Assentos reservados com sucesso',
      cartId: result.cartId,
      heldUntil: result.heldUntil,
    }

  } catch (error) {
    console.error('Erro ao reservar assentos:', error)
    return {
      success: false,
      message: error instanceof Error && error.message === 'SEAT_OCCUPIED'
        ? 'Alguns assentos ja estao ocupados'
        : 'Erro interno do servidor'
    }
  }
}

export async function createCart(userId: string | null, sessionId: string, selectedSeats: SelectedSeat[]) {
  try {
    if (selectedSeats.length === 0) {
      return {
        success: false,
        message: 'Nenhum assento selecionado'
      }
    }

    const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
    const uuidRegex = /^[0-9a-fA-F-]{8}-[0-9a-fA-F-4]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

    const createCartWithClient = async (tx: typeof db) => {
      const now = new Date()
      const heldUntil = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000)

      const resolvedSeats: Array<{ seatId: string; price: number }> = []

      for (const seat of selectedSeats) {
        let dbSeatId = seat.id

        if (!uuidRegex.test(dbSeatId)) {
          const match = seat.id.match(/^([A-Za-z]+)(\d+)$/)
          if (!match) {
            throw new Error(`Formato de assento invalido: ${seat.id}`)
          }

          const [, row, numStr] = match
          const seatNumber = Number(numStr)
          const paddedSeatId = `${row.toUpperCase()}${seatNumber.toString().padStart(2, '0')}`

          const [dbSeat] = await tx
            .select()
            .from(seats)
            .where(
              and(
                eq(seats.sessionId, sessionId),
                eq(seats.seatId, paddedSeatId)
              )
            )
            .limit(1)

          if (!dbSeat) {
            throw new Error(`Assento nao encontrado no banco: ${paddedSeatId}`)
          }

          dbSeatId = dbSeat.id
        }

        resolvedSeats.push({
          seatId: dbSeatId,
          price: seat.price
        })
      }

      const seatIds = resolvedSeats.map((seat) => seat.seatId)
      const uniqueSeatIds = Array.from(new Set(seatIds))
      if (uniqueSeatIds.length !== seatIds.length) {
        throw new Error('Assentos duplicados no carrinho')
      }

      const [cart] = await tx.insert(carts).values({
        userId,
        sessionId,
        totalAmount,
        status: 'ACTIVE',
        expiresAt: heldUntil
      }).returning()

      const cartItemsData = resolvedSeats.map((seat) => ({
        cartId: cart.id,
        seatId: seat.seatId,
        price: seat.price
      }))

      if (cartItemsData.length > 0) {
        await tx.insert(cartItems).values(cartItemsData)
      }

      const holdResult = await holdSeats(cart.id, uniqueSeatIds, HOLD_MINUTES, tx)

      return {
        cartId: cart.id,
        heldUntil: holdResult.heldUntil
      }
    }

    let result: { cartId: string; heldUntil: Date }
    try {
      result = await db.transaction(async (tx) => {
        return await createCartWithClient(tx as unknown as typeof db)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('No transactions support')) {
        result = await createCartWithClient(db)
      } else {
        throw error
      }
    }

    return {
      success: true,
      cartId: result.cartId,
      message: 'Carrinho criado com sucesso',
      heldUntil: result.heldUntil
    }

  } catch (error) {
    console.error('Erro ao criar carrinho:', error)
    return {
      success: false,
      message: error instanceof Error && error.message === 'SEAT_OCCUPIED'
        ? 'Alguns assentos ja estao ocupados'
        : 'Erro interno do servidor'
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
    await releaseExpiredReservations()

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


