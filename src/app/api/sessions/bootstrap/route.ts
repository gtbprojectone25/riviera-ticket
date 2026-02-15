import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  auditoriums,
  cinemas,
  movies,
  sessions,
  type AuditoriumLayout,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'

type BootstrapPayload = {
  cinemaId: string
  cinemaName?: string
  movieId?: string
  movieTitle?: string
  movieDuration?: number
  startTime?: string
  basePrice?: number
  vipPrice?: number
}

async function withDbRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const transient =
        message.includes('ECONNRESET') ||
        message.includes('fetch failed') ||
        message.includes('ConnectTimeoutError')
      if (!transient || attempt === maxAttempts) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }
  console.error(`[bootstrap] DB error after retries (${label}):`, lastError)
  throw lastError
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

function generateAmcLincolnSquareLayout(): AuditoriumLayout {
  // Layout inspirado no AMC Lincoln Square IMAX 70mm (imagem de referência)
  const rowsConfig = [
    { row: 'A', seatCount: 28 },
    { row: 'B', seatCount: 30 },
    { row: 'C', seatCount: 32 },
    { row: 'D', seatCount: 34 },
    { row: 'E', seatCount: 34 },
    { row: 'F', seatCount: 34 },
    { row: 'G', seatCount: 34 },
    { row: 'H', seatCount: 34 },
    { row: 'J', seatCount: 32 },
    { row: 'K', seatCount: 30 },
    { row: 'L', seatCount: 28 },
    { row: 'M', seatCount: 26 },
    { row: 'N', seatCount: 24 },
  ]

  return {
    rowsConfig,
    accessible: [
      {
        row: 'A',
        seats: [1, 2, 3, 4, 25, 26, 27, 28],
      },
      {
        row: 'N',
        seats: [1, 2, 3, 4, 21, 22, 23, 24],
      },
    ],
    vipZones: [
      {
        rows: ['E', 'F', 'G', 'H', 'J'],
        fromPercent: 0.2,
        toPercent: 0.85,
      },
    ],
  }
}

