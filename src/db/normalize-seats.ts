import { and, desc, eq, inArray, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { auditoriums, seats, sessions, tickets, type AuditoriumLayout } from '@/db/schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import { buildExpectedSeatsFromLayout } from '@/server/seats/expectedSeats'

type SeatType = 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'GAP' | 'PREMIUM'

type ExpectedSeat = {
  row: string
  number: number
  seatId: string
  type: Exclude<SeatType, 'GAP'>
  price: number
}

type SessionNormalizationReport = {
  sessionId: string
  auditoriumId: string | null
  expectedCount: number
  realCount: number
  normalizedStateCount: number
  missingCount: number
  updatedCount: number
  deletableExtrasCount: number
  protectedExtrasCount: number
  protectedByTicketCount: number
  protectedBySoldStatusCount: number
  protectedBySoldCartCount: number
  protectedByActiveHoldCount: number
  duplicateCoordinates: number
  duplicateSeatIds: number
  skippedSeatIdConflicts: number
  expectedByType: Record<string, number>
  realByTypeStatus: Record<string, number>
  txMode: 'transaction' | 'fallback'
}

type TxPolicy = 'auto' | 'required'

type DbClient = typeof db
const SERIALIZATION_ERROR_CODE = '40001'
const TX_RETRY_MAX_ATTEMPTS = 5

function getNumberFlag(name: string, fallback: number) {
  const prefix = `${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))
  if (!raw) return fallback
  const parsed = Number(raw.slice(prefix.length))
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function getStringFlag(name: string): string | null {
  const prefix = `${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))
  return raw ? raw.slice(prefix.length) : null
}

function loadEnvLocal() {
  const env = process.env as unknown as Record<string, string | undefined>
  if (env.DATABASE_URL || env.ADMIN_DATABASE_URL || env.NORMALIZE_SEATS_DATABASE_URL) return

  try {
    const envPath = join(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=')
      if (!key || valueParts.length === 0) continue
      const trimmedKey = key.trim()
      if (!trimmedKey || trimmedKey.startsWith('#')) continue
      const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim()
      env[trimmedKey] = value
    }
  } catch {
    // no-op
  }
}

function resolveTxPolicy(): TxPolicy {
  const raw = getStringFlag('--tx')
  if (!raw) return 'auto'
  return raw === 'required' ? 'required' : 'auto'
}

function isNoTransactionSupportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('No transactions support in neon-http driver')
}

function getPgErrorCode(error: unknown) {
  if (error && typeof error === 'object') {
    const top = error as { code?: string; cause?: unknown }
    if (typeof top.code === 'string') return top.code
    if (top.cause && typeof top.cause === 'object') {
      const nested = top.cause as { code?: string }
      if (typeof nested.code === 'string') return nested.code
    }
  }
  return null
}

function isSerializationError(error: unknown) {
  return getPgErrorCode(error) === SERIALIZATION_ERROR_CODE
}

async function waitMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function looksLikePoolerUrl(url: string) {
  return url.includes('-pooler.')
}

