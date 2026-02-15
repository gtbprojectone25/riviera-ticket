import { db } from '@/db'
import { seats, sessions } from '@/db/schema'
import { desc, eq, isNotNull, sql } from 'drizzle-orm'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'

function getArg(name: string): string | null {
  const prefix = `--${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))
  return raw ? raw.slice(prefix.length) : null
}

async function resolveSessionId() {
  const fromArg = getArg('session-id')
  if (fromArg) return fromArg

  const [latest] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(isNotNull(sessions.auditoriumId))
    .orderBy(desc(sessions.createdAt))
    .limit(1)

  if (!latest) {
    throw new Error('No session with auditorium_id found.')
  }

  return latest.id
}

async function run() {
  const sessionId = await resolveSessionId()

  const countSeats = async () => {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(seats)
      .where(eq(seats.sessionId, sessionId))
      .limit(1)
    return Number(row?.count ?? 0)
  }

  const before = await countSeats()
  const first = await ensureSeatsForSession(sessionId)
  const afterFirst = await countSeats()
  const second = await ensureSeatsForSession(sessionId)
  const afterSecond = await countSeats()

  const dupBySeatId = await db.execute(sql<{ count: number }>`
    select count(*)::int as count
    from (
      select seat_id
      from seats
      where session_id = ${sessionId}
      group by seat_id
      having count(*) > 1
    ) s
  `)
  const dupByCoord = await db.execute(sql<{ count: number }>`
    select count(*)::int as count
    from (
      select row, number
      from seats
      where session_id = ${sessionId}
      group by row, number
      having count(*) > 1
    ) s
  `)

  const duplicateSeatIds = Number(dupBySeatId.rows?.[0]?.count ?? 0)
  const duplicateCoordinates = Number(dupByCoord.rows?.[0]?.count ?? 0)

  console.log({
    sessionId,
    before,
    firstRunCreated: first.created,
    afterFirst,
    secondRunCreated: second.created,
    afterSecond,
    duplicateSeatIds,
    duplicateCoordinates,
  })

  if (duplicateSeatIds > 0 || duplicateCoordinates > 0) {
    throw new Error('Idempotency check failed: duplicate seats detected.')
  }

  if (second.created !== 0) {
    throw new Error(`Idempotency check failed: second run created ${second.created} seats.`)
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('verify-ensure-seats-idempotent failed:', error)
    process.exit(1)
  })