function getTotalSeats(layout: AuditoriumLayout | null) {
  if (!layout) return 0
  if (Array.isArray(layout.rowsConfig)) {
    return layout.rowsConfig.reduce((acc, r) => acc + r.seatCount, 0)
  }
  if (Array.isArray(layout.rows)) {
    return layout.rows.reduce((acc, row) => {
      const seats = Array.isArray(row.seats) ? row.seats : []
      const count = seats.filter((s) => s?.type !== 'GAP').length
      return acc + count
    }, 0)
  }
  return 0
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
    const movieId = body.movieId
    if (!cinemaId) {
      return NextResponse.json({ error: 'cinemaId é obrigatório' }, { status: 400 })
    }
    let movie = null as (typeof movies.$inferSelect | null)
    try {
      if (movieId) {
        const [found] = await withDbRetry(
          () =>
            db
              .select()
              .from(movies)
              .where(eq(movies.id, movieId))
              .limit(1),
          'movie_by_id',
        )
        movie = found ?? null
      } else {
        const [found] = await withDbRetry(
          () =>
            db
              .select()
              .from(movies)
              .orderBy(movies.createdAt)
              .limit(1),
          'movie_latest',
        )
        movie = found ?? null
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return NextResponse.json(
        { error: 'Database unavailable', detail: message },
        { status: 503 },
      )
    }

    if (!movie) {
      return NextResponse.json({ error: 'Filme não encontrado' }, { status: 404 })
    }

    const [cinema] = await withDbRetry(
      () =>
        db
          .select()
          .from(cinemas)
          .where(eq(cinemas.id, cinemaId))
          .limit(1),
      'cinema_lookup',
    )

    // Se o cinema não existir, criar um novo baseado no ID
    let cinemaData = cinema
    if (!cinema) {
      // Criar cinema automaticamente com base no ID e nome fornecido
      const cinemaName = body.cinemaName || cinemaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      const [newCinema] = await withDbRetry(
        () =>
          db
            .insert(cinemas)
            .values({
              id: cinemaId,
              name: cinemaName,
              city: 'New York',
              state: 'NY',
              country: 'USA',
              isIMAX: true,
              format: 'IMAX 70MM',
              lat: 40.7128,
              lng: -74.0060,
              address: cinemaName,
            })
            .returning(),
        'cinema_create',
      )
      cinemaData = newCinema
    }

    const movieTitle = movie.title ?? body.movieTitle ?? 'The Odyssey'
    const movieDuration = body.movieDuration ?? 150
    const basePrice = body.basePrice ?? 34900
    const vipPrice = body.vipPrice ?? 44900

    let start = body.startTime ? new Date(body.startTime) : new Date()
    // Se a data for inválida, cria para amanhã
    if (isNaN(start.getTime())) {
      start = new Date()
    }

    // Criar sessão para amanhã às 19h para garantir que seja no futuro
    start.setDate(start.getDate() + 1)
    start.setHours(19, 0, 0, 0)
    const end = new Date(start.getTime() + movieDuration * 60 * 1000)

    // Pega um auditorium do cinema ou cria um genérico se não existir
    const [aud] = await withDbRetry(
      () =>
        db
          .select()
          .from(auditoriums)
          .where(eq(auditoriums.cinemaId, cinemaId))
          .limit(1),
      'auditorium_lookup',
    )

    let auditoriumId = aud?.id
    let layout: AuditoriumLayout | null = aud?.layout ?? null
    let totalSeats = aud?.totalSeats ?? 0
    const shouldUseAmcLayout = cinemaId === 'amc-lincoln-square'
    const amcLayout = shouldUseAmcLayout ? generateAmcLincolnSquareLayout() : null

    if (!aud) {
      const newLayout = amcLayout ?? generateGenericIMAXLayout()
      const total = getTotalSeats(newLayout)
      const [createdAud] = await withDbRetry(
        () =>
          db
            .insert(auditoriums)
            .values({
              cinemaId,
              name: `${cinemaData.name} IMAX`,
              format: cinemaData.format ?? 'IMAX',
              layout: newLayout,
              seatMapConfig: newLayout,
              totalSeats: total,
              approxCapacity: total,
            })
            .returning(),
        'auditorium_create',
      )
      auditoriumId = createdAud.id
      layout = newLayout
      totalSeats = total
    } else if (amcLayout) {
      layout = amcLayout
      const layoutForUpdate = layout ?? generateGenericIMAXLayout()
      totalSeats = getTotalSeats(layoutForUpdate)
      await withDbRetry(
        () =>
          db
            .update(auditoriums)
            .set({ layout: layoutForUpdate, seatMapConfig: layoutForUpdate, totalSeats, approxCapacity: totalSeats })
            .where(eq(auditoriums.id, aud.id)),
        'auditorium_update_amc',
      )
    } else if (!layout) {
      layout = generateGenericIMAXLayout()
      const layoutForUpdate = layout
      totalSeats = getTotalSeats(layoutForUpdate)
      await withDbRetry(
        () =>
          db
            .update(auditoriums)
            .set({ layout: layoutForUpdate, seatMapConfig: layoutForUpdate, totalSeats, approxCapacity: totalSeats })
            .where(eq(auditoriums.id, aud.id)),
        'auditorium_update_generic',
      )
    } else if (!totalSeats || totalSeats <= 0) {
      totalSeats = getTotalSeats(layout)
      await withDbRetry(
        () =>
          db
            .update(auditoriums)
            .set({ totalSeats, approxCapacity: totalSeats })
            .where(eq(auditoriums.id, aud.id)),
        'auditorium_update_capacity',
      )
    }

    // Criar sessão
    const [session] = await withDbRetry(
      () =>
        db
          .insert(sessions)
          .values({
            movieId: movie.id,
            movieTitle,
            movieDuration,
            startTime: start,
            endTime: end,
            cinemaName: cinemaData.name,
            cinemaId: cinemaData.id,
            auditoriumId: auditoriumId!,
            screenType: 'IMAX_70MM',
            totalSeats,
            availableSeats: totalSeats,
            basePrice,
            vipPrice,
          })
          .returning(),
      'session_create',
    )

    const result = await ensureSeatsForSession(session.id)

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