function validateAdminDbUrl(url: string) {
  if (url.includes('...')) {
    throw new Error(
      'Invalid --admin-db-url: placeholder detected (postgresql://...). Provide a real direct database URL.',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid --admin-db-url: malformed URL.')
  }

  if (!parsed.protocol.startsWith('postgres')) {
    throw new Error('Invalid --admin-db-url: protocol must be postgresql:// or postgres://')
  }

  if (!parsed.hostname || parsed.hostname === '...') {
    throw new Error('Invalid --admin-db-url: hostname is missing.')
  }
}

const BATCH_SIZE = getNumberFlag('--batch-size', 100)
const LIMIT = getNumberFlag('--limit', Number.MAX_SAFE_INTEGER)
const DRY_RUN = process.argv.includes('--dry-run')
const TX_POLICY = resolveTxPolicy()
const NON_GAP_TYPES: Array<Exclude<SeatType, 'GAP'>> = ['STANDARD', 'VIP', 'WHEELCHAIR', 'PREMIUM']

let adminPool: Pool | null = null

function resolveAdminDbUrl(txPolicy: TxPolicy): string | null {
  const adminDbUrlFlag = getStringFlag('--admin-db-url')
  if (adminDbUrlFlag) return adminDbUrlFlag

  if (txPolicy === 'required') {
    return process.env.ADMIN_DATABASE_URL || process.env.NORMALIZE_SEATS_DATABASE_URL || null
  }

  return process.env.ADMIN_DATABASE_URL || process.env.NORMALIZE_SEATS_DATABASE_URL || null
}

function getDbClient(adminDbUrl: string | null): DbClient {
  if (!adminDbUrl) return db

  validateAdminDbUrl(adminDbUrl)

  if (!adminPool) {
    adminPool = new Pool({ connectionString: adminDbUrl })
  }

  return drizzleNeonServerless(adminPool) as unknown as DbClient
}

function normalizeRow(row: string) {
  return row.trim().toUpperCase()
}

function seatKey(row: string, number: number) {
  return `${normalizeRow(row)}|${number}`
}

function incrementCount(map: Record<string, number>, key: string, amount = 1) {
  map[key] = (map[key] ?? 0) + amount
}

function buildExpectedSeats(layout: AuditoriumLayout | null, basePrice: number, vipPrice: number): ExpectedSeat[] {
  return buildExpectedSeatsFromLayout(layout, basePrice, vipPrice)
}

async function normalizeCanonicalSeatState(
  tx: DbClient,
  sessionId: string,
): Promise<number> {
  const now = new Date()
  let normalized = 0

  const releasedInvalidHeld = await tx
    .update(seats)
    .set({
      status: 'AVAILABLE',
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.sessionId, sessionId),
        eq(seats.status, 'HELD'),
        or(
          isNull(seats.heldUntil),
          lte(seats.heldUntil, now),
          isNull(seats.heldByCartId),
        ),
      ),
    )
    .returning({ id: seats.id })

  normalized += releasedInvalidHeld.length

  const cleanedAvailable = await tx
    .update(seats)
    .set({
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.sessionId, sessionId),
        eq(seats.status, 'AVAILABLE'),
        or(
          isNotNull(seats.heldUntil),
          isNotNull(seats.heldBy),
          isNotNull(seats.heldByCartId),
        ),
      ),
    )
    .returning({ id: seats.id })

  normalized += cleanedAvailable.length

  const cleanedSold = await tx
    .update(seats)
    .set({
      heldUntil: null,
      heldBy: null,
      heldByCartId: null,
      soldAt: sql`coalesce(${seats.soldAt}, now())`,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.sessionId, sessionId),
        eq(seats.status, 'SOLD'),
        or(
          isNotNull(seats.heldUntil),
          isNotNull(seats.heldBy),
          isNotNull(seats.heldByCartId),
          isNull(seats.soldAt),
        ),
      ),
    )
    .returning({ id: seats.id })

  normalized += cleanedSold.length

  const cleanedNonSold = await tx
    .update(seats)
    .set({
      soldAt: null,
      soldCartId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(seats.sessionId, sessionId),
        ne(seats.status, 'SOLD'),
        or(isNotNull(seats.soldAt), isNotNull(seats.soldCartId)),
      ),
    )
    .returning({ id: seats.id })

  normalized += cleanedNonSold.length

  return normalized
}

