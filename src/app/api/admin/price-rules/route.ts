/**
 * API: GET/POST /api/admin/price-rules
 * Listar e criar regras de preco
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { priceRules } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const priceRuleSchema = z.object({
  name: z.string().min(1, 'nome obrigatorio'),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  cinemaId: z.string().optional().nullable(),
  auditoriumId: z.string().uuid().optional().nullable(),
  sessionId: z.string().uuid().optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  startMinute: z.number().int().min(0).max(1439).optional().nullable(),
  endMinute: z.number().int().min(0).max(1439).optional().nullable(),
  priceCents: z.number().int().min(0),
}).refine((data) => {
  if (data.startMinute === null && data.endMinute === null) return true
  if (data.startMinute === undefined && data.endMinute === undefined) return true
  return data.startMinute !== null && data.endMinute !== null
}, {
  message: 'startMinute e endMinute devem ser informados juntos',
})

function getClientMeta(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = request.headers.get('user-agent') || null
  return { ipAddress, userAgent }
}

function normalizeRule(input: z.infer<typeof priceRuleSchema>) {
  return {
    ...input,
    cinemaId: input.cinemaId || null,
    auditoriumId: input.auditoriumId || null,
    sessionId: input.sessionId || null,
    daysOfWeek: input.daysOfWeek && input.daysOfWeek.length > 0 ? input.daysOfWeek : null,
    startMinute: input.startMinute ?? null,
    endMinute: input.endMinute ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const cinemaId = searchParams.get('cinemaId')
    const auditoriumId = searchParams.get('auditoriumId')
    const sessionId = searchParams.get('sessionId')
    const isActive = searchParams.get('isActive')

    const rows = await db
      .select()
      .from(priceRules)
      .where(and(
        cinemaId ? eq(priceRules.cinemaId, cinemaId) : undefined,
        auditoriumId ? eq(priceRules.auditoriumId, auditoriumId) : undefined,
        sessionId ? eq(priceRules.sessionId, sessionId) : undefined,
        isActive ? eq(priceRules.isActive, isActive === 'true') : undefined,
      ))
      .orderBy(desc(priceRules.priority), desc(priceRules.updatedAt))

    return NextResponse.json(rows)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching price rules:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const body = await request.json()
    const validation = priceRuleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = normalizeRule(validation.data)
    const now = new Date()

    const [rule] = await db
      .insert(priceRules)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'CREATE',
      entity: 'price_rule',
      entityId: rule.id,
      newValues: rule,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error creating price rule:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
