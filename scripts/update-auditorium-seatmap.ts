import fs from 'node:fs'
import path from 'node:path'

import { db } from '@/db'
import { auditoriums, sessions, type AuditoriumLayout } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

type Layout = {
  rows?: Array<{
    label: string
    seats: Array<{ type?: string }>
  }>
  rowsConfig?: Array<{ row?: string; seatCount?: number }>
}

// Normalize loose layout into the strict AuditoriumLayout shape expected by the DB.
function normalizeLayout(layout: Layout): AuditoriumLayout {
  const rowsConfig = Array.isArray(layout.rowsConfig)
    ? layout.rowsConfig.map((r, idx) => ({
        row: (r as { row?: string }).row ?? String.fromCharCode(65 + idx),
        seatCount: r.seatCount ?? 0,
      }))
    : undefined

  const rows = Array.isArray(layout.rows)
    ? layout.rows.map((row) => ({
        label: row.label,
        seats: Array.isArray(row.seats)
          ? row.seats.map((seat, idx) => ({
              id: undefined,
              row: row.label,
              number: idx + 1,
              type: (seat.type as 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'GAP' | undefined) ?? 'STANDARD',
            }))
          : [],
      }))
    : undefined

  return { rowsConfig, rows }
}

function countSeats(layout: Layout): number {
  if (Array.isArray(layout.rows)) {
    return layout.rows.reduce((sum, row) => {
      const seats = Array.isArray(row.seats) ? row.seats : []
      const count = seats.filter((seat) => seat?.type !== 'GAP').length
      return sum + count
    }, 0)
  }

  if (Array.isArray(layout.rowsConfig)) {
    return layout.rowsConfig.reduce((sum, row) => sum + (row.seatCount ?? 0), 0)
  }

  return 0
}

async function main() {
  const auditoriumId = process.argv[2]
  const layoutPathArg = process.argv[3]

  if (!auditoriumId) {
    console.error('Usage: tsx scripts/update-auditorium-seatmap.ts <AUDITORIUM_ID> [layout.json]')
    process.exit(1)
  }

  const layoutPath = layoutPathArg
    ? path.resolve(layoutPathArg)
    : path.resolve('scripts', 'seatmap-amc-lincoln-square.json')

  if (!fs.existsSync(layoutPath)) {
    console.error(`Layout file not found: ${layoutPath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(layoutPath, 'utf8')
  const layout = normalizeLayout(JSON.parse(raw) as Layout)

  const totalSeats = countSeats(layout)
  if (!totalSeats) {
    console.error('Layout is empty or invalid. No seats found.')
    process.exit(1)
  }

  const [auditorium] = await db
    .select({ id: auditoriums.id })
    .from(auditoriums)
    .where(eq(auditoriums.id, auditoriumId))
    .limit(1)

  if (!auditorium) {
    console.error(`Auditorium not found: ${auditoriumId}`)
    process.exit(1)
  }

  await db
    .update(auditoriums)
    .set({
      seatMapConfig: layout,
      layout,
      totalSeats,
      capacity: totalSeats,
      approxCapacity: totalSeats,
      updatedAt: new Date(),
    })
    .where(eq(auditoriums.id, auditoriumId))

  const sessionRows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.auditoriumId, auditoriumId))

  let totalCreated = 0
  for (const session of sessionRows) {
    const result = await generateSeatsForSession(session.id)
    totalCreated += result.created
  }

  console.log(`Updated auditorium ${auditoriumId}`)
  console.log(`Total seats in layout: ${totalSeats}`)
  console.log(`Sessions updated: ${sessionRows.length}`)
  console.log(`Seats created: ${totalCreated}`)
}

main().catch((error) => {
  console.error('Failed to update auditorium layout:', error)
  process.exit(1)
})
