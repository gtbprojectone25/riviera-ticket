/**
 * API: GET/POST /api/admin/cinemas
 * Listar e criar cinemas
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { cinemas } from '@/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const cinemaSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().min(1, 'Estado obrigatório'),
  country: z.string().default('BR'),
  isIMAX: z.boolean().default(true),
  format: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
})

export async function GET() {
  try {
    await requireAdmin()

    const allCinemas = await db.select().from(cinemas)

    return NextResponse.json(allCinemas)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error fetching cinemas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validation = cinemaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Gerar ID se não fornecido
    const cinemaId = data.id || data.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const [cinema] = await db
      .insert(cinemas)
      .values({
        id: cinemaId,
        name: data.name,
        city: data.city,
        state: data.state,
        country: data.country,
        isIMAX: data.isIMAX,
        format: data.format,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        zipCode: data.zipCode,
      })
      .returning()

    return NextResponse.json(cinema, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error creating cinema:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
