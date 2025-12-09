/**
 * API: GET/PUT/DELETE /api/admin/cinemas/[id]
 * Obter, atualizar e deletar cinema específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { cinemas } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().optional(),
  isIMAX: z.boolean().optional(),
  format: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const [cinema] = await db.select().from(cinemas).where(eq(cinemas.id, id)).limit(1)

    if (!cinema) {
      return NextResponse.json({ error: 'Cinema não encontrado' }, { status: 404 })
    }

    return NextResponse.json(cinema)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error fetching cinema:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const [cinema] = await db
      .update(cinemas)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(cinemas.id, id))
      .returning()

    if (!cinema) {
      return NextResponse.json({ error: 'Cinema não encontrado' }, { status: 404 })
    }

    return NextResponse.json(cinema)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error updating cinema:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const [deleted] = await db.delete(cinemas).where(eq(cinemas.id, id)).returning()

    if (!deleted) {
      return NextResponse.json({ error: 'Cinema não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error deleting cinema:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