async function normalizeOneSession(
  tx: DbClient,
  session: typeof sessions.$inferSelect,
  layout: AuditoriumLayout | null,
  txMode: 'transaction' | 'fallback',
): Promise<SessionNormalizationReport> {
  const normalizedStateCount = await normalizeCanonicalSeatState(tx, session.id)
  const expected = buildExpectedSeats(layout, session.basePrice, session.vipPrice)
  const expectedMap = new Map(expected.map((seat) => [seatKey(seat.row, seat.number), seat]))
  const expectedByType: Record<string, number> = {}
  for (const seat of expected) {
    incrementCount(expectedByType, seat.type)
  }

  const existing = await tx
    .select({
      id: seats.id,
      row: seats.row,
      number: seats.number,
      seatId: seats.seatId,
      type: seats.type,
      price: seats.price,
      status: seats.status,
      heldUntil: seats.heldUntil,
      heldByCartId: seats.heldByCartId,
      soldCartId: seats.soldCartId,
    })
    .from(seats)
    .where(eq(seats.sessionId, session.id))

  const existingByCoord = new Map<string, Array<(typeof existing)[number]>>()
  const existingBySeatId = new Map<string, Array<(typeof existing)[number]>>()
  const realByTypeStatus: Record<string, number> = {}

  for (const seat of existing) {
    const key = seatKey(seat.row, seat.number)
    const bucket = existingByCoord.get(key) ?? []
    bucket.push(seat)
    existingByCoord.set(key, bucket)

    const bySeatId = existingBySeatId.get(seat.seatId) ?? []
    bySeatId.push(seat)
    existingBySeatId.set(seat.seatId, bySeatId)

    incrementCount(realByTypeStatus, `${seat.type}:${seat.status}`)
  }

  let duplicateCoordinates = 0
  let duplicateSeatIds = 0
  let skippedSeatIdConflicts = 0
  const inserts: Array<typeof seats.$inferInsert> = []
  const updates: Array<{ id: string; seatId: string; type: Exclude<SeatType, 'GAP'>; price: number }> = []
  const extraCandidates: Array<(typeof existing)[number]> = []

  for (const [coord, expectedSeat] of expectedMap) {
    const bucket = existingByCoord.get(coord) ?? []
    if (bucket.length === 0) {
      inserts.push({
        sessionId: session.id,
        row: expectedSeat.row,
        number: expectedSeat.number,
        seatId: expectedSeat.seatId,
        status: 'AVAILABLE',
        type: expectedSeat.type,
        price: expectedSeat.price,
      })
      continue
    }

    if (bucket.length > 1) {
      duplicateCoordinates += 1
    }

    const keeper = [...bucket].sort((a, b) => {
      if (a.status === 'SOLD' && b.status !== 'SOLD') return -1
      if (b.status === 'SOLD' && a.status !== 'SOLD') return 1
      return 0
    })[0]

    const seatIdOwnedByOther = (existingBySeatId.get(expectedSeat.seatId) ?? []).some((entry) => entry.id !== keeper.id)
    if (
      keeper.status !== 'SOLD' &&
      !seatIdOwnedByOther &&
      (keeper.seatId !== expectedSeat.seatId || keeper.type !== expectedSeat.type || keeper.price !== expectedSeat.price)
    ) {
      updates.push({
        id: keeper.id,
        seatId: expectedSeat.seatId,
        type: expectedSeat.type,
        price: expectedSeat.price,
      })
    } else if (seatIdOwnedByOther && keeper.status !== 'SOLD') {
      skippedSeatIdConflicts += 1
    }

    const duplicates = bucket.filter((s) => s.id !== keeper.id)
    extraCandidates.push(...duplicates)
  }

  for (const [coord, bucket] of existingByCoord) {
    if (expectedMap.has(coord)) continue
    extraCandidates.push(...bucket)
  }

  for (const [, bucket] of existingBySeatId) {
    if (bucket.length > 1) {
      duplicateSeatIds += 1
    }
  }

  const uniqueExtraById = Array.from(new Map(extraCandidates.map((seat) => [seat.id, seat])).values())
  const extraIds = uniqueExtraById.map((seat) => seat.id)

  const ticketSeatIdSet = new Set<string>()
  if (extraIds.length > 0) {
    const ticketRows = await tx
      .select({ seatId: tickets.seatId })
      .from(tickets)
      .where(inArray(tickets.seatId, extraIds))

    for (const row of ticketRows) {
      ticketSeatIdSet.add(row.seatId)
    }
  }

  const now = new Date()
  const isActiveHold = (seat: (typeof existing)[number]) =>
    seat.status === 'HELD' &&
    seat.heldByCartId !== null &&
    seat.heldUntil !== null &&
    seat.heldUntil > now

  const protectedByTicket = uniqueExtraById.filter((seat) => ticketSeatIdSet.has(seat.id))
  const protectedBySoldStatus = uniqueExtraById.filter((seat) => seat.status === 'SOLD')
  const protectedBySoldCart = uniqueExtraById.filter((seat) => seat.soldCartId !== null)
  const protectedByActiveHold = uniqueExtraById.filter((seat) => isActiveHold(seat))

  const protectedIds = new Set<string>([
    ...protectedByTicket.map((seat) => seat.id),
    ...protectedBySoldStatus.map((seat) => seat.id),
    ...protectedBySoldCart.map((seat) => seat.id),
    ...protectedByActiveHold.map((seat) => seat.id),
  ])

  const protectedExtras = uniqueExtraById.filter((seat) => protectedIds.has(seat.id))
  const deletableExtras = uniqueExtraById.filter(
    (seat) =>
      !protectedIds.has(seat.id) &&
      seat.status === 'AVAILABLE' &&
      seat.heldByCartId === null &&
      seat.soldCartId === null,
  )
  const realCount = existing.filter((seat) => NON_GAP_TYPES.includes(seat.type as Exclude<SeatType, 'GAP'>)).length

  if (!DRY_RUN) {
    if (inserts.length > 0) {
      await tx.insert(seats).values(inserts).onConflictDoNothing({ target: [seats.sessionId, seats.seatId] })
    }

    for (const update of updates) {
      await tx
        .update(seats)
        .set({
          seatId: update.seatId,
          type: update.type,
          price: update.price,
          updatedAt: new Date(),
        })
        .where(and(eq(seats.id, update.id), eq(seats.status, 'AVAILABLE')))
    }

    if (deletableExtras.length > 0) {
      await tx.delete(seats).where(inArray(seats.id, deletableExtras.map((seat) => seat.id)))
    }
  }

  return {
    sessionId: session.id,
    auditoriumId: session.auditoriumId,
    expectedCount: expected.length,
    realCount,
    normalizedStateCount,
    missingCount: inserts.length,
    updatedCount: updates.length,
    deletableExtrasCount: deletableExtras.length,
    protectedExtrasCount: protectedExtras.length,
    protectedByTicketCount: protectedByTicket.length,
    protectedBySoldStatusCount: protectedBySoldStatus.length,
    protectedBySoldCartCount: protectedBySoldCart.length,
    protectedByActiveHoldCount: protectedByActiveHold.length,
    duplicateCoordinates,
    duplicateSeatIds,
    skippedSeatIdConflicts,
    expectedByType,
    realByTypeStatus,
    txMode,
  }
}

