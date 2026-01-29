/**
 * API: GET/PUT/DELETE /api/admin/sessions/[id]
 * Detalhar, atualizar e remover sessao
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums, cinemas, sessions, seats, tickets } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { findSessionConflict } from '@/db/queries'
import { count, eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  movieTitle: z.string().min(1).optional(),
  movieDuration: z.number().int().min(1).optional(),
  startTime: z.string().min(1).optional(),
  cinemaId: z.string().min(1).optional(),
  auditoriumId: z.string().uuid().optional(),
  screenType: z.enum(['IMAX_70MM', 'STANDARD']).optional(),
  basePrice: z.number().int().min(0).optional(),
  vipPrice: z.number().int().min(0).optional(),
  salesStatus: z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
})

function getTotalSeats(layout: unknown) {
  if (!layout || typeof layout !== 'object') return 0
  const rowsConfig = (layout as { rowsConfig?: Array<{ seatCount?: number }> }).rowsConfig
  if (!Array.isArray(rowsConfig)) return 0
  return rowsConfig.reduce((sum, row) => sum + (row?.seatCount ?? 0), 0)
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

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const { id } = await context.params
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    if (!session) {
      return NextResponse.json({ error: 'Sessao nao encontrada' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])
    const { id } = await context.params

    const [existing] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Sessao nao encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = validation.data
    const startDate = data.startTime ? parseDate(data.startTime) : existing.startTime
    if (!startDate) {
      return NextResponse.json({ error: 'Data/hora invalida' }, { status: 400 })
    }

    const duration = data.movieDuration ?? existing.movieDuration
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

    const nextAuditoriumId = data.auditoriumId ?? existing.auditoriumId
    if (!nextAuditoriumId) {
      return NextResponse.json({ error: 'Sala obrigatoria' }, { status: 400 })
    }

    if (data.auditoriumId && data.auditoriumId !== existing.auditoriumId) {
      const [seatCount] = await db
        .select({ count: count() })
        .from(seats)
        .where(eq(seats.sessionId, existing.id))

      if ((seatCount?.count || 0) > 0) {
        return NextResponse.json(
          { error: 'Nao e possivel trocar a sala com assentos gerados' },
          { status: 409 },
        )
      }
    }

    const conflict = await findSessionConflict({
      auditoriumId: nextAuditoriumId,
      startTime: startDate,
      endTime: endDate,
      excludeSessionId: existing.id,
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Conflito de horario na mesma sala' },
        { status: 409 },
      )
    }

    let cinemaName = existing.cinemaName
    let cinemaId = existing.cinemaId

    if (data.cinemaId && data.cinemaId !== existing.cinemaId) {
      const [cinema] = await db
        .select()
        .from(cinemas)
        .where(eq(cinemas.id, data.cinemaId))
        .limit(1)

      if (!cinema) {
        return NextResponse.json({ error: 'Cinema nao encontrado' }, { status: 404 })
      }

      cinemaName = cinema.name
      cinemaId = cinema.id
    }

    let totalSeats = existing.totalSeats
    let availableSeats = existing.availableSeats

    if (data.auditoriumId && data.auditoriumId !== existing.auditoriumId) {
      const [auditorium] = await db
        .select()
        .from(auditoriums)
        .where(eq(auditoriums.id, nextAuditoriumId))
        .limit(1)

      if (!auditorium) {
        return NextResponse.json({ error: 'Sala nao encontrada' }, { status: 404 })
      }

      const layout = auditorium.seatMapConfig ?? auditorium.layout
      totalSeats = getTotalSeats(layout)
      availableSeats = totalSeats
    }

    const updates = {
      movieTitle: data.movieTitle ?? existing.movieTitle,
      movieDuration: duration,
      startTime: startDate,
      endTime: endDate,
      cinemaId,
      cinemaName,
      auditoriumId: nextAuditoriumId,
      screenType: data.screenType ?? existing.screenType,
      basePrice: data.basePrice ?? existing.basePrice,
      vipPrice: data.vipPrice ?? existing.vipPrice,
      totalSeats,
      availableSeats,
      salesStatus: data.salesStatus ?? existing.salesStatus ?? 'ACTIVE',
      updatedAt: new Date(),
    }

    const [session] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, existing.id))
      .returning()

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'UPDATE',
      entity: 'session',
      entityId: session.id,
      oldValues: existing,
      newValues: session,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(session)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])
    const { id } = await context.params

    const [existing] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Sessao nao encontrada' }, { status: 404 })
    }

    const [ticketsCount] = await db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.sessionId, id))

    if ((ticketsCount?.count || 0) > 0) {
      return NextResponse.json(
        { error: 'Nao e possivel remover sessao com tickets vendidos' },
        { status: 409 },
      )
    }

    await db.delete(sessions).where(eq(sessions.id, id))

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'DELETE',
      entity: 'session',
      entityId: id,
      oldValues: existing,
      newValues: null,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
