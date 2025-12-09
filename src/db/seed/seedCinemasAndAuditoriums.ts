/**
 * Seed de cinemas e auditoriums com layouts IMAX.
 *
 * - Insere/atualiza todos os cinemas da lista src/data/cinemas.ts
 * - Cria/atualiza auditoriums com layouts específicos (AMC, BFI, Melbourne, Esquire)
 * - Cria auditoriums genéricos para os demais cinemas
 */

import fs from 'node:fs'
import path from 'node:path'

import { db as importedDb } from '@/db'
import {
  cinemas as cinemasTable,
  auditoriums,
  type AuditoriumLayout,
} from '@/db/schema'
import { cinemas as cinemaData } from '@/data/cinemas'
import { and, eq } from 'drizzle-orm'

type RowConfig = { row: string; seatCount: number }

type AuditoriumSeedConfig = {
  cinemaId: string
  name: string
  format?: string
  layout: AuditoriumLayout
}

// Layouts específicos
const amcLincolnSquareIMAX: AuditoriumSeedConfig = {
  cinemaId: 'amc-lincoln-square',
  name: 'IMAX',
  format: 'IMAX 70mm / Laser',
  layout: {
    rowsConfig: [
      { row: 'A', seatCount: 22 },
      { row: 'B', seatCount: 26 },
      { row: 'C', seatCount: 30 },
      { row: 'D', seatCount: 34 },
      { row: 'E', seatCount: 40 },
      { row: 'F', seatCount: 44 },
      { row: 'G', seatCount: 48 },
      { row: 'H', seatCount: 48 },
      { row: 'J', seatCount: 48 },
      { row: 'K', seatCount: 44 },
      { row: 'L', seatCount: 40 },
      { row: 'M', seatCount: 34 },
      { row: 'N', seatCount: 28 },
      { row: 'O', seatCount: 22 },
    ],
    accessible: [
      { row: 'A', seats: [1, 2, 21, 22] },
      { row: 'O', seats: [1, 2, 21, 22].filter((n) => n <= 22) },
    ],
    vipZones: [
      { rows: ['F', 'G', 'H', 'J'], fromPercent: 0.3, toPercent: 0.7 },
    ],
  },
}

const bfiIMAX: AuditoriumSeedConfig = {
  cinemaId: 'bfi-imax',
  name: 'BFI IMAX',
  format: 'IMAX 70mm / Laser',
  layout: {
    rowsConfig: [
      { row: 'A', seatCount: 20 },
      { row: 'B', seatCount: 26 },
      { row: 'C', seatCount: 30 },
      { row: 'D', seatCount: 34 },
      { row: 'E', seatCount: 38 },
      { row: 'F', seatCount: 40 },
      { row: 'G', seatCount: 42 },
      { row: 'H', seatCount: 42 },
      { row: 'J', seatCount: 42 },
      { row: 'K', seatCount: 40 },
      { row: 'L', seatCount: 38 },
      { row: 'M', seatCount: 34 },
      { row: 'N', seatCount: 30 },
      { row: 'O', seatCount: 24 },
      { row: 'P', seatCount: 20 },
    ],
    accessible: [
      { row: 'A', seats: [1, 20] },
      { row: 'P', seats: [1, 20] },
    ],
    vipZones: [{ rows: ['G', 'H', 'J'], fromPercent: 0.3, toPercent: 0.7 }],
  },
}

const imaxMelbourne: AuditoriumSeedConfig = {
  cinemaId: 'imax-melbourne-museum',
  name: 'IMAX Melbourne',
  format: 'IMAX Laser',
  layout: {
    rowsConfig: [
      { row: 'A', seatCount: 20 },
      { row: 'B', seatCount: 24 },
      { row: 'C', seatCount: 28 },
      { row: 'D', seatCount: 32 },
      { row: 'E', seatCount: 36 },
      { row: 'F', seatCount: 40 },
      { row: 'G', seatCount: 44 },
      { row: 'H', seatCount: 48 },
      { row: 'J', seatCount: 48 },
      { row: 'K', seatCount: 44 },
      { row: 'L', seatCount: 40 },
      { row: 'M', seatCount: 32 },
      { row: 'N', seatCount: 25 },
    ],
    accessible: [{ row: 'A', seats: [1, 2, 19, 20] }],
    vipZones: [{ rows: ['H', 'J'], fromPercent: 0.28, toPercent: 0.72 }],
  },
}

