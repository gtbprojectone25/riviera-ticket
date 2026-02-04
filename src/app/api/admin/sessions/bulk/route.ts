/**
 * API: POST /api/admin/sessions/bulk
 * Acoes em lote para sessoes
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums, sessions } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { findSessionConflict } from '@/db/queries'
import { inArray, eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

const bulkSchema = z.object({
  action: z.enum(['DUPLICATE', 'PAUSE', 'CLOSE']),
  sessionIds: z.array(z.string().uuid()).min(1),
  daysOffset: z.number().int().min(1).max(365).optional(),
})

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

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

function getClientMeta(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = request.headers.get('user-agent') || null
  return { ipAddress, userAgent }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const body = await request.json()
    const validation = bulkSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { action, sessionIds, daysOffset } = validation.data
    const now = new Date()
    const { ipAddress, userAgent } = getClientMeta(request)

    if (action === 'PAUSE' || action === 'CLOSE') {
      const targetStatus = action === 'PAUSE' ? 'PAUSED' : 'CLOSED'

      const sessionsRows = await db
        .select()
        .from(sessions)
        .where(inArray(sessions.id, sessionIds))

      await db
        .update(sessions)
        .set({ salesStatus: targetStatus, updatedAt: now })
        .where(inArray(sessions.id, sessionIds))

      for (const session of sessionsRows) {
        await writeAuditLog({
          adminId: admin.id,
          action: action === 'PAUSE' ? 'PAUSE_SALES' : 'CLOSE_SALES',
          entity: 'session',
          entityId: session.id,
          oldValues: { salesStatus: session.salesStatus },
          newValues: { salesStatus: targetStatus },
          ipAddress,
          userAgent,
        })
      }

      return NextResponse.json({ success: true, updated: sessionIds.length })
    }

    const offsetDays = daysOffset ?? 7
    const sessionsRows = await db
      .select()
      .from(sessions)
      .where(inArray(sessions.id, sessionIds))

    if (sessionsRows.length !== sessionIds.length) {
      return NextResponse.json(
        { error: 'Uma ou mais sessoes nao foram encontradas' },
        { status: 404 },
      )
    }

    const createdSessions = []

    for (const session of sessionsRows) {
      if (!session.auditoriumId) {
        return NextResponse.json(
          { error: 'Sessao sem sala definida' },
          { status: 400 },
        )
      }

      const newStart = addDays(session.startTime, offsetDays)
      const newEnd = new Date(newStart.getTime() + session.movieDuration * 60 * 1000)

      const conflict = await findSessionConflict({
        auditoriumId: session.auditoriumId,
        startTime: newStart,
        endTime: newEnd,
      })

      if (conflict) {
        return NextResponse.json(
          { error: 'Conflito de horario na mesma sala' },
          { status: 409 },
        )
      }

      const [auditorium] = await db
        .select()
        .from(auditoriums)
        .where(eq(auditoriums.id, session.auditoriumId))
        .limit(1)

      if (!auditorium) {
        return NextResponse.json(
          { error: 'Sala nao encontrada' },
          { status: 404 },
        )
      }

      const layout = auditorium.seatMapConfig ?? auditorium.layout
      const totalSeats = getTotalSeats(layout)

      const [created] = await db
        .insert(sessions)
        .values({
          movieId: session.movieId ?? null,
          movieTitle: session.movieTitle,
          movieDuration: session.movieDuration,
          startTime: newStart,
          endTime: newEnd,
          cinemaName: session.cinemaName,
          cinemaId: session.cinemaId,
          auditoriumId: session.auditoriumId,
          screenType: session.screenType,
          totalSeats,
          availableSeats: totalSeats,
          basePrice: session.basePrice,
          vipPrice: session.vipPrice,
          salesStatus: session.salesStatus ?? 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      await generateSeatsForSession(created.id)

      await writeAuditLog({
        adminId: admin.id,
        action: 'DUPLICATE',
        entity: 'session',
        entityId: created.id,
        oldValues: { sourceSessionId: session.id },
        newValues: created,
        ipAddress,
        userAgent,
      })

      createdSessions.push(created)
    }

    return NextResponse.json({ success: true, created: createdSessions.length })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error bulk session action:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
