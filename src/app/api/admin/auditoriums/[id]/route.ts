/**
 * API: GET/PUT/DELETE /api/admin/auditoriums/[id]
 * Detalhe, atualizacao e remocao de auditoriums
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const seatRowSchema = z.object({
  row: z.string().min(1),
  seatCount: z.number().int().min(1),
})

const seatMapLegacySchema = z.object({
  rowsConfig: z.array(seatRowSchema).min(1),
  accessible: z.array(z.object({
    row: z.string().min(1),
    seats: z.array(z.number().int().min(1)),
  })).optional(),
  vipZones: z.array(z.object({
    rows: z.array(z.string().min(1)),
    fromPercent: z.number().min(0).max(100),
    toPercent: z.number().min(0).max(100),
  })).optional(),
})

const seatMapDetailedSchema = z.object({
  rows: z.array(z.object({
    label: z.string().min(1),
    seats: z.array(z.object({
      id: z.string().min(1),
      row: z.string().min(1),
      number: z.number().int().min(1),
      type: z.enum(['STANDARD', 'VIP', 'WHEELCHAIR', 'GAP']),
      status: z.enum(['AVAILABLE', 'HELD', 'SOLD']).optional(),
      heldUntil: z.string().nullable().optional(),
      heldByCartId: z.string().nullable().optional(),
    })).min(1),
  })).min(1),
})

const seatMapSchema = z.union([seatMapLegacySchema, seatMapDetailedSchema])

const auditoriumUpdateSchema = z.object({
  cinemaId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.enum(['IMAX', 'NORMAL']).optional(),
  capacity: z.number().int().min(0).optional(),
  imageAssetId: z.string().uuid().nullable().optional(),
  seatMapConfig: seatMapSchema.optional(),
})

function parseSeatMapConfig(value: unknown) {
  if (typeof value === 'string') {
    return JSON.parse(value)
  }
  return value
}

function getSeatCountFromMap(map: unknown) {
  if (!map || typeof map !== 'object') return 0
  const cast = map as { rowsConfig?: Array<{ seatCount?: number }>; rows?: Array<{ seats?: Array<{ type?: string }> }> }
  if (Array.isArray(cast.rowsConfig)) {
    return cast.rowsConfig.reduce((sum, row) => sum + (row.seatCount ?? 0), 0)
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

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const params = await context.params
    const [auditorium] = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.id, params.id))
      .limit(1)

    if (!auditorium) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }

    return NextResponse.json(auditorium)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching auditorium:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const params = await context.params
    const [existing] = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.id, params.id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsedSeatMap = body?.seatMapConfig !== undefined
      ? parseSeatMapConfig(body.seatMapConfig)
      : undefined
    const validation = auditoriumUpdateSchema.safeParse({
      ...body,
      seatMapConfig: parsedSeatMap,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (data.cinemaId !== undefined) updates.cinemaId = data.cinemaId
    if (data.name !== undefined) updates.name = data.name
    if (data.type !== undefined) {
      updates.type = data.type
      updates.format = data.type === 'IMAX' ? 'IMAX' : 'Standard'
    }
    if (data.capacity !== undefined) {
      updates.capacity = data.capacity
      updates.approxCapacity = data.capacity
    }
    if (data.imageAssetId !== undefined) updates.imageAssetId = data.imageAssetId

    if (data.seatMapConfig) {
      const totalSeats = getSeatCountFromMap(data.seatMapConfig)
      updates.seatMapConfig = data.seatMapConfig
      updates.layout = data.seatMapConfig
      updates.totalSeats = totalSeats
    }

    const [auditorium] = await db
      .update(auditoriums)
      .set(updates)
      .where(eq(auditoriums.id, params.id))
      .returning()

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'UPDATE',
      entity: 'auditorium',
      entityId: params.id,
      oldValues: existing,
      newValues: auditorium,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(auditorium)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
    }
    console.error('Error updating auditorium:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const params = await context.params
    const [existing] = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.id, params.id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }

    await db.delete(auditoriums).where(eq(auditoriums.id, params.id))

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'DELETE',
      entity: 'auditorium',
      entityId: params.id,
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
    console.error('Error deleting auditorium:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
