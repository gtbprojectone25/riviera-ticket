import type { seats } from '@/db/schema'

export type SeatStateStatus = 'AVAILABLE' | 'HELD' | 'SOLD'

export type SeatStateDTO = {
  id: string
  seatId: string
  seat_id: string
  row: string
  number: number
  type: string
  status: SeatStateStatus
  heldUntil: string | null
  heldByCartId: string | null
  soldAt: string | null
  soldCartId: string | null
}

type SeatRow = typeof seats.$inferSelect

export function toSeatStateDTO(seat: SeatRow, now = new Date()): SeatStateDTO {
  const isSold =
    seat.status === 'SOLD' ||
    Boolean(seat.soldAt) ||
    Boolean(seat.soldCartId)

  const isHeldActive =
    !isSold &&
    seat.status === 'HELD' &&
    Boolean(seat.heldByCartId) &&
    Boolean(seat.heldUntil) &&
    Boolean(seat.heldUntil && seat.heldUntil > now)

  const status: SeatStateStatus = isSold
    ? 'SOLD'
    : isHeldActive
      ? 'HELD'
      : 'AVAILABLE'

  return {
    id: seat.id,
    seatId: seat.seatId,
    seat_id: seat.seatId,
    row: seat.row,
    number: seat.number,
    type: seat.type,
    status,
    heldUntil: isHeldActive && seat.heldUntil ? seat.heldUntil.toISOString() : null,
    heldByCartId: isHeldActive ? seat.heldByCartId ?? null : null,
    soldAt: isSold && seat.soldAt ? seat.soldAt.toISOString() : null,
    soldCartId: isSold ? seat.soldCartId ?? null : null,
  }
}

export function toSeatStateRows(seatRows: SeatRow[], now = new Date()) {
  const seatMap = new Map<string, SeatStateDTO[]>()

  for (const seat of seatRows) {
    const dto = toSeatStateDTO(seat, now)
    const rowLabel = dto.row
    if (!seatMap.has(rowLabel)) {
      seatMap.set(rowLabel, [])
    }
    seatMap.get(rowLabel)!.push(dto)
  }

  return Array.from(seatMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, seats]) => ({
      label,
      seats: seats.sort((a, b) => Number(a.number) - Number(b.number)),
    }))
}
