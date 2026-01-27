/**
 * Seat reservation facade
 * Single source of truth: db/queries
 */

import { holdSeats as holdSeatsCore, releaseExpiredReservations as releaseExpiredReservationsCore } from '@/db/queries'

export type HoldSeatsResult = {
  success: boolean
  message: string
  heldUntil?: Date
  heldSeatIds?: string[]
}

export async function holdSeats(
  cartId: string,
  seatIds: string[],
  ttlMinutes = 10,
): Promise<HoldSeatsResult> {
  try {
    const result = await holdSeatsCore(cartId, seatIds, ttlMinutes)
    return {
      success: true,
      message: 'Assentos reservados com sucesso',
      heldUntil: result.heldUntil,
      heldSeatIds: result.heldSeatIds,
    }
  } catch (error) {
    const message = error instanceof Error && error.message === 'SEAT_OCCUPIED'
      ? 'Alguns assentos ja estao ocupados'
      : 'Erro ao reservar assentos'
    return { success: false, message }
  }
}

export async function releaseExpiredReservations(): Promise<{
  success: boolean
  releasedCount: number
}> {
  try {
    const released = await releaseExpiredReservationsCore()
    return { success: true, releasedCount: released.length }
  } catch (error) {
    console.error('Erro ao liberar reservas expiradas:', error)
    return { success: false, releasedCount: 0 }
  }
}
