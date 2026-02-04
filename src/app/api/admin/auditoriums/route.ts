/**
 * API: GET/POST /api/admin/auditoriums
 * Listar e criar auditoriums (salas)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
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

const auditoriumSchema = z.object({
  cinemaId: z.string().min(1, 'cinemaId obrigatorio'),
  name: z.string().min(1, 'nome obrigatorio'),
  type: z.enum(['IMAX', 'NORMAL']).default('NORMAL'),
  capacity: z.number().int().min(0),
  imageAssetId: z.string().uuid().nullable().optional(),
  seatMapConfig: seatMapSchema,
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

export async function GET() {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const rows = await db
      .select()
      .from(auditoriums)

    return NextResponse.json(rows)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching auditoriums:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const body = await request.json()
    const parsedSeatMap = parseSeatMapConfig(body?.seatMapConfig)
    const validation = auditoriumSchema.safeParse({
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
    const totalSeats = getSeatCountFromMap(data.seatMapConfig)
    const now = new Date()

    const [auditorium] = await db
      .insert(auditoriums)
      .values({
        cinemaId: data.cinemaId,
        name: data.name,
        type: data.type,
        capacity: data.capacity,
        format: data.type === 'IMAX' ? 'IMAX' : 'Standard',
        layout: data.seatMapConfig,
        seatMapConfig: data.seatMapConfig,
        totalSeats,
        approxCapacity: data.capacity,
        imageAssetId: data.imageAssetId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'CREATE',
      entity: 'auditorium',
      entityId: auditorium.id,
      newValues: auditorium,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(auditorium, { status: 201 })
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
    console.error('Error creating auditorium:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
