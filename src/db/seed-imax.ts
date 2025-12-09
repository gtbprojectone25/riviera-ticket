/**
 * Seed IMAX cinemas, auditoriums, sessions and seats for The Odyssey
 */

import { db } from '@/db'
import {
  cinemas as cinemasTable,
  auditoriums,
  sessions,
  seats,
} from './schema'
import { cinemas as cinemaData } from '@/data/cinemas'

type SeatType = 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'GAP'

type SeatConfig = {
  row: string
  number: number
  type: SeatType
}

function generateGenericIMAXSeats(): SeatConfig[] {
  const configs: SeatConfig[] = []
  const rowsStandard = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const rowsVip = ['M', 'N', 'O']
  const allRows = [...rowsStandard, ...rowsVip]

  allRows.forEach((row) => {
    const isVipRow = rowsVip.includes(row)
    const defaultType: SeatType = isVipRow ? 'VIP' : 'STANDARD'

    for (let i = 1; i <= 25; i++) {
      let seatType: SeatType = defaultType

      if (isVipRow) {
        if (i >= 7 && i <= 18) {
          seatType = 'VIP'
        } else {
          seatType = 'GAP'
        }
      } else {
        if (row === 'E') {
          if (i === 5 || i === 6) seatType = 'WHEELCHAIR'
          else if (i >= 7 && i <= 10) seatType = 'GAP'
          else if (i >= 11 && i <= 14) seatType = 'WHEELCHAIR'
          else if (i === 15) seatType = 'GAP'
          else if (i >= 18) seatType = 'GAP'
        } else if (row === 'F') {
          if (i === 21 || i === 22) seatType = 'WHEELCHAIR'
          else if (i === 23) seatType = 'GAP'
          else if (i === 24 || i === 25) seatType = 'WHEELCHAIR'
        } else if (row === 'O') {
          if (i > 8 && i < 18) seatType = 'GAP'
        }
      }

      configs.push({
        row,
        number: i,
        type: seatType,
      })
    }
  })

  return configs
}

export async function seedIMAX() {
  console.log('Seeding IMAX cinemas, auditoriums, sessions and seats...')

  const genericLayout = generateGenericIMAXSeats()

  // Converter genericLayout para AuditoriumLayout
  const rowsSet = new Set(genericLayout.map((s) => s.row))
  const rowsConfig = Array.from(rowsSet).map((row) => ({
    row,
    seatCount: genericLayout.filter((s) => s.row === row && s.type !== 'GAP').length,
  }))
  const vipRows = ['M', 'N', 'O']
  const auditoriumLayout = {
    rowsConfig,
    vipZones: [{ rows: vipRows, fromPercent: 0, toPercent: 100 }],
    accessible: [{ row: 'E', seats: [5, 6, 11, 12, 13, 14] }],
  }

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
      .onConflictDoNothing()

    // Criar 1 auditorium genérico por cinema
    const totalSeats = genericLayout.filter((s) => s.type !== 'GAP').length
    const [auditorium] = await db
      .insert(auditoriums)
      .values({
        cinemaId: cinema.id,
        name: `${cinema.name} IMAX`,
        format: cinema.format ?? 'IMAX',
        layout: auditoriumLayout,
        totalSeats,
        approxCapacity: totalSeats,
      })
      .returning()

    const basePrice = 34900
    const vipPrice = 44900

    // Criar 1 sessão de The Odyssey por auditorium
    const start = new Date()
    start.setHours(19, 0, 0, 0)
    const end = new Date(start.getTime() + 150 * 60 * 1000)

    const [session] = await db
      .insert(sessions)
      .values({
        movieTitle: 'The Odyssey',
        movieDuration: 150,
        startTime: start,
        endTime: end,
        cinemaName: cinema.name,
        cinemaId: cinema.id,
        auditoriumId: auditorium.id,
        screenType: 'IMAX_70MM',
        totalSeats: genericLayout.filter((s) => s.type !== 'GAP').length,
        availableSeats: genericLayout.filter((s) => s.type !== 'GAP').length,
        basePrice,
        vipPrice,
      })
      .returning()

    // Criar seats para a sessão
    const seatRows = genericLayout.map((s) => {
      const seatId = `${s.row}${s.number}`
      const price =
        s.type === 'VIP'
          ? vipPrice
          : s.type === 'STANDARD' || s.type === 'WHEELCHAIR'
            ? basePrice
            : 0

      return {
        sessionId: session.id,
        row: s.row,
        number: s.number,
        seatId,
        isAvailable: s.type !== 'GAP',
        isReserved: false,
        reservedBy: null,
        reservedUntil: null,
        type: s.type,
        price,
      }
    })

    await db.insert(seats).values(seatRows)

    console.log(
      `Seeded cinema ${cinema.name}, auditorium ${auditorium.name}, session ${session.id}, seats: ${seatRows.length}`,
    )
  }

  console.log('IMAX seed completed.')
}

if (require.main === module) {
  seedIMAX()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