const esquireIMAX: AuditoriumSeedConfig = {
  cinemaId: 'esquire-imax',
  name: 'Esquire IMAX',
  format: 'IMAX Digital',
  layout: {
    rowsConfig: [
      { row: 'A', seatCount: 14 },
      { row: 'B', seatCount: 18 },
      { row: 'C', seatCount: 22 },
      { row: 'D', seatCount: 26 },
      { row: 'E', seatCount: 30 },
      { row: 'F', seatCount: 34 },
      { row: 'G', seatCount: 36 },
      { row: 'H', seatCount: 38 },
      { row: 'J', seatCount: 38 },
      { row: 'K', seatCount: 36 },
      { row: 'L', seatCount: 34 },
      { row: 'M', seatCount: 28 },
      { row: 'N', seatCount: 24 },
    ],
    accessible: [{ row: 'A', seats: [1, 2, 13, 14] }],
    vipZones: [
      { rows: ['F', 'G', 'H', 'J'], fromPercent: 0.3, toPercent: 0.7 },
    ],
  },
}

const specialLayouts: Record<string, AuditoriumSeedConfig> = {
  [amcLincolnSquareIMAX.cinemaId]: amcLincolnSquareIMAX,
  [bfiIMAX.cinemaId]: bfiIMAX,
  [imaxMelbourne.cinemaId]: imaxMelbourne,
  [esquireIMAX.cinemaId]: esquireIMAX,
}

function generateGenericIMAXLayout(
  approxCapacity: number = 380,
): AuditoriumLayout {
  const rowsLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M']
  const basePerRow = [14, 18, 22, 26, 30, 34, 34, 32, 30, 26, 22, 18]
  const baseTotal = basePerRow.reduce((a, b) => a + b, 0)
  const factor = approxCapacity / baseTotal

  const rowsConfig: RowConfig[] = rowsLabels.map((row, i) => ({
    row,
    seatCount: Math.max(10, Math.round(basePerRow[i] * factor)),
  }))

  return {
    rowsConfig,
    accessible: [
      {
        row: 'A',
        seats: [
          1,
          2,
          rowsConfig[0].seatCount - 1,
          rowsConfig[0].seatCount,
        ],
      },
    ],
    vipZones: [
      {
        rows: ['F', 'G', 'H'],
        fromPercent: 0.3,
        toPercent: 0.7,
      },
    ],
  }
}

// Garante que DATABASE_URL esteja carregada antes de usar o db
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return

  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/)
    if (match) {
      let value = match[1].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env.DATABASE_URL = value
      break
    }
  }
}

const db = (() => {
  ensureDatabaseUrl()
  return importedDb
})()

export async function seedCinemasAndAuditoriums() {
  console.log('Seeding cinemas and auditoriums with layouts...')

  for (const cinema of cinemaData) {
    // Upsert cinema
    await db
      .insert(cinemasTable)
      .values({
        id: cinema.id,
        name: cinema.name,
        city: cinema.city,
        state: cinema.state,
        country: cinema.country,
        isIMAX: cinema.isIMAX,
        format: cinema.format ?? null,
        lat: cinema.lat,
        lng: cinema.lng,
        address: cinema.address ?? null,
        zipCode: cinema.zipCode ?? null,
      })
      .onConflictDoUpdate({
        target: cinemasTable.id,
        set: {
          name: cinema.name,
          city: cinema.city,
          state: cinema.state,
          country: cinema.country,
          isIMAX: cinema.isIMAX,
          format: cinema.format ?? null,
          lat: cinema.lat,
          lng: cinema.lng,
          address: cinema.address ?? null,
          zipCode: cinema.zipCode ?? null,
        },
      })

    const special = specialLayouts[cinema.id]

    const layout: AuditoriumLayout =
      special?.layout ?? generateGenericIMAXLayout()

    const name = special?.name ?? `${cinema.name} IMAX`
    const format = special?.format ?? cinema.format ?? 'IMAX'

    const totalSeats = layout.rowsConfig.reduce(
      (acc, row) => acc + row.seatCount,
      0,
    )

    const existing = await db
      .select()
      .from(auditoriums)
      .where(
        and(
          eq(auditoriums.cinemaId, cinema.id),
          eq(auditoriums.name, name),
        ),
      )
      .limit(1)

    if (existing[0]) {
      await db
        .update(auditoriums)
        .set({
          format,
          layout,
          totalSeats,
          approxCapacity: totalSeats,
        })
        .where(eq(auditoriums.id, existing[0].id))

      console.log(
        `Updated auditorium ${name} for cinema ${cinema.name} (seats: ${totalSeats})`,
      )
    } else {
      const [created] = await db
        .insert(auditoriums)
        .values({
          cinemaId: cinema.id,
          name,
          format,
          layout,
          totalSeats,
          approxCapacity: totalSeats,
        })
        .returning()

      console.log(
        `Created auditorium ${created.name} for cinema ${cinema.name} (seats: ${totalSeats})`,
      )
    }
  }

  console.log('Cinemas and auditoriums seed completed.')
}

// Permite rodar via: ts-node src/db/seed/seedCinemasAndAuditoriums.ts
if (require.main === module) {
  seedCinemasAndAuditoriums()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
