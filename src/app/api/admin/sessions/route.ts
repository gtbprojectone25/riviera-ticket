/**
 * API: GET/POST /api/admin/sessions
 * Listar e criar sessoes (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums, cinemas, movies, sessions } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { findSessionConflict } from '@/db/queries'
import { z } from 'zod'
import { and, eq, desc, sql } from 'drizzle-orm'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'

const sessionSchema = z.object({
  movieId: z.string().uuid('movieId invalido'),
  movieTitle: z.string().min(1, 'titulo obrigatorio').optional(),
  movieDuration: z.number().int().min(1, 'duracao obrigatoria'),
  startTime: z.string().min(1, 'data/hora obrigatoria'),
  cinemaId: z.string().min(1, 'cinema obrigatorio'),
  auditoriumId: z.string().uuid('auditoriumId invalido'),
  screenType: z.enum(['IMAX_70MM', 'STANDARD']),
  basePrice: z.number().int().min(0),
  vipPrice: z.number().int().min(0),
  salesStatus: z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
})

function getTotalSeats(layout: unknown) {
  if (!layout || typeof layout !== 'object') return 0
  const cast = layout as {
    rowsConfig?: Array<{ seatCount?: number }>
    rows?: Array<{ seats?: Array<{ type?: string }> }>
  }
  if (Array.isArray(cast.rowsConfig)) {
    return cast.rowsConfig.reduce((sum, row) => sum + (row?.seatCount ?? 0), 0)
  }
  if (Array.isArray(cast.rows)) {
    return cast.rows.reduce((sum, row) => {
      const seats = Array.isArray(row.seats) ? row.seats : []
      const count = seats.filter((s) => s?.type !== 'GAP').length
      return sum + count
    }, 0)
  }
  return 0
}

function parseDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getClientMeta(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = request.headers.get('user-agent') || null
  return { ipAddress, userAgent }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const cinemaId = searchParams.get('cinemaId')
    const auditoriumId = searchParams.get('auditoriumId')
    const salesStatus = searchParams.get('salesStatus')

    const rows = await db
      .select({
        session: sessions,
        movieTitle: sql<string>`coalesce(${movies.title}, ${sessions.movieTitle})`.as('movie_title'),
      })
      .from(sessions)
      .leftJoin(movies, eq(sessions.movieId, movies.id))
      .where(
        and(
          cinemaId ? eq(sessions.cinemaId, cinemaId) : undefined,
          auditoriumId ? eq(sessions.auditoriumId, auditoriumId) : undefined,
          salesStatus ? eq(sessions.salesStatus, salesStatus as 'ACTIVE' | 'PAUSED' | 'CLOSED') : undefined,
        ),
      )
      .orderBy(desc(sessions.startTime))

    return NextResponse.json(
      rows.map((row) => ({
        ...row.session,
        movieTitle: row.movieTitle,
      })),
    )
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const body = await request.json()
    const validation = sessionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = validation.data
    const startDate = parseDate(data.startTime)
    if (!startDate) {
      return NextResponse.json({ error: 'Data/hora invalida' }, { status: 400 })
    }

    const endDate = new Date(startDate.getTime() + data.movieDuration * 60 * 1000)

    const [movie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, data.movieId))
      .limit(1)

    if (!movie) {
      return NextResponse.json({ error: 'Filme nao encontrado' }, { status: 404 })
    }

    const [cinema] = await db
      .select()
      .from(cinemas)
      .where(eq(cinemas.id, data.cinemaId))
      .limit(1)

    if (!cinema) {
      return NextResponse.json({ error: 'Cinema nao encontrado' }, { status: 404 })
    }

    const [auditorium] = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.id, data.auditoriumId))
      .limit(1)

    if (!auditorium) {
      return NextResponse.json({ error: 'Sala nao encontrada' }, { status: 404 })
    }

    const conflict = await findSessionConflict({
      auditoriumId: data.auditoriumId,
      startTime: startDate,
      endTime: endDate,
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Conflito de horario na mesma sala' },
        { status: 409 },
      )
    }

    const layout = auditorium.seatMapConfig ?? auditorium.layout
    const totalSeats = getTotalSeats(layout)

    const [session] = await db
      .insert(sessions)
      .values({
        movieId: movie.id,
        movieTitle: movie.title ?? data.movieTitle,
        movieDuration: data.movieDuration,
        startTime: startDate,
        endTime: endDate,
        cinemaName: cinema.name,
        cinemaId: cinema.id,
        auditoriumId: auditorium.id,
        screenType: data.screenType,
        totalSeats,
        availableSeats: totalSeats,
        basePrice: data.basePrice,
        vipPrice: data.vipPrice,
        salesStatus: data.salesStatus ?? 'ACTIVE',
      })
      .returning()

    await ensureSeatsForSession(session.id)

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'CREATE',
      entity: 'session',
      entityId: session.id,
      newValues: session,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

