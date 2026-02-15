'use client'

import { useMemo } from 'react'
import type { Seat, Ticket, TicketType } from './types'

export type SeatDisabledReason = 'SOLD' | 'HELD' | 'NO_SLOT'

export type SeatUiState = {
  disabled: boolean
  reason: SeatDisabledReason | null
  isSelected: boolean
}

type ToggleAction =
  | { kind: 'blocked'; reason: SeatDisabledReason | null }
  | { kind: 'unselect'; ticketId: string; seatId: string }
  | { kind: 'select'; ticketId: string; seatId: string }

type UseSeatSelectionManagerParams = {
  tickets: Ticket[]
  seats: Seat[]
  cartId?: string | null
  maxTotalSlots?: number
}

function seatSlotType(seat: Seat): TicketType {
  return seat.type === 'VIP' ? 'VIP' : 'STANDARD'
}

function isHeldByOther(seat: Seat, cartId?: string | null) {
  if (seat.status !== 'HELD') return false
  const heldUntil = seat.heldUntil ? new Date(seat.heldUntil) : null
  const holdStillActive = heldUntil ? heldUntil.getTime() > Date.now() : true
  if (!holdStillActive) return false
  if (!seat.heldByCartId) return true
  return seat.heldByCartId !== cartId
}

export function useSeatSelectionManager({
  tickets,
  seats,
  cartId = null,
  maxTotalSlots = 4,
}: UseSeatSelectionManagerParams) {
  const ticketSlots = useMemo(() => tickets.slice(0, maxTotalSlots), [tickets, maxTotalSlots])

  const counts = useMemo(() => {
    const totalSlotsByType: Record<TicketType, number> = { VIP: 0, STANDARD: 0 }
    const selectedByType: Record<TicketType, number> = { VIP: 0, STANDARD: 0 }
    let totalSelected = 0

    for (const ticket of ticketSlots) {
      totalSlotsByType[ticket.type] += 1
      if (ticket.assignedSeatId) {
        selectedByType[ticket.type] += 1
        totalSelected += 1
      }
    }

    const remainingSlotsByType: Record<TicketType, number> = {
      VIP: Math.max(0, totalSlotsByType.VIP - selectedByType.VIP),
      STANDARD: Math.max(0, totalSlotsByType.STANDARD - selectedByType.STANDARD),
    }

    return {
      totalSlotsByType,
      selectedByType,
      remainingSlotsByType,
      totalSelected,
      totalSlots: ticketSlots.length,
    }
  }, [ticketSlots])

  const selectedSeatIdSet = useMemo(
    () => new Set(ticketSlots.filter((t) => t.assignedSeatId).map((t) => t.assignedSeatId as string)),
    [ticketSlots],
  )

  const seatById = useMemo(() => {
    const map = new Map<string, Seat>()
    for (const seat of seats) map.set(seat.id, seat)
    return map
  }, [seats])

  const ticketBySeatId = useMemo(() => {
    const map = new Map<string, Ticket>()
    for (const ticket of ticketSlots) {
      if (ticket.assignedSeatId) map.set(ticket.assignedSeatId, ticket)
    }
    return map
  }, [ticketSlots])

  const seatUiStateById = useMemo(() => {
    const map = new Map<string, SeatUiState>()

    for (const seat of seats) {
      const isSelected = selectedSeatIdSet.has(seat.id)
      if (isSelected) {
        map.set(seat.id, { isSelected: true, disabled: false, reason: null })
        continue
      }

      if (seat.status === 'SOLD') {
        map.set(seat.id, { isSelected: false, disabled: true, reason: 'SOLD' })
        continue
      }

      if (isHeldByOther(seat, cartId)) {
        map.set(seat.id, { isSelected: false, disabled: true, reason: 'HELD' })
        continue
      }

      const slotType = seatSlotType(seat)
      if (counts.remainingSlotsByType[slotType] <= 0) {
        map.set(seat.id, { isSelected: false, disabled: true, reason: 'NO_SLOT' })
        continue
      }

      map.set(seat.id, { isSelected: false, disabled: false, reason: null })
    }

    return map
  }, [cartId, counts.remainingSlotsByType, seats, selectedSeatIdSet])

  const seatUiState = (seat: Seat): SeatUiState =>
    seatUiStateById.get(seat.id) ?? { isSelected: false, disabled: true, reason: 'NO_SLOT' }

  const canSelectSeat = (seat: Seat) => !seatUiState(seat).disabled

  const resolveToggleSeat = (seatId: string): ToggleAction => {
    const ticketForSeat = ticketBySeatId.get(seatId)
    if (ticketForSeat) {
      return { kind: 'unselect', ticketId: ticketForSeat.id, seatId }
    }

    const seat = seatById.get(seatId)
    if (!seat) return { kind: 'blocked', reason: 'NO_SLOT' }

    const state = seatUiState(seat)
    if (state.disabled) return { kind: 'blocked', reason: state.reason }

    const type = seatSlotType(seat)
    const availableTicket = ticketSlots.find((ticket) => !ticket.assignedSeatId && ticket.type === type)

    if (!availableTicket) {
      return { kind: 'blocked', reason: 'NO_SLOT' }
    }

    return {
      kind: 'select',
      ticketId: availableTicket.id,
      seatId,
    }
  }

  return {
    ticketSlots,
    counts,
    canSelectSeat,
    seatUiState,
    seatUiStateById,
    resolveToggleSeat,
  }
}
