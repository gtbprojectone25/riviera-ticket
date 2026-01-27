/**
 * API: PATCH/DELETE /api/admin/assets/[id]
 * Atualiza metadados e remove assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { assets, imageSlots } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { eq } from 'drizzle-orm'
import path from 'node:path'
import { unlink } from 'node:fs/promises'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = validation.data
    const [asset] = await db
      .update(assets)
      .set({
        title: data.title ?? null,
        alt: data.alt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning()

    if (!asset) {
      return NextResponse.json({ error: 'Asset nao encontrado' }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error updating asset:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()

    const { id } = await params

    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1)

    if (!asset) {
      return NextResponse.json({ error: 'Asset nao encontrado' }, { status: 404 })
    }

    await db.transaction(async (tx) => {
      await tx.delete(imageSlots).where(eq(imageSlots.assetId, asset.id))
      await tx.delete(assets).where(eq(assets.id, asset.id))
    })

    if (asset.url && asset.url.startsWith('/uploads/')) {
      const publicPath = path.join(process.cwd(), 'public', asset.url.replace(/^\//, ''))
      try {
        await unlink(publicPath)
      } catch {
        // arquivo pode nao existir em ambiente serverless
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error deleting asset:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