async function normalizeOneSessionWithTx(
  dbClient: DbClient,
  session: typeof sessions.$inferSelect,
  layout: AuditoriumLayout | null,
) {
  for (let attempt = 1; attempt <= TX_RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await dbClient.transaction(async (tx) => {
        await tx.execute(sql`set local transaction isolation level serializable`)
        return normalizeOneSession(tx as unknown as DbClient, session, layout, 'transaction')
      })
    } catch (error) {
      if (isSerializationError(error) && attempt < TX_RETRY_MAX_ATTEMPTS) {
        const backoff = 120 * attempt
        console.warn(
          `[normalize-seats] serialization conflict (session=${session.id}) attempt=${attempt}/${TX_RETRY_MAX_ATTEMPTS} retryInMs=${backoff}`,
        )
        await waitMs(backoff)
        continue
      }

      if (isNoTransactionSupportError(error)) {
        if (TX_POLICY === 'required') {
          throw new Error(
            'Transaction is required (--tx=required), but current DB client does not support transactions. ' +
            'Use ADMIN_DATABASE_URL (or NORMALIZE_SEATS_DATABASE_URL) or --admin-db-url with a direct (non-pooler) connection.',
          )
        }

        return await normalizeOneSession(dbClient, session, layout, 'fallback')
      }

      throw error
    }
  }

  throw new Error(`Failed to normalize session ${session.id} after ${TX_RETRY_MAX_ATTEMPTS} attempts`)
}

