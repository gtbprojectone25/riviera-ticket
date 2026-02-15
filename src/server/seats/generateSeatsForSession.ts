'use server'

import { db } from '@/db'
import { seats as seatsTable, sessions, auditoriums, type AuditoriumLayout } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { buildExpectedSeatsFromLayout } from './expectedSeats'

type DbClient = typeof db
type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbInstance = DbClient | DbTransaction

export async function generateSeatsForSession(sessionId: string, options?: { dbClient?: DbInstance }) {
  const client = options?.dbClient ?? db
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(sessionId)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ensureSeatsForSession] invalid sessionId', { sessionId, length: sessionId?.length ?? 0 })
    }
    throw new Error(`INVALID_SESSION_ID: ${sessionId}`)
  }

  const clientWithTx = client as { transaction?: DbClient['transaction'] }
  const supportsTransaction = typeof clientWithTx.transaction === 'function'

  if (supportsTransaction) {
    try {
      return await clientWithTx.transaction!(async (trx: DbTransaction) => {
        return ensureSeatsInternal(trx, sessionId)
      })
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('No transactions support in neon-http driver')) {
        throw err
      }
      // Fallback for neon-http driver without transaction support.
    }
  }

  return ensureSeatsInternal(client, sessionId)
}

export async function ensureSeatsForSession(sessionId: string, options?: { dbClient?: DbInstance }) {
  return generateSeatsForSession(sessionId, options)
}

async function ensureSeatsInternal(client: DbInstance, sessionId: string) {
  const [session] = await client
    .select({
      id: sessions.id,
      auditoriumId: sessions.auditoriumId,
      basePrice: sessions.basePrice,
      vipPrice: sessions.vipPrice,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) {
    throw new Error('SESSION_NOT_FOUND')
  }

  if (!session.auditoriumId) {
    throw new Error('SESSION_MISSING_AUDITORIUM')
  }

  const [auditorium] = await client
    .select({ layout: auditoriums.layout, seatMapConfig: auditoriums.seatMapConfig })
    .from(auditoriums)
    .where(eq(auditoriums.id, session.auditoriumId))
    .limit(1)

  if (!auditorium) {
    throw new Error('AUDITORIUM_NOT_FOUND')
  }

  const layout = (auditorium.seatMapConfig ?? auditorium.layout) as AuditoriumLayout | null
  const expectedSeats = buildExpectedSeatsFromLayout(layout, session.basePrice, session.vipPrice)
  if (expectedSeats.length === 0) {
    return { created: 0, skipped: false, expected: 0 }
  }

  const existing = await client
    .select({ row: seatsTable.row, number: seatsTable.number, seatId: seatsTable.seatId })
    .from(seatsTable)
    .where(eq(seatsTable.sessionId, session.id))

  const existingSeatIds = new Set(existing.map((seat) => seat.seatId))
  const existingCoords = new Set(existing.map((seat) => `${seat.row.toUpperCase()}|${seat.number}`))

  const inserts = expectedSeats
    .filter((seat) => !existingSeatIds.has(seat.seatId) && !existingCoords.has(`${seat.row}|${seat.number}`))
    .map((seat) => ({
      sessionId: session.id,
      row: seat.row,
      number: seat.number,
      seatId: seat.seatId,
      status: 'AVAILABLE' as const,
      type: seat.type,
      price: seat.price,
    }))

  if (inserts.length === 0) {
    return { created: 0, skipped: true, expected: expectedSeats.length }
  }

  const inserted = await client
    .insert(seatsTable)
    .values(inserts)
    .onConflictDoNothing({ target: [seatsTable.sessionId, seatsTable.seatId] })
    .returning({ seatId: seatsTable.seatId })

  const created = inserted.length

  return {
    created,
    skipped: created < inserts.length,
    expected: expectedSeats.length,
  }
}
