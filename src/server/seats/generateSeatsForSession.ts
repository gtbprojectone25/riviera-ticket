'use server'

import { db } from '@/db'
import { sessions, auditoriums, seats, type AuditoriumLayout } from '@/db/schema'
import { eq } from 'drizzle-orm'

type SeatType = 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'GAP'

export async function generateSeatsForSession(sessionId: string) {
  // 1. Buscar sessão com preços e auditoriumId
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) {
    throw new Error('Session not found')
  }

  if (!session.auditoriumId) {
    throw new Error('Session is missing auditoriumId')
  }

  const [auditorium] = await db
    .select()
    .from(auditoriums)
    .where(eq(auditoriums.id, session.auditoriumId))
    .limit(1)

  if (!auditorium) {
    throw new Error('Auditorium not found')
  }

  const layout = auditorium.layout as AuditoriumLayout

  const seatsToInsert: (typeof seats.$inferInsert)[] = []

  const basePrice = session.basePrice
  const vipPrice = session.vipPrice

  const accessibleMap = new Map<string, Set<number>>()
  for (const acc of layout.accessible ?? []) {
    accessibleMap.set(acc.row, new Set(acc.seats))
  }

  const vipRowRanges = new Map<string, { start: number; end: number }[]>()
  for (const zone of layout.vipZones ?? []) {
    for (const row of zone.rows) {
      const configsForRow = layout.rowsConfig.find((r) => r.row === row)
      if (!configsForRow) continue
      const seatCount = configsForRow.seatCount
      const startIndex = Math.floor(zone.fromPercent * seatCount) + 1
      const endIndex = Math.ceil(zone.toPercent * seatCount)

      const ranges = vipRowRanges.get(row) ?? []
      ranges.push({ start: startIndex, end: endIndex })
      vipRowRanges.set(row, ranges)
    }
  }

  for (const rowConfig of layout.rowsConfig) {
    const { row, seatCount } = rowConfig
    const vipRanges = vipRowRanges.get(row) ?? []
    const accessibleSeats = accessibleMap.get(row) ?? new Set<number>()

    for (let number = 1; number <= seatCount; number++) {
      let seatType: SeatType = 'STANDARD'

      const isVip = vipRanges.some(
        (r) => number >= r.start && number <= r.end,
      )

      if (accessibleSeats.has(number)) {
        seatType = 'WHEELCHAIR'
      } else if (isVip) {
        seatType = 'VIP'
      } else {
        seatType = 'STANDARD'
      }

      // GAP não é usado neste fluxo - todos os assentos são válidos
      const isGap = false

      const price =
        seatType === 'VIP'
          ? vipPrice
          : seatType === 'STANDARD' || seatType === 'WHEELCHAIR'
            ? basePrice
            : 0

      const seatId = `${row}${number}`

      seatsToInsert.push({
        sessionId: session.id,
        row,
        number,
        seatId,
        isAvailable: !isGap,
        isReserved: false,
        reservedBy: null,
        reservedUntil: null,
        // Cast necessário porque o enum TypeScript não conhece WHEELCHAIR/GAP aqui
        type: seatType as any,
        price,
      })
    }
  }

  if (seatsToInsert.length === 0) {
    return { created: 0 }
  }

  await db.insert(seats).values(seatsToInsert)

  return { created: seatsToInsert.length }
}

