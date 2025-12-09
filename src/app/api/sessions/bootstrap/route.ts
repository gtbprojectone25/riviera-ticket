import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  auditoriums,
  cinemas,
  sessions,
  type AuditoriumLayout,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

type BootstrapPayload = {
  cinemaId: string
  movieTitle?: string
  movieDuration?: number
  startTime?: string
  basePrice?: number
  vipPrice?: number
}

function generateGenericIMAXLayout(
  approxCapacity: number = 380,
): AuditoriumLayout {
  const rowsLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M']
  const basePerRow = [14, 18, 22, 26, 30, 34, 34, 32, 30, 26, 22, 18]
  const baseTotal = basePerRow.reduce((a, b) => a + b, 0)
  const factor = approxCapacity / baseTotal

  const rowsConfig = rowsLabels.map((row, i) => ({
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

export async function POST(request: NextRequest) {
  try {
    let body: Partial<BootstrapPayload> = {}
    
    // Tenta parsear o JSON, mas permite corpo vazio
    try {
      const text = await request.text()
      if (text && text.trim()) {
        body = JSON.parse(text) as BootstrapPayload
      }
    } catch {
      // Corpo vazio ou JSON inválido - usa valores default
    }

    const cinemaId = body.cinemaId
    if (!cinemaId) {
      return NextResponse.json({ error: 'cinemaId é obrigatório' }, { status: 400 })
    }

    const [cinema] = await db
      .select()
      .from(cinemas)
      .where(eq(cinemas.id, cinemaId))
      .limit(1)

    if (!cinema) {
      return NextResponse.json({ error: 'Cinema não encontrado' }, { status: 404 })
    }

    const movieTitle = body.movieTitle ?? 'The Odyssey'
    const movieDuration = body.movieDuration ?? 150
    const basePrice = body.basePrice ?? 34900
    const vipPrice = body.vipPrice ?? 44900

    let start = body.startTime ? new Date(body.startTime) : new Date()
    // Se a data for inválida, cai para hoje 19h
    if (isNaN(start.getTime())) {
      start = new Date()
    }
    start.setHours(19, 0, 0, 0)
    const end = new Date(start.getTime() + movieDuration * 60 * 1000)

    // Pega um auditorium do cinema ou cria um genérico se não existir
    const [aud] = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.cinemaId, cinemaId))
      .limit(1)

    let auditoriumId = aud?.id
    let layout: AuditoriumLayout | null = aud?.layout ?? null
    let totalSeats = aud?.totalSeats ?? 0

    if (!aud) {
      const newLayout = generateGenericIMAXLayout()
      const total = newLayout.rowsConfig.reduce((acc, r) => acc + r.seatCount, 0)
      const [createdAud] = await db
        .insert(auditoriums)
        .values({
          cinemaId,
          name: `${cinema.name} IMAX`,
          format: cinema.format ?? 'IMAX',
          layout: newLayout,
          totalSeats: total,
          approxCapacity: total,
        })
        .returning()
      auditoriumId = createdAud.id
      layout = newLayout
      totalSeats = total
    } else if (!layout) {
      layout = generateGenericIMAXLayout()
      totalSeats = layout.rowsConfig.reduce((acc, r) => acc + r.seatCount, 0)
      await db
        .update(auditoriums)
        .set({ layout, totalSeats, approxCapacity: totalSeats })
        .where(eq(auditoriums.id, aud.id))
    } else if (!totalSeats || totalSeats <= 0) {
      totalSeats = layout.rowsConfig.reduce((acc, r) => acc + r.seatCount, 0)
      await db
        .update(auditoriums)
        .set({ totalSeats, approxCapacity: totalSeats })
        .where(eq(auditoriums.id, aud.id))
    }

    // Criar sessão
    const [session] = await db
      .insert(sessions)
      .values({
        movieTitle,
        movieDuration,
        startTime: start,
        endTime: end,
        cinemaName: cinema.name,
        cinemaId: cinema.id,
        auditoriumId: auditoriumId!,
        screenType: 'IMAX_70MM',
        totalSeats,
        availableSeats: totalSeats,
        basePrice,
        vipPrice,
      })
      .returning()

    const result = await generateSeatsForSession(session.id)

    return NextResponse.json({
      session,
      seatsCreated: result.created,
    })
  } catch (error) {
    console.error('Erro ao bootstrap de sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao criar sessão automaticamente' },
      { status: 500 },
    )
  }
}

