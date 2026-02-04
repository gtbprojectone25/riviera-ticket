'use server'

import { db } from '@/db'
import { seats as seatsTable, sessions, auditoriums, type AuditoriumLayout } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

type DbClient = typeof db
type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbInstance = DbClient | DbTransaction

type SeatType = 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'GAP'
type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD'

type DetailedSeat = {
  id?: string
  row: string
  number: number
  type: SeatType
  status?: SeatStatus
  heldUntil?: string | null
  heldByCartId?: string | null
  soldAt?: string | null
}

export async function generateSeatsForSession(sessionId: string, options?: { dbClient?: DbInstance }) {
  const client = options?.dbClient ?? db
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(sessionId)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[generateSeatsForSession] invalid sessionId', { sessionId, length: sessionId?.length ?? 0 })
    }
    throw new Error(`INVALID_SESSION_ID: ${sessionId}`)
  }

  const clientWithTx = client as any
  const supportsTransaction = typeof clientWithTx.transaction === 'function'

  if (supportsTransaction) {
    try {
      return await clientWithTx.transaction(async (trx: DbTransaction) => {
        return generateSeatsInternal(trx, sessionId)
      })
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('No transactions support in neon-http driver')) {
        throw err
      }
      // Fallback to non-transactional execution for neon-http driver
    }
  }

  return generateSeatsInternal(client, sessionId)
}

async function generateSeatsInternal(client: DbInstance, sessionId: string) {
  // 1. Buscar sessão com preços e auditoriumId
  const [session] = await client
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

  const [auditorium] = await client
    .select()
    .from(auditoriums)
    .where(eq(auditoriums.id, session.auditoriumId))
    .limit(1)

  if (!auditorium) {
    throw new Error('Auditorium not found')
  }

  const layout = (auditorium.seatMapConfig ?? auditorium.layout) as AuditoriumLayout | null

  if (!layout) {
    const err = new Error('Sala sem layout configurado')
    ;(err as any).code = 'NO_LAYOUT'
    throw err
  }

  const effectiveLayout = layout

  const basePrice = session.basePrice
  const vipPrice = session.vipPrice

  const existingCountResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(seatsTable)
    .where(eq(seatsTable.sessionId, session.id))
    .limit(1)

  const existingCount = Number(existingCountResult[0]?.count ?? 0)
  if (existingCount > 0) {
    return { created: 0, skipped: true }
  }

  const seatsToInsert: (typeof seatsTable.$inferInsert)[] = []

  if (effectiveLayout?.rows && Array.isArray(effectiveLayout.rows) && effectiveLayout.rows.length > 0) {
    for (const rowConfig of effectiveLayout.rows) {
      const rowLabel = rowConfig.label
      for (const seat of rowConfig.seats as DetailedSeat[]) {
        if (seat.type === 'GAP') continue

        const seatRow = seat.row || rowLabel
        const seatNumber = seat.number
        const seatKey = seat.id || `${seatRow}${seatNumber}`

        let status: SeatStatus = seat.status ?? 'AVAILABLE'
        let heldUntil: Date | null = null
        let heldByCartId: string | null = seat.heldByCartId ?? null
        let soldAt: Date | null = null

        if (status === 'HELD') {
          if (!seat.heldUntil || !heldByCartId) {
            status = 'AVAILABLE'
            heldByCartId = null
          } else {
            heldUntil = new Date(seat.heldUntil)
          }
        }

        if (status === 'SOLD') {
          soldAt = seat.soldAt ? new Date(seat.soldAt) : new Date()
        }

        const price =
          seat.type === 'VIP'
            ? vipPrice
            : seat.type === 'STANDARD' || seat.type === 'WHEELCHAIR'
              ? basePrice
              : 0

        seatsToInsert.push({
          sessionId: session.id,
          row: seatRow,
          number: seatNumber,
          seatId: seatKey,
          status,
          heldUntil,
          heldByCartId,
          soldAt,
          isAvailable: status === 'AVAILABLE',
          isReserved: status === 'HELD',
          reservedBy: null,
          reservedUntil: null,
          type: seat.type as any,
          price,
        })
      }
    }
  } else {
    // Caso: layout clássico (rowsConfig + vipZones + accessible)
    const accessibleMap = new Map<string, Set<number>>()
    for (const acc of effectiveLayout.accessible ?? []) {
      accessibleMap.set(acc.row, new Set(acc.seats))
    }

    const vipRowRanges = new Map<string, { start: number; end: number }[]>()
    for (const zone of effectiveLayout.vipZones ?? []) {
      for (const row of zone.rows) {
        const configsForRow = effectiveLayout.rowsConfig?.find((r) => r.row === row)
        if (!configsForRow) continue
        const seatCount = configsForRow.seatCount
        const startIndex = Math.floor(zone.fromPercent * seatCount) + 1
        const endIndex = Math.ceil(zone.toPercent * seatCount)

        const ranges = vipRowRanges.get(row) ?? []
        ranges.push({ start: startIndex, end: endIndex })
        vipRowRanges.set(row, ranges)
      }
    }

    for (const rowConfig of effectiveLayout.rowsConfig ?? []) {
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
          isAvailable: true,
          isReserved: false,
          reservedBy: null,
          reservedUntil: null,
          type: seatType as any,
          price,
        })
      }
    }
  }

  if (seatsToInsert.length === 0) {
    return { created: 0, skipped: false }
  }

  const inserted = await client
    .insert(seatsTable)
    .values(seatsToInsert)
    .onConflictDoNothing({ target: [seatsTable.sessionId, seatsTable.seatId] })
    .returning({ seatId: seatsTable.seatId })

  const created = inserted.length
  const skipped = seatsToInsert.length > created

  return { created, skipped }
}