async function run() {
  loadEnvLocal()

  const adminDbUrl = resolveAdminDbUrl(TX_POLICY)
  const dbClient = getDbClient(adminDbUrl)
  const usingAdminUrl = Boolean(adminDbUrl)

  if (usingAdminUrl && adminDbUrl && looksLikePoolerUrl(adminDbUrl)) {
    console.warn('[normalize-seats] admin DB URL appears to be a Neon pooler URL; transactional mode may fallback.')
  }

  const startedAt = Date.now()
  console.log(
    `normalize-seats start | dryRun=${DRY_RUN} txPolicy=${TX_POLICY} batchSize=${BATCH_SIZE} limit=${LIMIT === Number.MAX_SAFE_INTEGER ? 'all' : LIMIT} adminDbUrl=${usingAdminUrl ? 'yes' : 'no'}`,
  )

  let offset = 0
  let processed = 0
  const reports: SessionNormalizationReport[] = []

  while (true) {
    const batch = await dbClient
      .select({
        session: sessions,
        auditoriumLayout: auditoriums.layout,
        auditoriumSeatMapConfig: auditoriums.seatMapConfig,
      })
      .from(sessions)
      .leftJoin(auditoriums, eq(auditoriums.id, sessions.auditoriumId))
      .orderBy(desc(sessions.createdAt))
      .limit(BATCH_SIZE)
      .offset(offset)

    if (batch.length === 0 || processed >= LIMIT) break

    for (const row of batch) {
      if (processed >= LIMIT) break
      const session = row.session
      const layout = (row.auditoriumSeatMapConfig ?? row.auditoriumLayout) as AuditoriumLayout | null

      if (!layout) {
        reports.push({
          sessionId: session.id,
          auditoriumId: session.auditoriumId,
          expectedCount: 0,
          realCount: 0,
          normalizedStateCount: 0,
          missingCount: 0,
          updatedCount: 0,
          deletableExtrasCount: 0,
          protectedExtrasCount: 0,
          protectedByTicketCount: 0,
          protectedBySoldStatusCount: 0,
          protectedBySoldCartCount: 0,
          protectedByActiveHoldCount: 0,
          duplicateCoordinates: 0,
          duplicateSeatIds: 0,
          skippedSeatIdConflicts: 0,
          expectedByType: {},
          realByTypeStatus: {},
          txMode: 'fallback',
        })
        processed += 1
        continue
      }

      const report = await normalizeOneSessionWithTx(dbClient, session, layout)
      reports.push(report)
      processed += 1
    }

    offset += batch.length
  }

  const inconsistent = reports.filter((r) =>
    r.expectedCount !== r.realCount ||
    r.normalizedStateCount > 0 ||
    r.missingCount > 0 ||
    r.updatedCount > 0 ||
    r.deletableExtrasCount > 0 ||
    r.duplicateCoordinates > 0 ||
    r.duplicateSeatIds > 0 ||
    r.skippedSeatIdConflicts > 0 ||
    r.protectedExtrasCount > 0,
  )

  const totals = reports.reduce(
    (acc, cur) => {
      acc.sessions += 1
      acc.normalizedState += cur.normalizedStateCount
      acc.missing += cur.missingCount
      acc.updated += cur.updatedCount
      acc.deletableExtras += cur.deletableExtrasCount
      acc.protectedExtras += cur.protectedExtrasCount
      acc.protectedByTicket += cur.protectedByTicketCount
      acc.protectedBySoldStatus += cur.protectedBySoldStatusCount
      acc.protectedBySoldCart += cur.protectedBySoldCartCount
      acc.protectedByActiveHold += cur.protectedByActiveHoldCount
      acc.duplicateCoordinates += cur.duplicateCoordinates
      acc.duplicateSeatIds += cur.duplicateSeatIds
      acc.skippedSeatIdConflicts += cur.skippedSeatIdConflicts
      return acc
    },
    {
      sessions: 0,
      normalizedState: 0,
      missing: 0,
      updated: 0,
      deletableExtras: 0,
      protectedExtras: 0,
      protectedByTicket: 0,
      protectedBySoldStatus: 0,
      protectedBySoldCart: 0,
      protectedByActiveHold: 0,
      duplicateCoordinates: 0,
      duplicateSeatIds: 0,
      skippedSeatIdConflicts: 0,
    },
  )

  const correctedSessions = reports.filter(
    (r) =>
      r.normalizedStateCount > 0 ||
      r.missingCount > 0 ||
      r.updatedCount > 0 ||
      r.deletableExtrasCount > 0,
  ).length

  console.log('\nSeat normalization report')
  console.log({
    sessionsProcessed: totals.sessions,
    inconsistentSessions: inconsistent.length,
    correctedSessions,
    normalizedSeatStates: totals.normalizedState,
    missingSeats: totals.missing,
    updatedSeats: totals.updated,
    deletableExtras: totals.deletableExtras,
    protectedExtras: totals.protectedExtras,
    protectedByTicket: totals.protectedByTicket,
    protectedBySoldStatus: totals.protectedBySoldStatus,
    protectedBySoldCart: totals.protectedBySoldCart,
    protectedByActiveHold: totals.protectedByActiveHold,
    duplicateCoordinates: totals.duplicateCoordinates,
    duplicateSeatIds: totals.duplicateSeatIds,
    skippedSeatIdConflicts: totals.skippedSeatIdConflicts,
    elapsedMs: Date.now() - startedAt,
  })

  const recomputedProtectedExtras = reports.reduce((sum, report) => sum + report.protectedExtrasCount, 0)
  if (recomputedProtectedExtras !== totals.protectedExtras) {
    console.warn(
      `[normalize-seats] protectedExtras mismatch detected summary=${totals.protectedExtras} recomputed=${recomputedProtectedExtras}`,
    )
  }

  if (inconsistent.length > 0) {
    console.log('\nInconsistent sessions (top 50):')
    console.table(
      inconsistent.slice(0, 50).map((r) => ({
        sessionId: r.sessionId,
        auditoriumId: r.auditoriumId,
        expected: r.expectedCount,
        real: r.realCount,
        normalizedState: r.normalizedStateCount,
        missing: r.missingCount,
        updated: r.updatedCount,
        extrasDelete: r.deletableExtrasCount,
        extrasProtected: r.protectedExtrasCount,
        protectedByTicket: r.protectedByTicketCount,
        protectedBySoldStatus: r.protectedBySoldStatusCount,
        protectedBySoldCart: r.protectedBySoldCartCount,
        protectedByActiveHold: r.protectedByActiveHoldCount,
        duplicateCoords: r.duplicateCoordinates,
        duplicateSeatIds: r.duplicateSeatIds,
        skippedSeatIdConflicts: r.skippedSeatIdConflicts,
        expectedByType: JSON.stringify(r.expectedByType),
        realByTypeStatus: JSON.stringify(r.realByTypeStatus),
        txMode: r.txMode,
      })),
    )
  }

  if (DRY_RUN) {
    console.log('\nDry-run completed (no writes).')
  } else {
    console.log('\nNormalization completed.')
  }

  if (adminPool) {
    await adminPool.end()
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    const rendered = String(error)
    if (
      message.includes('ErrorEvent') ||
      rendered.includes('ErrorEvent') ||
      message.includes('Failed query') ||
      rendered.includes('Failed query')
    ) {
      console.error(
        'normalize-seats failed: database connection/query error. Verify --admin-db-url is a real direct PostgreSQL URL (not placeholder and preferably non-pooler).',
      )
    }
    console.error('normalize-seats failed:', error)
    process.exit(1)
  })

