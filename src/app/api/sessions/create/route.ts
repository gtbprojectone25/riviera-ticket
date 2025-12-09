import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { cinemas, auditoriums, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

type CreateSessionPayload = {
  movieTitle: string
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
      !movieTitle ||
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

    const layout = auditorium.layout
    const totalSeatsFromLayout = layout.rowsConfig.reduce(
      (acc: number, row: { seatCount: number }) => acc + row.seatCount,
      0,
    )

    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + movieDuration * 60 * 1000)

    const [session] = await db
      .insert(sessions)
      .values({
        movieTitle,
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

