/**
 * API: GET/POST/DELETE /api/admin/image-slots
 * Gerencia slots de imagem para o admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { assets, imageSlots } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const slotEnum = z.enum(['HOME_HERO', 'POSTER', 'CINEMA_COVER', 'AUDITORIUM_IMAGE'])

const upsertSchema = z.object({
  slot: slotEnum,
  assetId: z.string().uuid(),
  cinemaId: z.string().optional(),
  auditoriumId: z.string().uuid().optional(),
})

const deleteSchema = z.object({
  slot: slotEnum,
  cinemaId: z.string().optional(),
  auditoriumId: z.string().uuid().optional(),
})

function validateScope(slot: z.infer<typeof slotEnum>, cinemaId?: string, auditoriumId?: string) {
  if (slot === 'CINEMA_COVER' && !cinemaId) {
    return 'cinemaId obrigatorio para CINEMA_COVER'
  }
  if (slot === 'AUDITORIUM_IMAGE' && !auditoriumId) {
    return 'auditoriumId obrigatorio para AUDITORIUM_IMAGE'
  }
  if ((slot === 'HOME_HERO' || slot === 'POSTER') && (cinemaId || auditoriumId)) {
    return 'HOME_HERO e POSTER nao aceitam cinemaId/auditoriumId'
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const slot = searchParams.get('slot') || undefined
    const cinemaId = searchParams.get('cinemaId') || undefined
    const auditoriumId = searchParams.get('auditoriumId') || undefined

    const conditions = []
    if (slot) conditions.push(eq(imageSlots.slot, slot as z.infer<typeof slotEnum>))
    if (cinemaId) conditions.push(eq(imageSlots.cinemaId, cinemaId))
    if (auditoriumId) conditions.push(eq(imageSlots.auditoriumId, auditoriumId))

    const query = db
      .select({
        slot: imageSlots,
        asset: assets,
      })
      .from(imageSlots)
      .leftJoin(assets, eq(imageSlots.assetId, assets.id))

    const rows = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query

    const payload = rows.map((row) => ({
      ...row.slot,
      asset: row.asset || null,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error fetching image slots:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validation = upsertSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { slot, assetId, cinemaId, auditoriumId } = validation.data
    const scopeError = validateScope(slot, cinemaId, auditoriumId)
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 })
    }

    const scopeConditions = [
      eq(imageSlots.slot, slot),
      cinemaId ? eq(imageSlots.cinemaId, cinemaId) : isNull(imageSlots.cinemaId),
      auditoriumId ? eq(imageSlots.auditoriumId, auditoriumId) : isNull(imageSlots.auditoriumId),
    ]

    await db.delete(imageSlots).where(and(...scopeConditions))

    const [saved] = await db
      .insert(imageSlots)
      .values({
        slot,
        assetId,
        cinemaId: cinemaId || null,
        auditoriumId: auditoriumId || null,
        updatedAt: new Date(),
      })
      .returning()

    return NextResponse.json(saved)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error saving image slot:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validation = deleteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { slot, cinemaId, auditoriumId } = validation.data
    const scopeError = validateScope(slot, cinemaId, auditoriumId)
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 })
    }

    const conditions = [
      eq(imageSlots.slot, slot),
      cinemaId ? eq(imageSlots.cinemaId, cinemaId) : isNull(imageSlots.cinemaId),
      auditoriumId ? eq(imageSlots.auditoriumId, auditoriumId) : isNull(imageSlots.auditoriumId),
    ]

    await db.delete(imageSlots).where(and(...conditions))

    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error deleting image slot:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
