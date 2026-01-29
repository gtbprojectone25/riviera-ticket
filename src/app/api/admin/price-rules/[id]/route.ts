/**
 * API: GET/PUT/DELETE /api/admin/price-rules/[id]
 * Detalhar, atualizar e remover regra de preco
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { priceRules } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  cinemaId: z.string().optional().nullable(),
  auditoriumId: z.string().uuid().optional().nullable(),
  sessionId: z.string().uuid().optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  startMinute: z.number().int().min(0).max(1439).optional().nullable(),
  endMinute: z.number().int().min(0).max(1439).optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
}).refine((data) => {
  if (data.startMinute === undefined && data.endMinute === undefined) return true
  if (data.startMinute === null && data.endMinute === null) return true
  return data.startMinute !== null && data.endMinute !== null
}, {
  message: 'startMinute e endMinute devem ser informados juntos',
})

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
    const [rule] = await db
      .select()
      .from(priceRules)
      .where(eq(priceRules.id, id))
      .limit(1)

    if (!rule) {
      return NextResponse.json({ error: 'Regra nao encontrada' }, { status: 404 })
    }

    return NextResponse.json(rule)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching price rule:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const { id } = await context.params
    const [existing] = await db
      .select()
      .from(priceRules)
      .where(eq(priceRules.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Regra nao encontrada' }, { status: 404 })
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
    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updates.name = data.name
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.isActive !== undefined) updates.isActive = data.isActive
    if (data.cinemaId !== undefined) updates.cinemaId = data.cinemaId || null
    if (data.auditoriumId !== undefined) updates.auditoriumId = data.auditoriumId || null
    if (data.sessionId !== undefined) updates.sessionId = data.sessionId || null
    if (data.daysOfWeek !== undefined) {
      updates.daysOfWeek = data.daysOfWeek && data.daysOfWeek.length > 0 ? data.daysOfWeek : null
    }
    if (data.startMinute !== undefined) updates.startMinute = data.startMinute ?? null
    if (data.endMinute !== undefined) updates.endMinute = data.endMinute ?? null
    if (data.priceCents !== undefined) updates.priceCents = data.priceCents

    const [rule] = await db
      .update(priceRules)
      .set(updates)
      .where(eq(priceRules.id, id))
      .returning()

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'UPDATE',
      entity: 'price_rule',
      entityId: id,
      oldValues: existing,
      newValues: rule,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(rule)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error updating price rule:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const { id } = await context.params
    const [existing] = await db
      .select()
      .from(priceRules)
      .where(eq(priceRules.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Regra nao encontrada' }, { status: 404 })
    }

    await db.delete(priceRules).where(eq(priceRules.id, id))

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'DELETE',
      entity: 'price_rule',
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
    console.error('Error deleting price rule:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
