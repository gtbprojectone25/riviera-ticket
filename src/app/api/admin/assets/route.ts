/**
 * API: GET/POST /api/admin/assets
 * Listar e fazer upload de imagens (assets)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { assets } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { desc } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

export async function GET() {
  try {
    await requireAdmin()

    const rows = await db
      .select()
      .from(assets)
      .orderBy(desc(assets.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error fetching assets:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo invalido' }, { status: 400 })
    }

    const title = formData.get('title')
    const alt = formData.get('alt')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const sanitizedOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = path.extname(sanitizedOriginal) || ''
    const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(uploadDir, fileName)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, buffer)

    const url = `/uploads/${fileName}`

    const [asset] = await db
      .insert(assets)
      .values({
        fileName,
        originalName: file.name,
        url,
        mimeType: file.type || 'application/octet-stream',
        size: buffer.length,
        title: title ? String(title) : null,
        alt: alt ? String(alt) : null,
      })
      .returning()

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('Error uploading asset:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
