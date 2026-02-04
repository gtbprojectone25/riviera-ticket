import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { cinemas, auditoriums, movies, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

type CreateSessionPayload = {
  movieId: string
  movieTitle?: string
  movieDuration: number
  startTime: string
  cinemaId: string
  auditoriumId: string
  screenType: string
  basePrice: number
  vipPrice: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionPayload

  const {
    movieId,
    movieTitle,
    movieDuration,
    startTime,
    cinemaId,
    auditoriumId,
      screenType,
      basePrice,
      vipPrice,
    } = body

    if (
      !movieId ||
      !movieDuration ||
      !startTime ||
      !cinemaId ||
      !auditoriumId ||
      !screenType ||
      !basePrice ||
      !vipPrice
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    const [movie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, movieId))
      .limit(1)

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 },
      )
    }

    const [cinema] = await db
      .select()
      .from(cinemas)
      .where(eq(cinemas.id, cinemaId))
      .limit(1)

    if (!cinema) {
      return NextResponse.json(
        { error: 'Cinema not found' },
        { status: 404 },
      )
    }

    const [auditorium] = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.id, auditoriumId))
      .limit(1)

    if (!auditorium) {
      return NextResponse.json(
        { error: 'Auditorium not found' },
        { status: 404 },
      )
    }

    const layout = auditorium.seatMapConfig ?? auditorium.layout
    const totalSeatsFromLayout = Array.isArray((layout as { rowsConfig?: Array<{ seatCount?: number }> }).rowsConfig)
      ? (layout as { rowsConfig: Array<{ seatCount: number }> }).rowsConfig.reduce(
          (acc: number, row: { seatCount: number }) => acc + row.seatCount,
          0,
        )
      : Array.isArray((layout as { rows?: Array<{ seats?: Array<{ type?: string }> }> }).rows)
        ? (layout as { rows: Array<{ seats?: Array<{ type?: string }> }> }).rows.reduce((acc: number, row) => {
            const seats = Array.isArray(row.seats) ? row.seats : []
            const count = seats.filter((s) => s?.type !== 'GAP').length
            return acc + count
          }, 0)
        : 0

    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + movieDuration * 60 * 1000)

    const [session] = await db
      .insert(sessions)
      .values({
        movieId: movie.id,
        movieTitle: movie.title ?? movieTitle ?? '',
        movieDuration,
        startTime: startDate,
        endTime: endDate,
        cinemaName: cinema.name,
        cinemaId: cinema.id,
        auditoriumId: auditorium.id,
        screenType: screenType as any,
        totalSeats: totalSeatsFromLayout,
        availableSeats: totalSeatsFromLayout,
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
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Erro ao criar sessão' },
      { status: 500 },
    )
  }
}
